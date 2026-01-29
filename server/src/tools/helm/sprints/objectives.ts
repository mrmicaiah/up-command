/**
 * Sprint objectives and task management
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerSprintObjectives(server: McpServer, ctx: ToolContext): void {
  // add_objective
  server.tool(
    'add_objective',
    'Add an objective to a sprint',
    {
      statement: z.string().describe('Objective statement'),
      sprint_id: z.string().optional().describe('Sprint ID (defaults to active)'),
    },
    async ({ statement, sprint_id }) => {
      const userId = ctx.getCurrentUser();
      
      // Find sprint
      let sprint: any;
      if (sprint_id) {
        sprint = await ctx.env.DB.prepare(
          `SELECT * FROM sprints WHERE (id = ? OR id LIKE ?) AND user_id = ?`
        ).bind(sprint_id, `%${sprint_id}%`, userId).first();
      } else {
        sprint = await ctx.env.DB.prepare(
          `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' LIMIT 1`
        ).bind(userId).first();
      }

      if (!sprint) {
        return { content: [{ type: 'text', text: '❌ No active sprint found' }] };
      }

      const id = `obj-${crypto.randomUUID().slice(0, 8)}`;
      await ctx.env.DB.prepare(`
        INSERT INTO sprint_objectives (id, sprint_id, statement)
        VALUES (?, ?, ?)
      `).bind(id, sprint.id, statement).run();

      return {
        content: [{ type: 'text', text: `🎯 Objective added: "${statement}"` }]
      };
    }
  );

  // pull_to_sprint
  server.tool(
    'pull_to_sprint',
    'Add a task to the current sprint',
    {
      task_id: z.string().optional().describe('Task ID'),
      search: z.string().optional().describe('Search for task'),
      objective_id: z.string().optional().describe('Link to objective'),
      objective_search: z.string().optional().describe('Search for objective'),
    },
    async ({ task_id, search, objective_id, objective_search }) => {
      const userId = ctx.getCurrentUser();

      // Find task
      let task: any;
      if (task_id) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
        ).bind(task_id, `%${task_id}%`, userId).first();
      } else if (search) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE user_id = ? AND text LIKE ? AND status = 'open' LIMIT 1`
        ).bind(userId, `%${search}%`).first();
      }

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      // Find active sprint
      const sprint = await ctx.env.DB.prepare(
        `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' LIMIT 1`
      ).bind(userId).first() as any;

      if (!sprint) {
        return { content: [{ type: 'text', text: '❌ No active sprint' }] };
      }

      // Find objective if specified
      let objId = objective_id;
      if (objective_search && !objId) {
        const obj = await ctx.env.DB.prepare(
          `SELECT * FROM sprint_objectives WHERE sprint_id = ? AND statement LIKE ? LIMIT 1`
        ).bind(sprint.id, `%${objective_search}%`).first() as any;
        if (obj) objId = obj.id;
      }

      await ctx.env.DB.prepare(`
        INSERT OR REPLACE INTO sprint_tasks (sprint_id, task_id, objective_id)
        VALUES (?, ?, ?)
      `).bind(sprint.id, (task as any).id, objId || null).run();

      return {
        content: [{ type: 'text', text: `📌 Added to sprint: "${(task as any).text}"` }]
      };
    }
  );

  // remove_from_sprint
  server.tool(
    'remove_from_sprint',
    'Remove a task from the sprint',
    {
      task_id: z.string().optional(),
      search: z.string().optional(),
    },
    async ({ task_id, search }) => {
      const userId = ctx.getCurrentUser();

      // Find task
      let task: any;
      if (task_id) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
        ).bind(task_id, `%${task_id}%`, userId).first();
      } else if (search) {
        task = await ctx.env.DB.prepare(
          `SELECT * FROM tasks WHERE user_id = ? AND text LIKE ? LIMIT 1`
        ).bind(userId, `%${search}%`).first();
      }

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      await ctx.env.DB.prepare(
        `DELETE FROM sprint_tasks WHERE task_id = ?`
      ).bind((task as any).id).run();

      return {
        content: [{ type: 'text', text: `✅ Removed from sprint: "${(task as any).text}"` }]
      };
    }
  );
}
