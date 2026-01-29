/**
 * Work Logs - Synthesized narratives from check-ins
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerWorkLogTools(server: McpServer, ctx: ToolContext): void {
  
  // create_work_log
  server.tool(
    'create_work_log',
    'Create a new work log (draft state)',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const id = `worklog_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO work_logs (id, user_id, status, created_at)
        VALUES (?, ?, 'draft', datetime('now'))
      `).bind(id, userId).run();
      
      return {
        content: [{
          type: 'text',
          text: `📝 **Work log created**\n\nID: \`${id}\`\n\nUse \`save_work_log\` to add content and finalize.`
        }]
      };
    }
  );
  
  // save_work_log
  server.tool(
    'save_work_log',
    'Save a work log with narrative and shipped items',
    {
      check_in_ids: z.array(z.string()).describe('IDs of check-ins being logged'),
      narrative: z.string().describe('Synthesized story of the work'),
      shipped: z.array(z.string()).describe('Array of concrete outputs'),
    },
    async ({ check_in_ids, narrative, shipped }) => {
      const userId = ctx.getCurrentUser();
      const id = `worklog_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO work_logs (id, user_id, narrative, shipped, check_in_ids, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'complete', datetime('now'))
      `).bind(id, userId, narrative, JSON.stringify(shipped), JSON.stringify(check_in_ids)).run();
      
      // Mark check-ins as logged
      for (const checkInId of check_in_ids) {
        await ctx.env.DB.prepare(`
          UPDATE check_ins SET logged = 1 WHERE id = ? AND user_id = ?
        `).bind(checkInId, userId).run();
      }
      
      let output = `📖 **Work Log Saved**\n\n`;
      output += `**Narrative:**\n${narrative}\n\n`;
      output += `**Shipped:**\n`;
      shipped.forEach(s => {
        output += `- ${s}\n`;
      });
      output += `\n✅ Marked ${check_in_ids.length} check-ins as logged`;
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // get_work_log
  server.tool(
    'get_work_log',
    'Get a specific work log',
    {
      id: z.string().describe('Work log ID'),
    },
    async ({ id }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM work_logs WHERE id = ? AND user_id = ?
      `).bind(id, userId).first();
      
      if (!result) {
        return { content: [{ type: 'text', text: '❌ Work log not found' }] };
      }
      
      const log = result as any;
      const shipped = log.shipped ? JSON.parse(log.shipped) : [];
      
      let output = `📖 **Work Log**\n\n`;
      output += `**Date:** ${new Date(log.created_at).toLocaleDateString()}\n`;
      output += `**Status:** ${log.status}\n\n`;
      output += `**Narrative:**\n${log.narrative || '_No narrative yet_'}\n\n`;
      output += `**Shipped:**\n`;
      if (shipped.length > 0) {
        shipped.forEach((s: string) => {
          output += `- ${s}\n`;
        });
      } else {
        output += `_No items listed_\n`;
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // list_work_logs
  server.tool(
    'list_work_logs',
    'List recent work logs',
    {
      limit: z.number().default(10).describe('Max results'),
      user_id: z.string().optional().describe('Filter by user ID'),
    },
    async ({ limit, user_id }) => {
      const userId = user_id || ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM work_logs 
        WHERE user_id = ? AND status = 'complete'
        ORDER BY created_at DESC LIMIT ?
      `).bind(userId, limit).all();
      
      const logs = result.results || [];
      
      if (logs.length === 0) {
        return { content: [{ type: 'text', text: '📭 No work logs found' }] };
      }
      
      let output = `📖 **Work Logs** (${logs.length})\n\n`;
      
      logs.forEach((log: any) => {
        const date = new Date(log.created_at).toLocaleDateString();
        const shipped = log.shipped ? JSON.parse(log.shipped) : [];
        const preview = log.narrative?.slice(0, 100) + (log.narrative?.length > 100 ? '...' : '');
        
        output += `**${date}** - ${shipped.length} items shipped\n`;
        output += `> ${preview}\n`;
        output += `ID: \`${log.id}\`\n\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // work_history
  server.tool(
    'work_history',
    'Get work history summary over recent days',
    {
      days: z.number().default(7).describe('Number of days to look back'),
    },
    async ({ days }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM work_logs 
        WHERE user_id = ? 
          AND status = 'complete'
          AND created_at > datetime('now', '-' || ? || ' days')
        ORDER BY created_at DESC
      `).bind(userId, days).all();
      
      const logs = result.results || [];
      
      let totalShipped = 0;
      logs.forEach((log: any) => {
        const shipped = log.shipped ? JSON.parse(log.shipped) : [];
        totalShipped += shipped.length;
      });
      
      let output = `📊 **Work History** (Last ${days} days)\n\n`;
      output += `- **Work logs:** ${logs.length}\n`;
      output += `- **Items shipped:** ${totalShipped}\n\n`;
      
      if (logs.length > 0) {
        output += `**Recent:**\n`;
        logs.slice(0, 5).forEach((log: any) => {
          const date = new Date(log.created_at).toLocaleDateString();
          const shipped = log.shipped ? JSON.parse(log.shipped) : [];
          output += `- ${date}: ${shipped.length} items\n`;
        });
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
}
