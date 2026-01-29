/**
 * delete_task - Remove a task permanently
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerDeleteTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'delete_task',
    'Delete a task permanently',
    {
      task_id: z.string().describe('Task ID to delete'),
    },
    async ({ task_id }) => {
      const userId = ctx.getCurrentUser();

      // Get task first
      const task = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
      ).bind(task_id, `%${task_id}%`, userId).first();

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      // Remove from sprints first
      await ctx.env.DB.prepare(
        `DELETE FROM sprint_tasks WHERE task_id = ?`
      ).bind((task as any).id).run();

      // Delete the task
      await ctx.env.DB.prepare(
        `DELETE FROM tasks WHERE id = ?`
      ).bind((task as any).id).run();

      return {
        content: [{ type: 'text', text: `🗑️ Deleted: "${(task as any).text}"` }]
      };
    }
  );
}
