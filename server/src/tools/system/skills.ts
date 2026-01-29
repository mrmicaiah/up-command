/**
 * Skills Tools - Stored skill instructions for Claude
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

// Helper to increment version string
function incrementVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length === 1) return (parseInt(parts[0]) + 1).toString();
  const minor = parseInt(parts[parts.length - 1]) + 1;
  parts[parts.length - 1] = minor.toString();
  return parts.join('.');
}

export function registerSkillTools(server: McpServer, ctx: ToolContext): void {
  const { env } = ctx;

  server.tool('list_skills', {
    category: z.string().optional().describe('Filter by category'),
  }, async ({ category }) => {
    let query = 'SELECT id, name, description, category, version, updated_at FROM skills';
    const bindings: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      bindings.push(category);
    }
    query += ' ORDER BY category, name';
    
    const result = await env.DB.prepare(query).bind(...bindings).all();
    if (result.results.length === 0) {
      return { content: [{ type: 'text', text: category ? `No skills in category "${category}".` : 'No skills found. Use save_skill to create one.' }] };
    }
    
    let out = '📚 **Available Skills**\n\n';
    const byCategory: Record<string, any[]> = {};
    for (const skill of result.results as any[]) {
      const cat = skill.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(skill);
    }
    
    for (const [cat, skills] of Object.entries(byCategory)) {
      out += `**[${cat}]**\n`;
      for (const s of skills) {
        out += `• **${s.name}** (v${s.version})\n`;
        if (s.description) out += `  ${s.description}\n`;
      }
      out += '\n';
    }
    out += '\n💡 Use `get_skill("name")` to retrieve skill instructions.';
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('get_skill', {
    name: z.string().describe('Skill name to retrieve'),
  }, async ({ name }) => {
    const skill = await env.DB.prepare('SELECT * FROM skills WHERE name = ?').bind(name.toLowerCase()).first() as any;
    
    if (!skill) {
      const partial = await env.DB.prepare('SELECT name FROM skills WHERE name LIKE ? LIMIT 5').bind('%' + name.toLowerCase() + '%').all();
      if (partial.results.length > 0) {
        const suggestions = (partial.results as any[]).map(s => s.name).join(', ');
        return { content: [{ type: 'text', text: `Skill "${name}" not found. Did you mean: ${suggestions}?` }] };
      }
      return { content: [{ type: 'text', text: `Skill "${name}" not found. Use list_skills to see available skills.` }] };
    }
    
    let out = `📖 **Skill: ${skill.name}** (v${skill.version})\n`;
    if (skill.description) out += `${skill.description}\n`;
    if (skill.category) out += `Category: ${skill.category}\n`;
    out += `\n---\n\n${skill.content}`;
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('save_skill', {
    name: z.string().describe('Unique skill name (lowercase, no spaces)'),
    content: z.string().describe('Skill instructions/prompts'),
    description: z.string().optional().describe('Brief description'),
    category: z.string().optional().describe('Category'),
    version: z.string().optional().describe('Version string'),
  }, async ({ name, content, description, category, version }) => {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
    const ts = new Date().toISOString();
    
    const existing = await env.DB.prepare('SELECT id, version FROM skills WHERE name = ?').bind(normalizedName).first() as any;
    
    if (existing) {
      const newVersion = version || incrementVersion(existing.version);
      await env.DB.prepare(
        'UPDATE skills SET content = ?, description = ?, category = ?, version = ?, updated_at = ? WHERE name = ?'
      ).bind(content, description || null, category || null, newVersion, ts, normalizedName).run();
      return { content: [{ type: 'text', text: `✅ Updated skill "${normalizedName}" to v${newVersion}` }] };
    } else {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO skills (id, name, description, content, category, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, normalizedName, description || null, content, category || null, version || '1.0', ts, ts).run();
      return { content: [{ type: 'text', text: `✅ Created skill "${normalizedName}" v${version || '1.0'}` }] };
    }
  });

  server.tool('delete_skill', {
    name: z.string().describe('Skill name to delete'),
  }, async ({ name }) => {
    const normalizedName = name.toLowerCase();
    const existing = await env.DB.prepare('SELECT id FROM skills WHERE name = ?').bind(normalizedName).first();
    
    if (!existing) return { content: [{ type: 'text', text: `Skill "${name}" not found.` }] };
    
    await env.DB.prepare('DELETE FROM skills WHERE name = ?').bind(normalizedName).run();
    return { content: [{ type: 'text', text: `🗑️ Deleted skill "${normalizedName}"` }] };
  });
}
