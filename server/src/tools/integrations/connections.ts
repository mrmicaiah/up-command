/**
 * Service Connection Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { getValidToken, getGitHubToken, buildOAuthUrl, SERVICE_NAMES } from '../../oauth/index.js';

export function registerConnectionTools(server: McpServer, ctx: ToolContext): void {
  const { env, getCurrentUser } = ctx;

  server.tool('connection_status', {}, async () => {
    const userId = getCurrentUser();
    const driveToken = await getValidToken(env, userId, 'google_drive');
    const personalEmailToken = await getValidToken(env, userId, 'gmail_personal');
    const companyEmailToken = await getValidToken(env, userId, 'gmail_company');
    const bloggerPersonalToken = await getValidToken(env, userId, 'blogger_personal');
    const bloggerCompanyToken = await getValidToken(env, userId, 'blogger_company');
    const personalContactsToken = await getValidToken(env, userId, 'google_contacts_personal');
    const companyContactsToken = await getValidToken(env, userId, 'google_contacts_company');
    const analyticsToken = await getValidToken(env, userId, 'google_analytics');
    const githubToken = await getGitHubToken(env, userId);
    
    let status = '🔌 **Connection Status**\n\n';
    status += driveToken ? '✅ Google Drive: Connected\n' : '❌ Google Drive: Not connected\n';
    status += personalEmailToken ? '✅ Personal Email: Connected\n' : '❌ Personal Email: Not connected\n';
    status += companyEmailToken ? '✅ Company Email: Connected\n' : '❌ Company Email: Not connected\n';
    status += bloggerPersonalToken ? '✅ Personal Blogger: Connected\n' : '❌ Personal Blogger: Not connected\n';
    status += bloggerCompanyToken ? '✅ Company Blogger: Connected\n' : '❌ Company Blogger: Not connected\n';
    status += personalContactsToken ? '✅ Personal Contacts: Connected\n' : '❌ Personal Contacts: Not connected\n';
    status += companyContactsToken ? '✅ Company Contacts: Connected\n' : '❌ Company Contacts: Not connected\n';
    status += analyticsToken ? '✅ Google Analytics: Connected\n' : '❌ Google Analytics: Not connected\n';
    status += githubToken ? '✅ GitHub: Connected\n' : '❌ GitHub: Not connected\n';
    
    return { content: [{ type: 'text', text: status }] };
  });

  server.tool('connect_service', {
    service: z.enum([
      'google_drive',
      'gmail_personal',
      'gmail_company',
      'blogger_personal',
      'blogger_company',
      'google_contacts_personal',
      'google_contacts_company',
      'google_analytics',
      'github'
    ]).describe('Service to connect')
  }, async ({ service }) => {
    const userId = getCurrentUser();
    
    // Check if already connected
    if (service === 'github') {
      const token = await getGitHubToken(env, userId);
      if (token) return { content: [{ type: 'text', text: '✅ GitHub is already connected!' }] };
    } else {
      const token = await getValidToken(env, userId, service);
      if (token) return { content: [{ type: 'text', text: `✅ ${SERVICE_NAMES[service] || service} is already connected!` }] };
    }
    
    const workerName = env.WORKER_NAME || 'up-command';
    const workerUrl = `https://${workerName}.micaiah-tasks.workers.dev`;
    const url = buildOAuthUrl(env, userId, service, workerUrl);
    
    let note = '';
    if (service === 'blogger_personal') {
      note = '\n\n💡 **Tip:** Open this link in an incognito window to sign in with your personal Google account.';
    }
    if (service === 'google_analytics') {
      note = '\n\n📊 **Setup Required:**\n1. Make sure Google Analytics Data API is enabled\n2. Sign in with the account that has GA4 access\n3. After connecting, use `analytics_add_property` to add your property IDs';
    }
    
    return { content: [{ type: 'text', text: `🔗 Connect ${SERVICE_NAMES[service] || service}:\n\n${url}${note}` }] };
  });

  server.tool('disconnect_service', {
    service: z.enum([
      'google_drive',
      'gmail_personal',
      'gmail_company',
      'blogger_personal',
      'blogger_company',
      'google_contacts_personal',
      'google_contacts_company',
      'google_analytics',
      'github'
    ]).describe('Service to disconnect')
  }, async ({ service }) => {
    const userId = getCurrentUser();
    
    // Check if connected first
    let token;
    if (service === 'github') {
      token = await getGitHubToken(env, userId);
    } else {
      token = await getValidToken(env, userId, service);
    }
    
    if (!token) {
      return { content: [{ type: 'text', text: `⚠️ ${SERVICE_NAMES[service] || service} is not connected.` }] };
    }
    
    await env.DB.prepare('DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?').bind(userId, service).run();
    
    return { content: [{ type: 'text', text: `🔌 Disconnected ${SERVICE_NAMES[service] || service}.\n\nTo reconnect: \`connect_service ${service}\`` }] };
  });
}
