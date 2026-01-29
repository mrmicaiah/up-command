/**
 * Task activation tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerTaskActivation(server: McpServer, ctx: ToolContext): void {
  // activate_task
  server.tool(
    'activate_task',
    'Add a task to your Active list',
    {
      task_id: z.string().optional().describe('Task ID'),
      search: z.string().optional().describe('Search by text'),
    },
    async ({ task_id, search }) => {
      const userId = ctx.getCurrentUser();
      let task: any;

      if (task_id) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
        ).bind(task_id, `%${task_id}%`, userId).first();
      } else if (search) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE user_id = ? AND text LIKE ? AND status = 'open' LIMIT 1`
        ).bind(userId, `%${search}%`).first();
      }

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      await ctx.env.DB.prepare(
        `UPDATE tasks SET is_active = 1 WHERE id = ?`
      ).bind(task.id).run();

      return {
        content: [{ type: 'text', text: `🎯 Activated: "${task.text}"` }]
      };
    }
  );

  // deactivate_task
  server.tool(
    'deactivate_task',
    'Remove a task from your Active list',
    {
      task_id: z.string().optional().describe('Task ID'),
      search: z.string().optional().describe('Search by text'),
    },
    async ({ task_id, search }) => {
      const userId = ctx.getCurrentUser();
      let task: any;

      if (task_id) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
        ).bind(task_id, `%${task_id}%`, userId).first();
      } else if (search) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE user_id = ? AND text LIKE ? LIMIT 1`
        ).bind(userId, `%${search}%`).first();
      }

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      await ctx.env.DB.prepare(
        `UPDATE tasks SET is_active = 0 WHERE id = ?`
      ).bind(task.id).run();

      return {
        content: [{ type: 'text', text: `📥 Deactivated: "${task.text}"` }]
      };
    }
  );
}
