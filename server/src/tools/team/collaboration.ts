/**
 * Team collaboration tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerCollaboration(server: McpServer, ctx: ToolContext): void {
  // who_am_i
  server.tool(
    'who_am_i',
    'Get current user info',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const teammates = ctx.getTeammates();

      let output = `👤 **User:** ${userId}\n`;
      output += `👥 **Team:** ${teammates.join(', ') || 'None'}\n`;

      // Get stats
      const tasks = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open'`
      ).bind(userId).first() as any;

      const completed = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done'`
      ).bind(userId).first() as any;

      output += `\n📊 **Stats:**\n`;
      output += `- Open tasks: ${tasks?.count || 0}\n`;
      output += `- Completed: ${completed?.count || 0}\n`;

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // team_summary
  server.tool(
    'team_summary',
    'Get team overview',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const teammates = ctx.getTeammates();

      let output = `👥 **Team Summary**\n\n`;

      // Current user stats
      const myTasks = await ctx.env.DB.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open'`
      ).bind(userId).first() as any;

      output += `**${userId}** (you): ${myTasks?.count || 0} open tasks\n`;

      // Teammate stats
      for (const mate of teammates) {
        const tasks = await ctx.env.DB.prepare(
          `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open'`
        ).bind(mate).first() as any;
        output += `**${mate}**: ${tasks?.count || 0} open tasks\n`;
      }

      // Pending handoffs
      const handoffs = await ctx.env.DB.prepare(`
        SELECT COUNT(*) as count FROM handoff_tasks 
        WHERE status = 'pending'
      `).first() as any;

      output += `\n📋 **Handoff Queue:** ${handoffs?.count || 0} pending\n`;

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // view_teammate_tasks
  server.tool(
    'view_teammate_tasks',
    'View a teammate\'s tasks',
    {
      teammate: z.string().optional().describe('Teammate username'),
      category: z.string().optional().describe('Filter by category'),
    },
    async ({ teammate, category }) => {
      const teammates = ctx.getTeammates();
      const target = teammate || teammates[0];

      if (!target) {
        return { content: [{ type: 'text', text: '❌ No teammate specified' }] };
      }

      let sql = `SELECT * FROM tasks WHERE user_id = ? AND status = 'open'`;
      const params: string[] = [target];

      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }
      sql += ` ORDER BY priority ASC LIMIT 20`;

      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const tasks = result.results || [];

      if (tasks.length === 0) {
        return { content: [{ type: 'text', text: `📭 ${target} has no open tasks` }] };
      }

      let output = `📋 **${target}'s Tasks** (${tasks.length})\n\n`;
      tasks.forEach((t: any) => {
        const pri = '!'.repeat(6 - t.priority);
        output += `- [${t.id.slice(-6)}] ${pri} ${t.text}\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
