/**
 * Integration Tools - External Services
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

import { registerConnectionTools } from './connections.js';
import { registerDriveTools } from './drive.js';
import { registerEmailTools } from './email.js';
import { registerGitHubTools } from './github.js';
import { registerBloggerTools } from './blogger.js';
import { registerContactsTools } from './contacts.js';
import { registerCloudinaryTools } from './cloudinary.js';
import { registerAnalyticsTools } from './analytics.js';

export function registerIntegrationTools(server: McpServer, ctx: ToolContext): void {
  // Connection management
  registerConnectionTools(server, ctx);
  
  // Google Drive
  registerDriveTools(server, ctx);
  
  // Gmail
  registerEmailTools(server, ctx);
  
  // GitHub
  registerGitHubTools(server, ctx);
  
  // Blogger
  registerBloggerTools(server, ctx);
  
  // Google Contacts
  registerContactsTools(server, ctx);
  
  // Cloudinary
  registerCloudinaryTools(server, ctx);
  
  // Google Analytics
  registerAnalyticsTools(server, ctx);
}
