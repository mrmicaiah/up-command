/**
 * Google Contacts Integration Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { getValidToken, PEOPLE_API_URL } from '../../oauth/index.js';

export function registerContactsTools(server: McpServer, ctx: ToolContext): void {
  const { env, getCurrentUser } = ctx;

  server.tool('search_contacts', {
    query: z.string().describe('Name or email to search for'),
    account: z.enum(['personal', 'company']).optional().default('personal')
  }, async ({ query, account }) => {
    const provider = account === 'personal' ? 'google_contacts_personal' : 'google_contacts_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} contacts not connected. Run: connect_service ${provider}` }] };
    
    const resp = await fetch(
      `${PEOPLE_API_URL}/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations&pageSize=10`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    
    if (!resp.ok) {
      const error = await resp.text();
      return { content: [{ type: 'text', text: `⛔ Error searching contacts: ${error}` }] };
    }
    
    const data: any = await resp.json();
    if (!data.results?.length) return { content: [{ type: 'text', text: `📭 No contacts found for "${query}"` }] };
    
    let out = `👥 **Contacts matching "${query}"** (${data.results.length})\n\n`;
    
    for (const result of data.results) {
      const person = result.person;
      const name = person.names?.[0]?.displayName || '(no name)';
      const email = person.emailAddresses?.[0]?.value;
      const phone = person.phoneNumbers?.[0]?.value;
      const org = person.organizations?.[0]?.name;
      
      out += `• **${name}**\n`;
      if (email) out += `  📧 ${email}\n`;
      if (phone) out += `  📱 ${phone}\n`;
      if (org) out += `  🏢 ${org}\n`;
      out += '\n';
    }
    
    return { content: [{ type: 'text', text: out }] };
  });
}
