/**
 * Tracking Tools - Work Sessions, Check-ins, Journals
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

import { registerCheckinTools } from './checkins.js';
import { registerCheckinCommentTools } from './checkin-comments.js';
import { registerWorkLogTools } from './work-logs.js';
import { registerProgressTools } from './progress.js';
import { 
  registerJournalEntryTools, 
  registerJournalInsightTools, 
  registerJournalConfigTools 
} from './journal/index.js';

export function registerTrackingTools(server: McpServer, ctx: ToolContext): void {
  // Check-ins
  registerCheckinTools(server, ctx);
  registerCheckinCommentTools(server, ctx);
  
  // Work logs
  registerWorkLogTools(server, ctx);
  
  // Journaling
  registerJournalEntryTools(server, ctx);
  registerJournalInsightTools(server, ctx);
  registerJournalConfigTools(server, ctx);
  
  // Progress tracking
  registerProgressTools(server, ctx);
}
