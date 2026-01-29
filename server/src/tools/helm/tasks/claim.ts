/**
 * claim_task - Claim a teammate's task
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerClaimTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'claim_task',
    'Claim a task (yours or teammate\'s)',
    {
      task_id: z.string().optional().describe('Task ID'),
      search: z.string().optional().describe('Search by text'),
      activate: z.boolean().optional().describe('Also add to Active list'),
      category: z.string().optional().describe('Move to this category'),
    },
    async ({ task_id, search, activate, category }) => {
      const userId = ctx.getCurrentUser();
      let task: any;

      if (task_id) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE id = ? OR id LIKE ?`
        ).bind(task_id, `%${task_id}%`).first();
      } else if (search) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE text LIKE ? AND status = 'open' LIMIT 1`
        ).bind(`%${search}%`).first();
      }

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      const updates: string[] = [`user_id = '${userId}'`];
      if (activate) updates.push('is_active = 1');
      if (category) updates.push(`category = '${category}'`);

      await ctx.env.DB.prepare(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
      ).bind(task.id).run();

      return {
        content: [{
          type: 'text',
          text: `✅ Claimed: "${task.text}"${activate ? ' | 🎯 Active' : ''}`
        }]
      };
    }
  );
}
