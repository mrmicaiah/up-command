/**
 * add_task - Create a new task
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerAddTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'add_task',
    'Add a new task to your backlog',
    {
      text: z.string().describe('Task description'),
      priority: z.number().min(1).max(5).default(3).describe('Priority 1-5 (1=highest)'),
      project: z.string().optional().describe('Project name'),
      category: z.string().optional().describe('Category'),
      due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Additional notes'),
      is_active: z.boolean().optional().describe('Add directly to Active list'),
      recurrence: z.string().optional().describe('daily, weekly, monthly, etc.'),
      for_user: z.string().optional().describe('Assign to teammate'),
    },
    async ({ text, priority, project, category, due_date, notes, is_active, recurrence, for_user }) => {
      const userId = for_user || ctx.getCurrentUser();
      const id = `task-${crypto.randomUUID().slice(0, 8)}`;

      await ctx.env.DB.prepare(`
        INSERT INTO tasks (id, user_id, text, priority, project, category, due_date, notes, is_active, recurrence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, userId, text, priority,
        project || null, category || null,
        due_date || null, notes || null,
        is_active ? 1 : 0, recurrence || null
      ).run();

      const assignee = for_user ? ` (assigned to ${for_user})` : '';
      return {
        content: [{
          type: 'text',
          text: `✅ Task added${assignee}: "${text}"\nID: ${id} | Priority: ${priority}${is_active ? ' | 🎯 Active' : ''}`
        }]
      };
    }
  );
}
