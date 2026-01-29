/**
 * work_history - View past work activity
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerWorkHistory(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'work_history',
    'View your work history',
    {
      days: z.number().default(7).describe('Days to look back'),
    },
    async ({ days }) => {
      const userId = ctx.getCurrentUser();
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString();

      // Get completed tasks
      const completed = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
        AND completed_at >= ? ORDER BY completed_at DESC
      `).bind(userId, sinceStr).all();

      // Get check-ins
      const checkins = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE user_id = ? AND created_at >= ?
        ORDER BY created_at DESC
      `).bind(userId, sinceStr).all();

      // Get work sessions
      const sessions = await ctx.env.DB.prepare(`
        SELECT * FROM work_sessions WHERE user_id = ? AND started_at >= ?
        ORDER BY started_at DESC
      `).bind(userId, sinceStr).all();

      let output = `📊 **Work History** (${days} days)\n\n`;
      output += `✅ Tasks completed: ${completed.results?.length || 0}\n`;
      output += `📝 Check-ins: ${checkins.results?.length || 0}\n`;
      output += `⏱️ Work sessions: ${sessions.results?.length || 0}\n\n`;

      if ((completed.results || []).length > 0) {
        output += `**Recent completions:**\n`;
        (completed.results || []).slice(0, 10).forEach((t: any) => {
          const date = t.completed_at?.split('T')[0] || '';
          output += `- [${date}] ${t.text}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
