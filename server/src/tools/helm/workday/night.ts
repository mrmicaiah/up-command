/**
 * good_night - End the work day
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerGoodNight(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'good_night',
    'End your work day',
    {
      notes: z.string().optional().describe('Where you left off'),
    },
    async ({ notes }) => {
      const userId = ctx.getCurrentUser();
      const today = new Date().toISOString().split('T')[0];

      // Close any open work session
      await ctx.env.DB.prepare(`
        UPDATE work_sessions SET ended_at = datetime('now'), notes = COALESCE(notes || ' | ', '') || ?
        WHERE user_id = ? AND ended_at IS NULL
      `).bind(notes || 'Day ended', userId).run();

      // Get today's completed tasks
      const completed = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
        AND date(completed_at) = ?
      `).bind(userId, today).all();

      // Get check-ins from today
      const checkins = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE user_id = ? AND date(created_at) = ?
      `).bind(userId, today).all();

      let output = `🌙 **Good Night!**\n\n`;

      if ((completed.results || []).length > 0) {
        output += `✅ **Completed Today** (${completed.results?.length})\n`;
        (completed.results || []).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
        output += '\n';
      } else {
        output += `No tasks completed today.\n\n`;
      }

      if ((checkins.results || []).length > 0) {
        output += `📝 **Check-ins:** ${checkins.results?.length}\n`;
      }

      if (notes) {
        output += `\n📌 **Notes:** ${notes}`;
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
