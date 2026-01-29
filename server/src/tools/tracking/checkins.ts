/**
 * Check-ins - Record work sessions and progress
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerCheckinTools(server: McpServer, ctx: ToolContext): void {
  
  // add_checkin
  server.tool(
    'add_checkin',
    'Record a check-in for a project with a recap of progress',
    {
      project_name: z.string().describe('Project this check-in is for'),
      thread_summary: z.string().describe('~280 char fun/sarcastic tone summary'),
      full_recap: z.string().describe('Detailed markdown recap of work done'),
    },
    async ({ project_name, thread_summary, full_recap }) => {
      const userId = ctx.getCurrentUser();
      const id = `checkin_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO check_ins (id, user_id, project_name, thread_summary, full_recap, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, userId, project_name, thread_summary, full_recap).run();
      
      return {
        content: [{
          type: 'text',
          text: `✅ **Check-in recorded**\n\nProject: ${project_name}\n\n> ${thread_summary}`
        }]
      };
    }
  );
  
  // list_checkins
  server.tool(
    'list_checkins',
    'List recent check-ins',
    {
      limit: z.number().default(20).describe('Max results to return'),
      logged: z.boolean().optional().describe('Filter by logged status'),
      user_id: z.string().optional().describe('Filter by user (defaults to all)'),
    },
    async ({ limit, logged, user_id }) => {
      const userId = ctx.getCurrentUser();
      
      let sql = `SELECT * FROM check_ins WHERE user_id = ?`;
      const params: any[] = [user_id || userId];
      
      if (logged !== undefined) {
        sql += ` AND logged = ?`;
        params.push(logged ? 1 : 0);
      }
      
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      
      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const checkins = result.results || [];
      
      if (checkins.length === 0) {
        return { content: [{ type: 'text', text: '📭 No check-ins found' }] };
      }
      
      let output = `📋 **Recent Check-ins** (${checkins.length})\n\n`;
      
      checkins.forEach((c: any) => {
        const date = new Date(c.created_at).toLocaleDateString();
        output += `**${c.project_name}** - ${date}\n`;
        output += `> ${c.thread_summary}\n`;
        output += `ID: \`${c.id}\`\n\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // get_checkin
  server.tool(
    'get_checkin',
    'Get full details of a check-in',
    {
      id: z.string().describe('Check-in ID'),
    },
    async ({ id }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins WHERE id = ? AND user_id = ?
      `).bind(id, userId).first();
      
      if (!result) {
        return { content: [{ type: 'text', text: '❌ Check-in not found' }] };
      }
      
      const c = result as any;
      let output = `📋 **Check-in: ${c.project_name}**\n\n`;
      output += `**Date:** ${new Date(c.created_at).toLocaleString()}\n`;
      output += `**Summary:** ${c.thread_summary}\n\n`;
      output += `---\n\n${c.full_recap}`;
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // checkin_history
  server.tool(
    'checkin_history',
    'Get check-in history for a project',
    {
      project_id: z.string().describe('Project name to get history for'),
      count: z.number().default(4).describe('Number of check-ins to return'),
    },
    async ({ project_id, count }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins 
        WHERE user_id = ? AND project_name = ?
        ORDER BY created_at DESC LIMIT ?
      `).bind(userId, project_id, count).all();
      
      const checkins = result.results || [];
      
      if (checkins.length === 0) {
        return { content: [{ type: 'text', text: `📭 No check-ins found for "${project_id}"` }] };
      }
      
      let output = `📜 **Check-in History: ${project_id}** (${checkins.length})\n\n`;
      
      checkins.forEach((c: any, i: number) => {
        const date = new Date(c.created_at).toLocaleDateString();
        output += `### ${i + 1}. ${date}\n`;
        output += `> ${c.thread_summary}\n\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
}
