/**
 * Handoff Queue - Worker tools
 * For claiming and completing tasks
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerHandoffWorker(server: McpServer, ctx: ToolContext): void {
  // handoff_get_next_task
  server.tool(
    'handoff_get_next_task',
    'Claim the next available task from queue',
    {
      priority_filter: z.enum(['high', 'urgent']).optional(),
      project_name: z.string().optional(),
    },
    async ({ priority_filter, project_name }) => {
      let sql = `SELECT * FROM handoff_tasks WHERE status = 'pending'`;
      const params: any[] = [];

      if (priority_filter) {
        if (priority_filter === 'urgent') {
          sql += ` AND priority = 'urgent'`;
        } else {
          sql += ` AND priority IN ('high', 'urgent')`;
        }
      }
      if (project_name) {
        sql += ` AND project_name = ?`;
        params.push(project_name);
      }

      sql += ` ORDER BY 
        CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        created_at ASC LIMIT 1`;

      const task = await ctx.env.DB.prepare(sql).bind(...params).first() as any;

      if (!task) {
        return { content: [{ type: 'text', text: '📭 No tasks available' }] };
      }

      // Claim it
      const userId = ctx.getCurrentUser();
      await ctx.env.DB.prepare(`
        UPDATE handoff_tasks SET status = 'claimed', claimed_by = ?, claimed_at = datetime('now')
        WHERE id = ?
      `).bind(userId, task.id).run();

      let output = `📋 **Claimed: ${task.id}**\n\n`;
      output += `**Instruction:** ${task.instruction}\n`;
      if (task.context) output += `**Context:** ${task.context}\n`;
      output += `**Priority:** ${task.priority}\n`;
      if (task.project_name) output += `**Project:** ${task.project_name}\n`;
      if (task.files_needed) output += `**Files:** ${task.files_needed}\n`;

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // handoff_get_task
  server.tool(
    'handoff_get_task',
    'Get a specific task by ID',
    {
      task_id: z.string().describe('Task ID'),
    },
    async ({ task_id }) => {
      const task = await ctx.env.DB.prepare(
        `SELECT * FROM handoff_tasks WHERE id = ? OR id LIKE ?`
      ).bind(task_id, `%${task_id}%`).first() as any;

      if (!task) {
        return { content: [{ type: 'text', text: '❌ Task not found' }] };
      }

      let output = `📋 **${task.id}** [${task.status}]\n\n`;
      output += `**Instruction:** ${task.instruction}\n`;
      if (task.context) output += `**Context:** ${task.context}\n`;
      output += `**Priority:** ${task.priority}\n`;
      if (task.project_name) output += `**Project:** ${task.project_name}\n`;
      if (task.claimed_by) output += `**Claimed by:** ${task.claimed_by}\n`;

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // handoff_complete_task
  server.tool(
    'handoff_complete_task',
    'Mark a task as complete with output details',
    {
      task_id: z.string().describe('Task ID'),
      output_summary: z.string().describe('What was accomplished'),
      output_location: z.enum(['github', 'drive', 'both', 'local']).describe('Where outputs are'),
      files_created: z.array(z.string()).optional(),
      github_repo: z.string().optional(),
      github_paths: z.array(z.string()).optional(),
      drive_folder_id: z.string().optional(),
      drive_file_ids: z.array(z.string()).optional(),
      worker_notes: z.string().optional(),
    },
    async ({ task_id, output_summary, output_location, files_created, github_repo, github_paths, drive_folder_id, drive_file_ids, worker_notes }) => {
      await ctx.env.DB.prepare(`
        UPDATE handoff_tasks SET 
          status = 'complete',
          output_summary = ?,
          output_location = ?,
          files_created = ?,
          github_repo = ?,
          github_paths = ?,
          drive_folder_id = ?,
          drive_file_ids = ?,
          worker_notes = ?,
          completed_at = datetime('now')
        WHERE id = ? OR id LIKE ?
      `).bind(
        output_summary, output_location,
        files_created ? JSON.stringify(files_created) : null,
        github_repo || null,
        github_paths ? JSON.stringify(github_paths) : null,
        drive_folder_id || null,
        drive_file_ids ? JSON.stringify(drive_file_ids) : null,
        worker_notes || null,
        task_id, `%${task_id}%`
      ).run();

      return { content: [{ type: 'text', text: `✅ Task ${task_id} completed!` }] };
    }
  );

  // handoff_block_task
  server.tool(
    'handoff_block_task',
    'Mark a task as blocked',
    {
      task_id: z.string().describe('Task ID'),
      reason: z.string().describe('What is blocking'),
    },
    async ({ task_id, reason }) => {
      await ctx.env.DB.prepare(`
        UPDATE handoff_tasks SET status = 'blocked', blocked_reason = ?
        WHERE id = ? OR id LIKE ?
      `).bind(reason, task_id, `%${task_id}%`).run();

      return { content: [{ type: 'text', text: `🚫 Task ${task_id} blocked: ${reason}` }] };
    }
  );

  // handoff_update_progress
  server.tool(
    'handoff_update_progress',
    'Update progress on a task',
    {
      task_id: z.string().describe('Task ID'),
      notes: z.string().describe('Progress update'),
    },
    async ({ task_id, notes }) => {
      // Get existing notes
      const task = await ctx.env.DB.prepare(
        `SELECT progress_notes FROM handoff_tasks WHERE id = ? OR id LIKE ?`
      ).bind(task_id, `%${task_id}%`).first() as any;

      const existing = task?.progress_notes ? JSON.parse(task.progress_notes) : [];
      existing.push({ time: new Date().toISOString(), note: notes });

      await ctx.env.DB.prepare(`
        UPDATE handoff_tasks SET 
          status = 'in_progress',
          progress_notes = ?
        WHERE id = ? OR id LIKE ?
      `).bind(JSON.stringify(existing), task_id, `%${task_id}%`).run();

      return { content: [{ type: 'text', text: `🔧 Progress updated on ${task_id}` }] };
    }
  );

  // handoff_my_tasks
  server.tool(
    'handoff_my_tasks',
    'View tasks you have claimed',
    {},
    async () => {
      const userId = ctx.getCurrentUser();

      const result = await ctx.env.DB.prepare(`
        SELECT * FROM handoff_tasks 
        WHERE claimed_by = ? AND status IN ('claimed', 'in_progress')
        ORDER BY 
          CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END
      `).bind(userId).all();

      const tasks = result.results || [];

      if (tasks.length === 0) {
        return { content: [{ type: 'text', text: '📭 No claimed tasks' }] };
      }

      let output = `🔧 **My Tasks** (${tasks.length})\n\n`;
      tasks.forEach((t: any) => {
        const icon = t.status === 'in_progress' ? '🔧' : '👋';
        output += `${icon} **${t.id}** [${t.priority}]\n`;
        output += `   ${t.instruction.slice(0, 60)}...\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
