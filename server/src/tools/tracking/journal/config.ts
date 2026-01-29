/**
 * Journal Config - Streaks and settings
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerJournalConfigTools(server: McpServer, ctx: ToolContext): void {
  
  // journal_streak
  server.tool(
    'journal_streak',
    'Check current journaling streak',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      
      // Get entries grouped by date
      const result = await ctx.env.DB.prepare(`
        SELECT DATE(created_at) as date 
        FROM journal_entries 
        WHERE user_id = ?
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 365
      `).bind(userId).all();
      
      const dates = (result.results || []).map((r: any) => r.date);
      
      if (dates.length === 0) {
        return { content: [{ type: 'text', text: '📓 No journal entries yet. Start your streak today!' }] };
      }
      
      // Calculate current streak
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Check if streak is active (wrote today or yesterday)
      if (dates[0] === today || dates[0] === yesterday) {
        streak = 1;
        let checkDate = new Date(dates[0]);
        
        for (let i = 1; i < dates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDate = checkDate.toISOString().split('T')[0];
          
          if (dates[i] === expectedDate) {
            streak++;
          } else {
            break;
          }
        }
      }
      
      // Calculate longest streak
      let longestStreak = 1;
      let currentRun = 1;
      
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        
        if (diff === 1) {
          currentRun++;
          longestStreak = Math.max(longestStreak, currentRun);
        } else {
          currentRun = 1;
        }
      }
      
      let output = `🔥 **Journal Streak**\n\n`;
      output += `**Current streak:** ${streak} day${streak !== 1 ? 's' : ''}\n`;
      output += `**Longest streak:** ${longestStreak} day${longestStreak !== 1 ? 's' : ''}\n`;
      output += `**Total entries:** ${dates.length}\n\n`;
      
      if (streak === 0) {
        output += `💪 Write an entry today to start a new streak!`;
      } else if (streak >= 7) {
        output += `🎉 Amazing! You're on a week-long streak!`;
      } else if (streak >= 3) {
        output += `👏 Great work! Keep it going!`;
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // configure_journal
  server.tool(
    'configure_journal',
    'Configure journal settings',
    {
      penzu_email: z.string().optional().describe('Penzu forwarding email address'),
      weekly_goal: z.number().optional().describe('Entries per week goal'),
    },
    async ({ penzu_email, weekly_goal }) => {
      const userId = ctx.getCurrentUser();
      
      // Upsert user settings
      const settings = {
        penzu_email: penzu_email || null,
        weekly_goal: weekly_goal || 5,
      };
      
      await ctx.env.DB.prepare(`
        INSERT INTO user_settings (user_id, setting_key, setting_value)
        VALUES (?, 'journal_config', ?)
        ON CONFLICT(user_id, setting_key) 
        DO UPDATE SET setting_value = excluded.setting_value
      `).bind(userId, JSON.stringify(settings)).run();
      
      let output = `⚙️ **Journal Settings Updated**\n\n`;
      if (penzu_email) output += `Penzu email: ${penzu_email}\n`;
      if (weekly_goal) output += `Weekly goal: ${weekly_goal} entries\n`;
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // link_journal_entry
  server.tool(
    'link_journal_entry',
    'Link a journal entry to a task, launch, or project',
    {
      entry_id: z.string().describe('Journal entry ID'),
      link_type: z.enum(['task', 'launch', 'project']).describe('Type of item to link'),
      link_id: z.string().describe('ID of the item to link'),
    },
    async ({ entry_id, link_type, link_id }) => {
      const userId = ctx.getCurrentUser();
      
      // Verify entry exists
      const entry = await ctx.env.DB.prepare(`
        SELECT * FROM journal_entries WHERE id = ? AND user_id = ?
      `).bind(entry_id, userId).first();
      
      if (!entry) {
        return { content: [{ type: 'text', text: '❌ Journal entry not found' }] };
      }
      
      // Create link
      const linkEntry = `link_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO journal_links (id, journal_id, link_type, link_id, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(linkEntry, entry_id, link_type, link_id, userId).run();
      
      return {
        content: [{
          type: 'text',
          text: `🔗 **Entry linked** to ${link_type}: \`${link_id}\``
        }]
      };
    }
  );
}
