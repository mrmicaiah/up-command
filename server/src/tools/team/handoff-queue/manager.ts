/**
 * Handoff Queue - Manager tools
 * For creating and managing task queue
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerHandoffManager(server: McpServer, ctx: ToolContext): void {
  // handoff_create_task
  server.tool(
    'handoff_create_task',
    'Create a task in the handoff queue',
    {
      instruction: z.string().describe('Clear description of what needs to be done'),
      context: z.string().optional().describe('Additional requirements or background'),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      project_name: z.string().optional().describe('Group related tasks'),
      estimated_complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
      files_needed: z.array(z.string()).optional().describe('File references'),
      parent_task_id: z.string().optional().describe('Parent task if subtask'),
    },
    async ({ instruction, context, priority, project_name, estimated_complexity, files_needed, parent_task_id }) => {
      const userId = ctx.getCurrentUser();
      const id = `TASK-${crypto.randomUUID().slice(0, 8)}`;

      await ctx.env.DB.prepare(`
        INSERT INTO handoff_tasks (id, instruction, context, priority, project_name, 
          estimated_complexity, files_needed, parent_task_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, instruction, context || null, priority, project_name || null,
        estimated_complexity || null, files_needed ? JSON.stringify(files_needed) : null,
        parent_task_id || null, userId
      ).run();

      return {
        content: [{ type: 'text', text: `📋 Task created: ${id}\n"${instruction.slice(0, 50)}..."` }]
      };
    }
  );

  // handoff_view_queue
  server.tool(
    'handoff_view_queue',
    'View the handoff task queue',
    {
      status: z.enum(['pending', 'claimed', 'in_progress', 'complete', 'blocked']).optional(),
      project_name: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      limit: z.number().default(20),
    },
    async ({ status, project_name, priority, limit }) => {
      let sql = `SELECT * FROM handoff_tasks WHERE 1=1`;
      const params: any[] = [];

      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }
      if (project_name) {
        sql += ` AND project_name = ?`;
        params.push(project_name);
      }
      if (priority) {
        sql += ` AND priority = ?`;
        params.push(priority);
      }

      sql += ` ORDER BY 
        CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        created_at ASC LIMIT ?`;
      params.push(limit);

      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const tasks = result.results || [];

      if (tasks.length === 0) {
        return { content: [{ type: 'text', text: '📭 No tasks in queue' }] };
      }

      let output = `📋 **Handoff Queue** (${tasks.length})\n\n`;
      tasks.forEach((t: any) => {
        const icon = { pending: '⏳', claimed: '👋', in_progress: '🔧', complete: '✅', blocked: '🚫' }[t.status] || '❓';
        output += `${icon} **${t.id}** [${t.priority}]\n`;
        output += `   ${t.instruction.slice(0, 60)}...\n`;
        if (t.project_name) output += `   Project: ${t.project_name}\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // handoff_get_results
  server.tool(
    'handoff_get_results',
    'Get completed task results',
    {
      task_id: z.string().optional().describe('Specific task ID'),
      project_name: z.string().optional().describe('Get all for project'),
      since: z.string().optional().describe('ISO date'),
    },
    async ({ task_id, project_name, since }) => {
      let sql = `SELECT * FROM handoff_tasks WHERE status = 'complete'`;
      const params: any[] = [];

      if (task_id) {
        sql += ` AND (id = ? OR id LIKE ?)`;
        params.push(task_id, `%${task_id}%`);
      }
      if (project_name) {
        sql += ` AND project_name = ?`;
        params.push(project_name);
      }
      if (since) {
        sql += ` AND completed_at >= ?`;
        params.push(since);
      }
      sql += ` ORDER BY completed_at DESC LIMIT 20`;

      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const tasks = result.results || [];

      if (tasks.length === 0) {
        return { content: [{ type: 'text', text: '📭 No completed tasks found' }] };
      }

      let output = `✅ **Completed Tasks** (${tasks.length})\n\n`;
      tasks.forEach((t: any) => {
        output += `**${t.id}**\n`;
        output += `${t.output_summary || 'No summary'}\n`;
        if (t.output_location) output += `Location: ${t.output_location}\n`;
        output += '\n';
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // handoff_update_task (manager)
  server.tool(
    'handoff_update_task',
    'Update a handoff task',
    {
      task_id: z.string().describe('Task ID'),
      instruction: z.string().optional(),
      context: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      status: z.enum(['pending', 'claimed', 'in_progress', 'complete', 'blocked']).optional(),
    },
    async ({ task_id, instruction, context, priority, status }) => {
      const updates: string[] = [];
      const params: any[] = [];

      if (instruction) { updates.push('instruction = ?'); params.push(instruction); }
      if (context) { updates.push('context = ?'); params.push(context); }
      if (priority) { updates.push('priority = ?'); params.push(priority); }
      if (status) { updates.push('status = ?'); params.push(status); }

      if (updates.length === 0) {
        return { content: [{ type: 'text', text: '⚠️ No updates provided' }] };
      }

      params.push(task_id);
      await ctx.env.DB.prepare(
        `UPDATE handoff_tasks SET ${updates.join(', ')} WHERE id = ? OR id LIKE ?`
      ).bind(...params, `%${task_id}%`).run();

      return { content: [{ type: 'text', text: `✅ Task ${task_id} updated` }] };
    }
  );

  // handoff_project_status
  server.tool(
    'handoff_project_status',
    'Get status of a project',
    {
      project_name: z.string().describe('Project to check'),
    },
    async ({ project_name }) => {
      const result = await ctx.env.DB.prepare(`
        SELECT status, COUNT(*) as count FROM handoff_tasks
        WHERE project_name = ? GROUP BY status
      `).bind(project_name).all();

      const counts = result.results || [];
      const total = counts.reduce((sum: number, c: any) => sum + c.count, 0);

      let output = `📊 **${project_name}** (${total} tasks)\n\n`;
      counts.forEach((c: any) => {
        const pct = Math.round((c.count / total) * 100);
        output += `${c.status}: ${c.count} (${pct}%)\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
