/**
 * Tracking Tools - Work Sessions, Check-ins, Journals
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerTrackingTools(server: McpServer, ctx: ToolContext): void {
  // Check-ins
  // add_checkin
  // list_checkins
  // get_checkin
  // checkin_history
  // add_checkin_comment
  // list_checkin_comments
  
  // Work logs
  // create_work_log
  // save_work_log
  // get_work_log
  // list_work_logs
  // work_history
  
  // Journaling
  // add_journal_entry
  // list_journal_entries
  // view_journal_entry
  // update_journal_entry
  // delete_journal_entry
  // search_journal
  // journal_insights
  // journal_streak
  // configure_journal
  // link_journal_entry
  
  // Progress tracking
  // checkpoint
  // log_progress
  // analyze_patterns
  // get_insights
  // weekly_recap
  // end_of_day_recap
}