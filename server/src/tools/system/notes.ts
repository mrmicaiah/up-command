/**
 * Notes & Ideas Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerNoteTools(server: McpServer, ctx: ToolContext): void {
  const { env, getCurrentUser } = ctx;

  server.tool('add_note', {
    title: z.string().describe('Note title'),
    content: z.string().optional().describe('Note content'),
    category: z.string().optional().default('General').describe('Category'),
  }, async ({ title, content, category }) => {
    await env.DB.prepare(
      'INSERT INTO notes (id, user_id, title, content, category, created_at, archived) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).bind(crypto.randomUUID(), getCurrentUser(), title, content || null, category, new Date().toISOString()).run();
    return { content: [{ type: 'text', text: '📝 Note saved: "' + title + '"' }] };
  });

  server.tool('add_idea', {
    title: z.string().describe('Idea title'),
    content: z.string().optional().describe('Idea description'),
    category: z.enum(['Writing Ideas', 'Business Ideas', 'Tech Ideas', 'Content Ideas', 'Unsorted']).optional().default('Unsorted').describe('Category'),
  }, async ({ title, content, category }) => {
    await env.DB.prepare(
      'INSERT INTO incubation (id, user_id, title, content, category, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), getCurrentUser(), title, content || null, category, new Date().toISOString()).run();
    return { content: [{ type: 'text', text: '💡 Idea: "' + title + '"' }] };
  });

  server.tool('list_ideas', {
    category: z.string().optional().describe('Filter by category'),
  }, async ({ category }) => {
    let q = 'SELECT * FROM incubation WHERE user_id = ?';
    const b: any[] = [getCurrentUser()];
    if (category) { q += ' AND category = ?'; b.push(category); }
    q += ' ORDER BY created_at DESC';
    
    const r = await env.DB.prepare(q).bind(...b).all();
    if (r.results.length === 0) return { content: [{ type: 'text', text: 'No ideas yet' }] };
    
    let out = '💡 **Ideas** (' + r.results.length + ')\n\n';
    for (const i of r.results as any[]) {
      out += '• **' + i.title + '**';
      if (i.category && i.category !== 'Unsorted') out += ' [' + i.category + ']';
      out += '\n';
      if (i.content) out += '  ' + (i.content.length > 80 ? i.content.substring(0, 80) + '...' : i.content) + '\n';
    }
    return { content: [{ type: 'text', text: out }] };
  });
}
