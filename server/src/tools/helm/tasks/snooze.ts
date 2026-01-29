/**
 * snooze_task - Delay a task until later
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerSnoozeTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'snooze_task',
    'Snooze a task until a later date',
    {
      task_id: z.string().describe('Task ID'),
      days: z.number().optional().describe('Snooze for N days'),
      until: z.string().optional().describe('Snooze until date (YYYY-MM-DD)'),
    },
    async ({ task_id, days, until }) => {
      let snoozeDate: string;

      if (until) {
        snoozeDate = until;
      } else if (days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        snoozeDate = date.toISOString().split('T')[0];
      } else {
        return { content: [{ type: 'text', text: '⚠️ Specify days or until date' }] };
      }

      await ctx.env.DB.prepare(`
        UPDATE tasks SET snoozed_until = ?, is_active = 0
        WHERE id = ? OR id LIKE ?
      `).bind(snoozeDate, task_id, `%${task_id}%`).run();

      return {
        content: [{ type: 'text', text: `😴 Task snoozed until ${snoozeDate}` }]
      };
    }
  );
}
