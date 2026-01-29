/**
 * Journal Insights - Search and analytics
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

export function registerJournalInsightTools(server: McpServer, ctx: ToolContext): void {
  
  // search_journal
  server.tool(
    'search_journal',
    'Search journal entries by keyword, entity, or mood',
    {
      query: z.string().describe('Search by keyword, entity, or mood'),
      days: z.number().default(30).describe('Days to search back'),
    },
    async ({ query, days }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM journal_entries 
        WHERE user_id = ? 
          AND created_at > datetime('now', '-' || ? || ' days')
          AND (content LIKE ? OR mood LIKE ? OR entry_type LIKE ?)
        ORDER BY created_at DESC
        LIMIT 20
      `).bind(userId, days, `%${query}%`, `%${query}%`, `%${query}%`).all();
      
      const entries = result.results || [];
      
      if (entries.length === 0) {
        return { content: [{ type: 'text', text: `🔍 No entries found matching "${query}"` }] };
      }
      
      let output = `🔍 **Search Results for "${query}"** (${entries.length})\n\n`;
      
      entries.forEach((e: any) => {
        const date = new Date(e.created_at).toLocaleDateString();
        const preview = e.content.slice(0, 100) + (e.content.length > 100 ? '...' : '');
        
        output += `**${date}** (${e.entry_type})\n`;
        output += `> ${preview}\n`;
        output += `ID: \`${e.id}\`\n\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // journal_insights
  server.tool(
    'journal_insights',
    'Get insights from journal entries over time',
    {
      days: z.number().default(30).describe('Days to analyze'),
    },
    async ({ days }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM journal_entries 
        WHERE user_id = ? 
          AND created_at > datetime('now', '-' || ? || ' days')
        ORDER BY created_at DESC
      `).bind(userId, days).all();
      
      const entries = result.results || [];
      
      if (entries.length === 0) {
        return { content: [{ type: 'text', text: `📊 No entries in the last ${days} days to analyze` }] };
      }
      
      // Analyze moods
      const moodCounts: Record<string, number> = {};
      let totalEnergy = 0;
      let energyCount = 0;
      const typeCounts: Record<string, number> = {};
      
      entries.forEach((e: any) => {
        if (e.mood) {
          moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        }
        if (e.energy) {
          totalEnergy += e.energy;
          energyCount++;
        }
        if (e.entry_type) {
          typeCounts[e.entry_type] = (typeCounts[e.entry_type] || 0) + 1;
        }
      });
      
      const avgEnergy = energyCount > 0 ? (totalEnergy / energyCount).toFixed(1) : 'N/A';
      
      // Sort moods by frequency
      const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      let output = `📊 **Journal Insights** (Last ${days} days)\n\n`;
      output += `**Total entries:** ${entries.length}\n`;
      output += `**Average energy:** ${avgEnergy}/10\n\n`;
      
      if (sortedMoods.length > 0) {
        output += `**Top moods:**\n`;
        sortedMoods.forEach(([mood, count]) => {
          const pct = ((count / entries.length) * 100).toFixed(0);
          output += `- ${mood}: ${count} (${pct}%)\n`;
        });
        output += '\n';
      }
      
      output += `**Entry types:**\n`;
      Object.entries(typeCounts).forEach(([type, count]) => {
        output += `- ${type}: ${count}\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
}
