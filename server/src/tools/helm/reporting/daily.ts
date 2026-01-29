/**
 * Daily reporting tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerDailyReporting(server: McpServer, ctx: ToolContext): void {
  // get_daily_summary
  server.tool(
    'get_daily_summary',
    'Get a summary of today\'s activity',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const today = new Date().toISOString().split('T')[0];

      // Today's completed
      const completed = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
        AND date(completed_at) = ?
      `).bind(userId, today).all();

      // Active tasks
      const active = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE user_id = ? AND is_active = 1 AND status = 'open'`
      ).bind(userId).all();

      // Today's check-ins
      const checkins = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE user_id = ? AND date(created_at) = ?
      `).bind(userId, today).all();

      let output = `📅 **Daily Summary** (${today})\n\n`;
      output += `✅ Completed: ${completed.results?.length || 0}\n`;
      output += `🎯 Active: ${active.results?.length || 0}\n`;
      output += `📝 Check-ins: ${checkins.results?.length || 0}\n\n`;

      if ((completed.results || []).length > 0) {
        output += `**Done today:**\n`;
        (completed.results || []).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
        output += '\n';
      }

      if ((active.results || []).length > 0) {
        output += `**Still active:**\n`;
        (active.results || []).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // end_of_day_recap
  server.tool(
    'end_of_day_recap',
    'Generate end of day recap',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const today = new Date().toISOString().split('T')[0];

      // Get all today's activity
      const completed = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
        AND date(completed_at) = ?
      `).bind(userId, today).all();

      const checkins = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE user_id = ? AND date(created_at) = ?
        ORDER BY created_at
      `).bind(userId, today).all();

      const sessions = await ctx.env.DB.prepare(`
        SELECT * FROM work_sessions WHERE user_id = ? AND date(started_at) = ?
      `).bind(userId, today).all();

      let output = `🌆 **End of Day Recap** (${today})\n\n`;

      // Productivity score (simple)
      const score = Math.min(100, ((completed.results?.length || 0) * 15) + 
                                  ((checkins.results?.length || 0) * 5));
      output += `**Productivity Score:** ${score}/100\n\n`;

      output += `**Metrics:**\n`;
      output += `- Tasks completed: ${completed.results?.length || 0}\n`;
      output += `- Check-ins logged: ${checkins.results?.length || 0}\n`;
      output += `- Work sessions: ${sessions.results?.length || 0}\n\n`;

      if ((completed.results || []).length > 0) {
        output += `**Accomplishments:**\n`;
        (completed.results || []).forEach((t: any) => {
          output += `✅ ${t.text}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
