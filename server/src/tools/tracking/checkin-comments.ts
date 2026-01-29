/**
 * Check-in Comments - Add commentary to check-ins
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerCheckinCommentTools(server: McpServer, ctx: ToolContext): void {
  
  // add_checkin_comment
  server.tool(
    'add_checkin_comment',
    'Add a comment to a check-in',
    {
      check_in_id: z.string().describe('Check-in ID to comment on'),
      content: z.string().describe('Comment content'),
    },
    async ({ check_in_id, content }) => {
      const userId = ctx.getCurrentUser();
      const id = `comment_${Date.now().toString(36)}`;
      
      // Verify check-in exists
      const checkin = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE id = ? AND user_id = ?
      `).bind(check_in_id, userId).first();
      
      if (!checkin) {
        return { content: [{ type: 'text', text: '❌ Check-in not found' }] };
      }
      
      await ctx.env.DB.prepare(`
        INSERT INTO checkin_comments (id, check_in_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(id, check_in_id, userId, content).run();
      
      return {
        content: [{
          type: 'text',
          text: `💬 **Comment added** to check-in\n\n> ${content}`
        }]
      };
    }
  );
  
  // list_checkin_comments
  server.tool(
    'list_checkin_comments',
    'List comments on a check-in',
    {
      check_in_id: z.string().describe('Check-in ID'),
    },
    async ({ check_in_id }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM checkin_comments 
        WHERE check_in_id = ? AND user_id = ?
        ORDER BY created_at ASC
      `).bind(check_in_id, userId).all();
      
      const comments = result.results || [];
      
      if (comments.length === 0) {
        return { content: [{ type: 'text', text: '💬 No comments on this check-in' }] };
      }
      
      let output = `💬 **Comments** (${comments.length})\n\n`;
      
      comments.forEach((c: any) => {
        const date = new Date(c.created_at).toLocaleString();
        output += `**${date}**\n${c.content}\n\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
}
