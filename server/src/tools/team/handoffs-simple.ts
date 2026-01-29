/**
 * Simple handoff tools - quick task transfers between teammates
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerSimpleHandoffs(server: McpServer, ctx: ToolContext): void {
  // suggest_handoff
  server.tool(
    'suggest_handoff',
    'Suggest handing off a task to a teammate',
    {
      task_id: z.string().describe('Task ID to hand off'),
      to_teammate: z.string().optional().describe('Teammate to suggest to'),
      reason: z.string().optional().describe('Why suggesting handoff'),
    },
    async ({ task_id, to_teammate, reason }) => {
      const userId = ctx.getCurrentUser();
      const recipient = to_teammate || ctx.getTeammate();

      if (!recipient) {
        return { content: [{ type: 'text', text: '❌ No teammate specified' }] };
      }

      // Find task
      const task = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
      ).bind(task_id, `%${task_id}%`, userId).first() as any;

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      // Create handoff suggestion (as a message)
      const msgId = `msg-${crypto.randomUUID().slice(0, 8)}`;
      const content = `🤝 **Handoff Request**\nTask: "${task.text}"\nID: ${task.id}\n${reason ? `Reason: ${reason}` : ''}`;

      await ctx.env.DB.prepare(`
        INSERT INTO messages (id, from_user, to_user, content)
        VALUES (?, ?, ?, ?)
      `).bind(msgId, userId, recipient, content).run();

      return {
        content: [{ type: 'text', text: `🤝 Handoff suggested to ${recipient}: "${task.text}"` }]
      };
    }
  );

  // check_handoffs
  server.tool(
    'check_handoffs',
    'Check for pending handoff requests',
    {},
    async () => {
      const userId = ctx.getCurrentUser();

      // Look for handoff messages
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM messages 
        WHERE to_user = ? AND content LIKE '%Handoff Request%' AND read_at IS NULL
        ORDER BY created_at DESC
      `).bind(userId).all();

      const handoffs = result.results || [];

      if (handoffs.length === 0) {
        return { content: [{ type: 'text', text: '📭 No pending handoff requests' }] };
      }

      let output = `🤝 **Pending Handoffs** (${handoffs.length})\n\n`;
      handoffs.forEach((h: any) => {
        output += `From **${h.from_user}**:\n${h.content}\n\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // accept_handoff
  server.tool(
    'accept_handoff',
    'Accept a handoff and claim the task',
    {
      task_id: z.string().describe('Task ID to accept'),
    },
    async ({ task_id }) => {
      const userId = ctx.getCurrentUser();

      // Find and claim the task
      const task = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE id = ? OR id LIKE ?`
      ).bind(task_id, `%${task_id}%`).first() as any;

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      const previousOwner = task.user_id;

      // Transfer ownership
      await ctx.env.DB.prepare(
        `UPDATE tasks SET user_id = ? WHERE id = ?`
      ).bind(userId, task.id).run();

      // Notify previous owner
      const msgId = `msg-${crypto.randomUUID().slice(0, 8)}`;
      await ctx.env.DB.prepare(`
        INSERT INTO messages (id, from_user, to_user, content)
        VALUES (?, ?, ?, ?)
      `).bind(msgId, userId, previousOwner, `✅ Accepted handoff: "${task.text}"`).run();

      return {
        content: [{ type: 'text', text: `✅ Accepted: "${task.text}" (from ${previousOwner})` }]
      };
    }
  );
}
