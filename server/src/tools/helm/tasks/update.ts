/**
 * update_task - Modify task properties
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerUpdateTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'update_task',
    'Update a task\'s properties',
    {
      task_id: z.string().describe('Task ID'),
      priority: z.number().min(1).max(5).optional().describe('New priority'),
      category: z.string().optional().describe('New category'),
      due_date: z.string().optional().describe('New due date'),
      notes: z.string().optional().describe('New notes'),
      recurrence: z.string().optional().describe('New recurrence pattern'),
    },
    async ({ task_id, priority, category, due_date, notes, recurrence }) => {
      const updates: string[] = [];
      const params: any[] = [];

      if (priority !== undefined) {
        updates.push('priority = ?');
        params.push(priority);
      }
      if (category !== undefined) {
        updates.push('category = ?');
        params.push(category || null);
      }
      if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(due_date || null);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes || null);
      }
      if (recurrence !== undefined) {
        updates.push('recurrence = ?');
        params.push(recurrence || null);
      }

      if (updates.length === 0) {
        return { content: [{ type: 'text', text: '⚠️ No updates provided' }] };
      }

      params.push(task_id);
      await ctx.env.DB.prepare(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? OR id LIKE ?`
      ).bind(...params, `%${task_id}%`).run();

      return {
        content: [{ type: 'text', text: `✅ Task updated: ${updates.length} field(s) changed` }]
      };
    }
  );
}
