/**
 * Stats and analytics tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerStatsReporting(server: McpServer, ctx: ToolContext): void {
  // get_stats
  server.tool(
    'get_stats',
    'Get your productivity statistics',
    {},
    async () => {
      const userId = ctx.getCurrentUser();

      const total = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ?`
      ).bind(userId).first() as any;

      const completed = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done'`
      ).bind(userId).first() as any;

      const open = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open'`
      ).bind(userId).first() as any;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeek = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at >= ?`
      ).bind(userId, weekAgo.toISOString()).first() as any;

      let output = `📈 **Your Stats**\n\n`;
      output += `**Tasks:**\n`;
      output += `- Total: ${total?.count || 0}\n`;
      output += `- Completed: ${completed?.count || 0}\n`;
      output += `- Open: ${open?.count || 0}\n`;
      output += `- This week: ${thisWeek?.count || 0}\n\n`;

      const rate = total?.count > 0 
        ? Math.round((completed?.count / total?.count) * 100) 
        : 0;
      output += `**Completion rate:** ${rate}%\n`;

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // get_challenges
  server.tool(
    'get_challenges',
    'Identify productivity challenges',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const today = new Date().toISOString().split('T')[0];

      const overdue = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'open'
        AND due_date < ? ORDER BY due_date LIMIT 10
      `).bind(userId, today).all();

      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const stale = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'open'
        AND created_at < ? ORDER BY created_at LIMIT 10
      `).bind(userId, monthAgo.toISOString()).all();

      let output = `⚠️ **Challenges**\n\n`;

      if ((overdue.results || []).length > 0) {
        output += `**Overdue** (${overdue.results?.length}):\n`;
        (overdue.results || []).forEach((t: any) => {
          output += `- ${t.text} (due ${t.due_date})\n`;
        });
        output += '\n';
      }

      if ((stale.results || []).length > 0) {
        output += `**Stale (30+ days)** (${stale.results?.length}):\n`;
        (stale.results || []).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
      }

      if ((overdue.results || []).length === 0 && (stale.results || []).length === 0) {
        output += `✨ No major challenges identified!`;
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // analyze_patterns
  server.tool(
    'analyze_patterns',
    'Analyze your productivity patterns',
    {},
    async () => {
      const userId = ctx.getCurrentUser();

      // Completions by day of week
      const byDay = await ctx.env.DB.prepare(`
        SELECT strftime('%w', completed_at) as dow, COUNT(*) as count
        FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at IS NOT NULL
        GROUP BY dow ORDER BY dow
      `).bind(userId).all();

      // Categories
      const byCat = await ctx.env.DB.prepare(`
        SELECT category, COUNT(*) as count
        FROM tasks WHERE user_id = ? AND status = 'done' AND category IS NOT NULL
        GROUP BY category ORDER BY count DESC LIMIT 5
      `).bind(userId).all();

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let output = `🔍 **Pattern Analysis**\n\n`;

      output += `**Completions by day:**\n`;
      (byDay.results || []).forEach((d: any) => {
        output += `- ${days[parseInt(d.dow)]}: ${d.count}\n`;
      });
      output += '\n';

      if ((byCat.results || []).length > 0) {
        output += `**Top categories:**\n`;
        (byCat.results || []).forEach((c: any) => {
          output += `- ${c.category}: ${c.count}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
