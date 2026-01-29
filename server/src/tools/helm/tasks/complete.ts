/**
 * complete_task - Mark a task as done
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerCompleteTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'complete_task',
    'Mark a task as complete',
    {
      task_id: z.string().optional().describe('Task ID'),
      search: z.string().optional().describe('Search by text'),
      position: z.number().optional().describe('Task position from list'),
      include_teammate: z.boolean().default(false).describe('Search teammate tasks too'),
    },
    async ({ task_id, search, position, include_teammate }) => {
      const userId = ctx.getCurrentUser();
      let task: any;

      if (task_id) {
        const result = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE id = ? OR id LIKE ?`
        ).bind(task_id, `%${task_id}%`).first();
        task = result;
      } else if (search) {
        const result = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE user_id = ? AND text LIKE ? AND status = 'open' LIMIT 1`
        ).bind(userId, `%${search}%`).first();
        task = result;
      }

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      // Handle recurring tasks
      if (task.recurrence) {
        await ctx.env.DB.prepare(`
          UPDATE tasks SET completed_at = datetime('now')
          WHERE id = ?
        `).bind(task.id).run();
        // Keep open for next occurrence
        return {
          content: [{
            type: 'text',
            text: `🔄 Recurring task logged: "${task.text}"\nWill recur: ${task.recurrence}`
          }]
        };
      }

      await ctx.env.DB.prepare(`
        UPDATE tasks SET status = 'done', completed_at = datetime('now'), is_active = 0
        WHERE id = ?
      `).bind(task.id).run();

      return {
        content: [{ type: 'text', text: `✅ Completed: "${task.text}"` }]
      };
    }
  );
}
