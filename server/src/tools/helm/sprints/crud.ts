/**
 * Sprint CRUD operations
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerSprintCrud(server: McpServer, ctx: ToolContext): void {
  // create_sprint
  server.tool(
    'create_sprint',
    'Create a new sprint',
    {
      name: z.string().describe('Sprint name'),
      end_date: z.string().describe('End date (YYYY-MM-DD)'),
    },
    async ({ name, end_date }) => {
      const userId = ctx.getCurrentUser();
      const id = `sprint-${crypto.randomUUID().slice(0, 8)}`;

      await ctx.env.DB.prepare(`
        INSERT INTO sprints (id, user_id, name, end_date)
        VALUES (?, ?, ?, ?)
      `).bind(id, userId, name, end_date).run();

      return {
        content: [{ type: 'text', text: `🏃 Sprint created: "${name}"\nEnds: ${end_date}\nID: ${id}` }]
      };
    }
  );

  // list_sprints
  server.tool(
    'list_sprints',
    'List your sprints',
    {
      status: z.enum(['active', 'completed', 'abandoned', 'all']).default('all'),
    },
    async ({ status }) => {
      const userId = ctx.getCurrentUser();
      let sql = `SELECT * FROM sprints WHERE user_id = ?`;
      const params: string[] = [userId];

      if (status !== 'all') {
        sql += ` AND status = ?`;
        params.push(status);
      }
      sql += ` ORDER BY created_at DESC`;

      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const sprints = result.results || [];

      if (sprints.length === 0) {
        return { content: [{ type: 'text', text: '📭 No sprints found' }] };
      }

      let output = `🏃 **Sprints** (${sprints.length})\n\n`;
      sprints.forEach((s: any) => {
        const icon = s.status === 'active' ? '🟢' : s.status === 'completed' ? '✅' : '⏸️';
        output += `${icon} **${s.name}** [${s.id.slice(-6)}]\n`;
        output += `   Ends: ${s.end_date} | Status: ${s.status}\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // view_sprint
  server.tool(
    'view_sprint',
    'View sprint details with tasks',
    {
      sprint_id: z.string().optional().describe('Sprint ID (defaults to active)'),
    },
    async ({ sprint_id }) => {
      const userId = ctx.getCurrentUser();
      let sprint: any;

      if (sprint_id) {
        sprint = await ctx.env.DB.prepare(
          `SELECT * FROM sprints WHERE (id = ? OR id LIKE ?) AND user_id = ?`
        ).bind(sprint_id, `%${sprint_id}%`, userId).first();
      } else {
        sprint = await ctx.env.DB.prepare(
          `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
        ).bind(userId).first();
      }

      if (!sprint) {
        return { content: [{ type: 'text', text: '❌ Sprint not found' }] };
      }

      // Get objectives
      const objectives = await ctx.env.DB.prepare(
        `SELECT * FROM sprint_objectives WHERE sprint_id = ?`
      ).bind(sprint.id).all();

      // Get tasks
      const tasks = await ctx.env.DB.prepare(`
        SELECT t.*, st.objective_id FROM tasks t
        JOIN sprint_tasks st ON t.id = st.task_id
        WHERE st.sprint_id = ?
      `).bind(sprint.id).all();

      let output = `🏃 **${sprint.name}**\n`;
      output += `Ends: ${sprint.end_date} | Status: ${sprint.status}\n\n`;

      if ((objectives.results || []).length > 0) {
        output += `**Objectives:**\n`;
        (objectives.results || []).forEach((o: any) => {
          output += `• ${o.statement}\n`;
        });
        output += '\n';
      }

      if ((tasks.results || []).length > 0) {
        output += `**Tasks:** (${tasks.results?.length})\n`;
        (tasks.results || []).forEach((t: any) => {
          const status = t.status === 'done' ? '✅' : '⬜';
          output += `${status} ${t.text}\n`;
        });
      }

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // update_sprint
  server.tool(
    'update_sprint',
    'Update sprint properties',
    {
      sprint_id: z.string().optional().describe('Sprint ID'),
      name: z.string().optional(),
      end_date: z.string().optional(),
      status: z.enum(['active', 'completed', 'abandoned']).optional(),
    },
    async ({ sprint_id, name, end_date, status }) => {
      const userId = ctx.getCurrentUser();
      const updates: string[] = [];
      const params: any[] = [];

      if (name) { updates.push('name = ?'); params.push(name); }
      if (end_date) { updates.push('end_date = ?'); params.push(end_date); }
      if (status) { updates.push('status = ?'); params.push(status); }

      if (updates.length === 0) {
        return { content: [{ type: 'text', text: '⚠️ No updates provided' }] };
      }

      let sql = `UPDATE sprints SET ${updates.join(', ')} WHERE user_id = ?`;
      params.push(userId);

      if (sprint_id) {
        sql += ` AND (id = ? OR id LIKE ?)`;
        params.push(sprint_id, `%${sprint_id}%`);
      } else {
        sql += ` AND status = 'active'`;
      }

      await ctx.env.DB.prepare(sql).bind(...params).run();
      return { content: [{ type: 'text', text: '✅ Sprint updated' }] };
    }
  );

  // end_sprint
  server.tool(
    'end_sprint',
    'End the current sprint',
    {
      sprint_id: z.string().optional(),
      status: z.enum(['completed', 'abandoned']).default('completed'),
    },
    async ({ sprint_id, status }) => {
      const userId = ctx.getCurrentUser();

      let sql = `UPDATE sprints SET status = ?, completed_at = datetime('now') WHERE user_id = ?`;
      const params: any[] = [status, userId];

      if (sprint_id) {
        sql += ` AND (id = ? OR id LIKE ?)`;
        params.push(sprint_id, `%${sprint_id}%`);
      } else {
        sql += ` AND status = 'active'`;
      }

      await ctx.env.DB.prepare(sql).bind(...params).run();
      return {
        content: [{ type: 'text', text: `🏁 Sprint ${status}` }]
      };
    }
  );
}
