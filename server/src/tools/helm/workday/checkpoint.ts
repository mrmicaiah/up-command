/**
 * checkpoint - Save progress mid-session
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerCheckpoint(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'checkpoint',
    'Save a progress checkpoint',
    {
      summary: z.string().describe('1-2 sentence summary'),
      discoveries: z.string().optional().describe('Key learnings'),
      topics: z.array(z.string()).optional().describe('Topics covered'),
      task_ids: z.array(z.string()).optional().describe('Related task IDs'),
      trigger: z.enum(['task_added', 'task_completed', 'topic_shift', 'manual', 'auto']).default('auto'),
    },
    async ({ summary, discoveries, topics, task_ids, trigger }) => {
      const userId = ctx.getCurrentUser();
      const id = `chk-${crypto.randomUUID().slice(0, 8)}`;

      // Store as a check-in
      await ctx.env.DB.prepare(`
        INSERT INTO check_ins (id, user_id, thread_summary, full_recap)
        VALUES (?, ?, ?, ?)
      `).bind(
        id, userId, summary,
        JSON.stringify({ discoveries, topics, task_ids, trigger })
      ).run();

      return {
        content: [{ type: 'text', text: `💾 Checkpoint saved: "${summary}"` }]
      };
    }
  );
}
