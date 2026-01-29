/**
 * Tool Registration Hub
 * Imports and registers all tool modules
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';

// Import tool modules
// import { registerHelmTools } from './helm/index.js';
// import { registerTeamTools } from './team/index.js';
// import { registerTrackingTools } from './tracking/index.js';
// import { registerContentTools } from './content/index.js';
// import { registerIntegrationTools } from './integrations/index.js';
// import { registerSystemTools } from './system/index.js';

export function registerAllTools(server: McpServer, ctx: ToolContext): void {
  // TODO: Uncomment as modules are implemented
  // registerHelmTools(server, ctx);
  // registerTeamTools(server, ctx);
  // registerTrackingTools(server, ctx);
  // registerContentTools(server, ctx);
  // registerIntegrationTools(server, ctx);
  // registerSystemTools(server, ctx);
  
  console.log('Tools registered for user:', ctx.userId);
}