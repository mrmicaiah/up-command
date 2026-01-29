/**
 * System Tools - Settings, Connections, Admin utilities
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { registerNoteTools } from './notes.js';
import { registerSkillTools } from './skills.js';

export function registerSystemTools(server: McpServer, ctx: ToolContext): void {
  // Notes & Ideas
  registerNoteTools(server, ctx);
  
  // Skills management
  registerSkillTools(server, ctx);
  
  // Future: Connection management
  // connect_service, disconnect_service, connection_status
  
  // Future: User info
  // who_am_i, get_stats, get_challenges
  
  // Future: Launch docs
  // list_launch_docs, view_launch_doc, add_launch_doc
}
