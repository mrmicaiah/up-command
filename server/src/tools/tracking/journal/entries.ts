/**
 * Journal Entries - Personal journaling
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../../types.js';

const MOODS = ['anxious', 'calm', 'excited', 'frustrated', 'grateful', 'hopeful', 'sad', 'angry', 'content', 'overwhelmed', 'focused', 'scattered'] as const;
const ENTRY_TYPES = ['freeform', 'morning', 'evening', 'reflection', 'braindump'] as const;

export function registerJournalEntryTools(server: McpServer, ctx: ToolContext): void {
  
  // add_journal_entry
  server.tool(
    'add_journal_entry',
    'Add a new journal entry',
    {
      content: z.string().describe('Your journal entry - write naturally'),
      entry_type: z.enum(ENTRY_TYPES).default('freeform').describe('Type of entry'),
      mood: z.enum(MOODS).optional().describe('Current mood'),
      energy: z.number().min(1).max(10).optional().describe('Energy level 1-10'),
      forward_to_penzu: z.boolean().default(true).describe('Forward to Penzu'),
    },
    async ({ content, entry_type, mood, energy, forward_to_penzu }) => {
      const userId = ctx.getCurrentUser();
      const id = `journal_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO journal_entries (id, user_id, content, entry_type, mood, energy, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, userId, content, entry_type, mood || null, energy || null).run();
      
      let output = `📓 **Journal Entry Saved**\n\n`;
      output += `Type: ${entry_type}`;
      if (mood) output += ` | Mood: ${mood}`;
      if (energy) output += ` | Energy: ${energy}/10`;
      output += `\n\nID: \`${id}\``;
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // list_journal_entries
  server.tool(
    'list_journal_entries',
    'List recent journal entries',
    {
      days: z.number().default(7).describe('Days to look back'),
      entry_type: z.enum(ENTRY_TYPES).optional().describe('Filter by type'),
      mood: z.enum(MOODS).optional().describe('Filter by mood'),
    },
    async ({ days, entry_type, mood }) => {
      const userId = ctx.getCurrentUser();
      
      let sql = `
        SELECT * FROM journal_entries 
        WHERE user_id = ? 
          AND created_at > datetime('now', '-' || ? || ' days')
      `;
      const params: any[] = [userId, days];
      
      if (entry_type) {
        sql += ` AND entry_type = ?`;
        params.push(entry_type);
      }
      if (mood) {
        sql += ` AND mood = ?`;
        params.push(mood);
      }
      
      sql += ` ORDER BY created_at DESC`;
      
      const result = await ctx.env.DB.prepare(sql).bind(...params).all();
      const entries = result.results || [];
      
      if (entries.length === 0) {
        return { content: [{ type: 'text', text: `📓 No journal entries in the last ${days} days` }] };
      }
      
      let output = `📓 **Journal Entries** (${entries.length} in last ${days} days)\n\n`;
      
      entries.forEach((e: any) => {
        const date = new Date(e.created_at).toLocaleDateString();
        const time = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const preview = e.content.slice(0, 80) + (e.content.length > 80 ? '...' : '');
        
        output += `**${date} ${time}** (${e.entry_type})`;
        if (e.mood) output += ` - ${e.mood}`;
        output += `\n> ${preview}\n`;
        output += `ID: \`${e.id}\`\n\n`;
      });
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // view_journal_entry
  server.tool(
    'view_journal_entry',
    'View full content of a journal entry',
    {
      entry_id: z.string().describe('Entry ID'),
    },
    async ({ entry_id }) => {
      const userId = ctx.getCurrentUser();
      
      const result = await ctx.env.DB.prepare(`
        SELECT * FROM journal_entries WHERE id = ? AND user_id = ?
      `).bind(entry_id, userId).first();
      
      if (!result) {
        return { content: [{ type: 'text', text: '❌ Entry not found' }] };
      }
      
      const e = result as any;
      const date = new Date(e.created_at).toLocaleString();
      
      let output = `📓 **Journal Entry**\n\n`;
      output += `**Date:** ${date}\n`;
      output += `**Type:** ${e.entry_type}`;
      if (e.mood) output += ` | **Mood:** ${e.mood}`;
      if (e.energy) output += ` | **Energy:** ${e.energy}/10`;
      output += `\n\n---\n\n${e.content}`;
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // update_journal_entry
  server.tool(
    'update_journal_entry',
    'Update an existing journal entry',
    {
      entry_id: z.string().describe('Entry ID'),
      content: z.string().optional().describe('Updated content'),
      mood: z.enum(MOODS).optional().describe('Updated mood'),
      energy: z.number().min(1).max(10).optional().describe('Updated energy'),
    },
    async ({ entry_id, content, mood, energy }) => {
      const userId = ctx.getCurrentUser();
      
      // Build dynamic update
      const updates: string[] = [];
      const params: any[] = [];
      
      if (content !== undefined) {
        updates.push('content = ?');
        params.push(content);
      }
      if (mood !== undefined) {
        updates.push('mood = ?');
        params.push(mood);
      }
      if (energy !== undefined) {
        updates.push('energy = ?');
        params.push(energy);
      }
      
      if (updates.length === 0) {
        return { content: [{ type: 'text', text: '⚠️ No updates provided' }] };
      }
      
      params.push(entry_id, userId);
      
      await ctx.env.DB.prepare(`
        UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
      `).bind(...params).run();
      
      return {
        content: [{
          type: 'text',
          text: `✅ **Entry updated**\n\nID: \`${entry_id}\``
        }]
      };
    }
  );
  
  // delete_journal_entry
  server.tool(
    'delete_journal_entry',
    'Delete a journal entry',
    {
      entry_id: z.string().describe('Entry ID to delete'),
    },
    async ({ entry_id }) => {
      const userId = ctx.getCurrentUser();
      
      await ctx.env.DB.prepare(`
        DELETE FROM journal_entries WHERE id = ? AND user_id = ?
      `).bind(entry_id, userId).run();
      
      return {
        content: [{
          type: 'text',
          text: `🗑️ **Entry deleted**`
        }]
      };
    }
  );
}
