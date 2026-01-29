/**
 * Team messaging tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerMessaging(server: McpServer, ctx: ToolContext): void {
  // send_message
  server.tool(
    'send_message',
    'Send a message to a teammate',
    {
      message: z.string().describe('Message content'),
      to: z.string().optional().describe('Teammate username'),
    },
    async ({ message, to }) => {
      const userId = ctx.getCurrentUser();
      const recipient = to || ctx.getTeammate();

      if (!recipient) {
        return { content: [{ type: 'text', text: '❌ No teammate specified' }] };
      }

      const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
      await ctx.env.DB.prepare(`
        INSERT INTO messages (id, from_user, to_user, content)
        VALUES (?, ?, ?, ?)
      `).bind(id, userId, recipient, message).run();

      return {
        content: [{ type: 'text', text: `✉️ Message sent to ${recipient}` }]
      };
    }
  );

  // check_messages
  server.tool(
    'check_messages',
    'Check for unread messages',
    {
      include_read: z.boolean().optional().describe('Include read messages'),
    },
    async ({ include_read }) => {
      const userId = ctx.getCurrentUser();

      let sql = `SELECT * FROM messages WHERE to_user = ?`;
      if (!include_read) {
        sql += ` AND read_at IS NULL`;
      }
      sql += ` ORDER BY created_at DESC LIMIT 20`;

      const result = await ctx.env.DB.prepare(sql).bind(userId).all();
      const messages = result.results || [];

      if (messages.length === 0) {
        return { content: [{ type: 'text', text: '📭 No messages' }] };
      }

      // Mark as read
      const unreadIds = messages.filter((m: any) => !m.read_at).map((m: any) => m.id);
      if (unreadIds.length > 0) {
        await ctx.env.DB.prepare(`
          UPDATE messages SET read_at = datetime('now') 
          WHERE id IN (${unreadIds.map(() => '?').join(',')})
        `).bind(...unreadIds).run();
      }

      let output = `📬 **Messages** (${messages.length})\n\n`;
      messages.forEach((m: any) => {
        const status = m.read_at ? '📖' : '🆕';
        const time = m.created_at?.split('T')[0] || '';
        output += `${status} **${m.from_user}** (${time}):\n${m.content}\n\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );

  // message_history
  server.tool(
    'message_history',
    'View message history with a teammate',
    {
      with_user: z.string().optional().describe('Teammate to filter by'),
      limit: z.number().optional().describe('Number of messages'),
    },
    async ({ with_user, limit = 20 }) => {
      const userId = ctx.getCurrentUser();

      let sql = `SELECT * FROM messages WHERE (from_user = ? OR to_user = ?)`;
      const params: string[] = [userId, userId];

      if (with_user) {
        sql += ` AND (from_user = ? OR to_user = ?)`;
        params.push(with_user, with_user);
      }
      sql += ` ORDER BY created_at DESC LIMIT ?`;

      const result = await ctx.env.DB.prepare(sql).bind(...params, limit).all();
      const messages = result.results || [];

      if (messages.length === 0) {
        return { content: [{ type: 'text', text: '📭 No message history' }] };
      }

      let output = `💬 **Message History**\n\n`;
      messages.reverse().forEach((m: any) => {
        const dir = m.from_user === userId ? '→' : '←';
        const other = m.from_user === userId ? m.to_user : m.from_user;
        output += `${dir} **${other}**: ${m.content}\n`;
      });

      return { content: [{ type: 'text', text: output }] };
    }
  );
}
