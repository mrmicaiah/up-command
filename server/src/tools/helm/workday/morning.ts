/**
 * good_morning - Start the work day
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerGoodMorning(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'good_morning',
    'Start your work day with a briefing',
    {
      notes: z.string().optional().describe('Context about today'),
    },
    async ({ notes }) => {
      const userId = ctx.getCurrentUser();
      const today = new Date().toISOString().split('T')[0];

      // Start a work session
      const sessionId = `session-${crypto.randomUUID().slice(0, 8)}`;
      await ctx.env.DB.prepare(`
        INSERT INTO work_sessions (id, user_id, focus, notes)
        VALUES (?, ?, ?, ?)
      `).bind(sessionId, userId, 'morning', notes || null).run();

      // Get active tasks
      const active = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE user_id = ? AND is_active = 1 AND status = 'open' ORDER BY priority`
      ).bind(userId).all();

      // Get overdue tasks
      const overdue = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE user_id = ? AND due_date < ? AND status = 'open'`
      ).bind(userId, today).all();

      // Get active sprint
      const sprint = await ctx.env.DB.prepare(
        `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' LIMIT 1`
      ).bind(userId).first() as any;

      let output = `☀️ **Good Morning!**\n\n`;

      if ((overdue.results || []).length > 0) {
        output += `⚠️ **Overdue** (${overdue.results?.length})\n`;
        (overdue.results || []).slice(0, 5).forEach((t: any) => {
          output += `- ${t.text} (due ${t.due_date})\n`;
        });
        output += '\n';
      }

      if ((active.results || []).length > 0) {
        output += `🎯 **Active Tasks** (${active.results?.length})\n`;
        (active.results || []).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
        output += '\n';
      }

      if (sprint) {
        const daysLeft = Math.ceil(
          (new Date(sprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        output += `🏃 **Sprint:** ${sprint.name} (${daysLeft} days left)\n`;
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
