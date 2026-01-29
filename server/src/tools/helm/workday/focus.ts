/**
 * set_focus - Set current focus area
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerSetFocus(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'set_focus',
    'Set your current focus area',
    {
      focus: z.string().describe('What to focus on - category, project, or description'),
    },
    async ({ focus }) => {
      const userId = ctx.getCurrentUser();

      // Update or create a work session with focus
      const existing = await ctx.env.DB.prepare(
        `SELECT * FROM work_sessions WHERE user_id = ? AND ended_at IS NULL LIMIT 1`
      ).bind(userId).first();

      if (existing) {
        await ctx.env.DB.prepare(
          `UPDATE work_sessions SET focus = ? WHERE id = ?`
        ).bind(focus, (existing as any).id).run();
      } else {
        const id = `session-${crypto.randomUUID().slice(0, 8)}`;
        await ctx.env.DB.prepare(`
          INSERT INTO work_sessions (id, user_id, focus)
          VALUES (?, ?, ?)
        `).bind(id, userId, focus).run();
      }

      // Get matching tasks
      const tasks = await ctx.env.DB.prepare(`
        SELECT * FROM tasks WHERE user_id = ? AND status = 'open'
        AND (category LIKE ? OR project LIKE ? OR text LIKE ?)
        ORDER BY priority LIMIT 5
      `).bind(userId, `%${focus}%`, `%${focus}%`, `%${focus}%`).all();

      let output = `🎯 **Focus set:** ${focus}\n\n`;

      if ((tasks.results || []).length > 0) {
        output += `**Related tasks:**\n`;
        (tasks.results || []).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
