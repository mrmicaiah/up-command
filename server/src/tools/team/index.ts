/**
 * Team Tools - Collaboration and Handoffs
 * 
 * Submodules:
 * - messaging.ts         Direct messages between teammates
 * - collaboration.ts     Team overview and viewing
 * - handoffs-simple.ts   Quick task transfers
 * - handoff-queue/       Full project management queue
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

import { registerMessaging } from './messaging.js';
import { registerCollaboration } from './collaboration.js';
import { registerSimpleHandoffs } from './handoffs-simple.js';
import { registerHandoffManager, registerHandoffWorker } from './handoff-queue/index.js';

export function registerTeamTools(server: McpServer, ctx: ToolContext): void {
  // Messaging
  registerMessaging(server, ctx);

  // Collaboration
  registerCollaboration(server, ctx);

  // Simple handoffs (quick transfers)
  registerSimpleHandoffs(server, ctx);

  // Handoff queue system (full project management)
  registerHandoffManager(server, ctx);
  registerHandoffWorker(server, ctx);

  console.log('[Team] All tools registered');
}
