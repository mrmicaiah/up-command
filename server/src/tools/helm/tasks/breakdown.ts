/**
 * break_down_task - Split task into subtasks
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerBreakdownTask(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'break_down_task',
    'Break a task into smaller subtasks',
    {
      task_id: z.string().describe('Parent task ID'),
      subtasks: z.array(z.string()).describe('List of subtask descriptions'),
    },
    async ({ task_id, subtasks }) => {
      const userId = ctx.getCurrentUser();

      // Find parent task
      const parent = await ctx.env.DB.prepare(
        `SELECT * FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
      ).bind(task_id, `%${task_id}%`, userId).first() as any;

      if (!parent) {
        return { content: [{ type: 'text', text: '❌ Parent task not found' }] };
      }

      // Create subtasks
      const created: string[] = [];
      for (const text of subtasks) {
        const id = `task-${crypto.randomUUID().slice(0, 8)}`;
        await ctx.env.DB.prepare(`
          INSERT INTO tasks (id, user_id, text, priority, project, category, parent_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, userId, text, parent.priority,
          parent.project, parent.category, parent.id
        ).run();
        created.push(text);
      }

      let output = `✅ Created ${created.length} subtasks for "${parent.text}":\n`;
      created.forEach((t, i) => {
        output += `${i + 1}. ${t}\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
