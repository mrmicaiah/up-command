/**
 * list_tasks - View tasks with filtering
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerListTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'list_tasks',
    'List your tasks with optional filters',
    {
      status: z.enum(['open', 'done', 'all']).default('open').describe('Filter by status'),
      category: z.string().optional().describe('Filter by category'),
      project: z.string().optional().describe('Filter by project'),
      include_teammate: z.boolean().default(false).describe('Include teammate tasks'),
    },
    async ({ status, category, project, include_teammate }) => {
      const userId = ctx.getCurrentUser();
      let sql = `SELECT * FROM tasks WHERE user_id = ?`;
      const params: string[] = [userId];

      if (status !== 'all') {
        sql += ` AND status = ?`;
        params.push(status);
      }
      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }
      if (project) {
        sql += ` AND project = ?`;
        params.push(project);
      }

      sql += ` ORDER BY priority ASC, created_at DESC`;

      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const tasks = result.results || [];

      const active = tasks.filter((t: any) => t.is_active);
      const backlog = tasks.filter((t: any) => !t.is_active);

      let output = `📋 **Tasks** (${tasks.length} total)\n\n`;

      if (active.length > 0) {
        output += `🎯 **Active** (${active.length})\n`;
        active.forEach((t: any) => {
          const pri = '!'.repeat(6 - t.priority);
          output += `- [${t.id.slice(-6)}] ${pri} ${t.text}\n`;
        });
        output += '\n';
      }

      if (backlog.length > 0) {
        output += `📥 **Backlog** (${backlog.length})\n`;
        backlog.slice(0, 20).forEach((t: any) => {
          output += `- [${t.id.slice(-6)}] ${t.text}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
