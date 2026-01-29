/**
 * Weekly reporting tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerWeeklyReporting(server: McpServer, ctx: ToolContext): void {
  // weekly_recap
  server.tool(
    'weekly_recap',
    'Get a weekly summary',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString();

      const completed = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
        AND completed_at >= ? ORDER BY completed_at DESC
      `).bind(userId, weekStr).all();

      const checkins = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE user_id = ? AND created_at >= ?
      `).bind(userId, weekStr).all();

      const sessions = await ctx.env.DB.prepare(`
        SELECT * FROM work_sessions WHERE user_id = ? AND started_at >= ?
      `).bind(userId, weekStr).all();

      let output = `📊 **Weekly Recap**\n\n`;
      output += `**This week:**\n`;
      output += `- Tasks completed: ${completed.results?.length || 0}\n`;
      output += `- Check-ins: ${checkins.results?.length || 0}\n`;
      output += `- Work sessions: ${sessions.results?.length || 0}\n\n`;

      // Group by day
      const byDay: Record<string, any[]> = {};
      (completed.results || []).forEach((t: any) => {
        const day = t.completed_at?.split('T')[0] || 'unknown';
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(t);
      });

      output += `**By day:**\n`;
      Object.entries(byDay).sort().reverse().forEach(([day, tasks]) => {
        output += `${day}: ${tasks.length} tasks\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // plan_week
  server.tool(
    'plan_week',
    'Get data to plan your week',
    {
      constraints: z.string().optional().describe('Schedule constraints'),
      focus_level: z.enum(['high', 'normal', 'low']).default('normal'),
    },
    async ({ constraints, focus_level }) => {
      const userId = ctx.getCurrentUser();

      // Get open tasks by priority
      const tasks = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'open'
        ORDER BY priority ASC, due_date ASC NULLS LAST
      `).bind(userId).all();

      // Get active sprint
      const sprint = await ctx.env.DB.prepare(
        `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' LIMIT 1`
      ).bind(userId).first() as any;

      // Get overdue
      const today = new Date().toISOString().split('T')[0];
      const overdue = (tasks.results || []).filter((t: any) => 
        t.due_date && t.due_date < today
      );

      let output = `📅 **Week Planning**\n\n`;

      if (sprint) {
        const daysLeft = Math.ceil(
          (new Date(sprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        output += `🏃 **Sprint:** ${sprint.name} (${daysLeft} days left)\n\n`;
      }

      if (overdue.length > 0) {
        output += `⚠️ **Overdue** (${overdue.length}):\n`;
        overdue.forEach((t: any) => {
          output += `- ${t.text} (due ${t.due_date})\n`;
        });
        output += '\n';
      }

      output += `**Task breakdown:**\n`;
      output += `- Total open: ${tasks.results?.length || 0}\n`;
      output += `- P1 (urgent): ${(tasks.results || []).filter((t: any) => t.priority === 1).length}\n`;
      output += `- P2 (high): ${(tasks.results || []).filter((t: any) => t.priority === 2).length}\n`;
      output += `- With due dates: ${(tasks.results || []).filter((t: any) => t.due_date).length}\n\n`;

      if (constraints) {
        output += `📌 **Constraints:** ${constraints}\n`;
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
