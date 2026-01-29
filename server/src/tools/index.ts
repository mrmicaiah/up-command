/**
 * Tool Registration Hub
 * Imports and registers all tool modules organized by category
 */

import type { ToolContext } from '../types.js';

// Tool module imports
import { registerContentTools } from './content/index.js';
import { registerSystemTools } from './system/index.js';

// Future imports (uncomment as implemented)
// import { registerHelmTools } from './helm/index.js';
// import { registerTeamTools } from './team/index.js';
// import { registerTrackingTools } from './tracking/index.js';
// import { registerIntegrationTools } from './integrations/index.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(ctx: ToolContext): void {
  const { server, getCurrentUser } = ctx;
  
  // ==================
  // CONTENT TOOLS
  // ==================
  // Blog, Authors
  registerContentTools(server, ctx);
  
  // ==================
  // SYSTEM TOOLS
  // ==================
  // Notes, Ideas, Skills
  registerSystemTools(server, ctx);
  
  // ==================
  // HELM TOOLS (Future)
  // ==================
  // registerHelmTools(server, ctx);
  
  // ==================
  // TEAM TOOLS (Future)
  // ==================
  // registerTeamTools(server, ctx);
  
  // ==================
  // TRACKING TOOLS (Future)
  // ==================
  // registerTrackingTools(server, ctx);
  
  // ==================
  // INTEGRATION TOOLS (Future)
  // ==================
  // registerIntegrationTools(server, ctx);
  
  console.log(`[UP Command] Tools registered for user: ${getCurrentUser()}`);
}

/**
 * Tool Categories Reference:
 * 
 * CONTENT (Blog, Authors, Email, Media)
 * - blog.ts: mb_list_posts, mb_get_post, mb_create_post, mb_update_post, mb_delete_post, mb_publish_post, mb_unpublish_post, mb_schedule_post
 * - authors.ts: author_list, author_get, author_create, author_update, author_delete
 * 
 * SYSTEM (Settings, Utilities)
 * - notes.ts: add_note, add_idea, list_ideas
 * - skills.ts: list_skills, get_skill, save_skill, delete_skill
 * 
 * HELM (Task Management) - Future
 * - tasks.ts: add_task, list_tasks, complete_task, update_task, delete_task, activate_task, deactivate_task
 * - sprints.ts: create_sprint, view_sprint, list_sprints, end_sprint, add_objective, pull_to_sprint
 * - routines.ts: good_morning, good_night, plan_week, set_focus
 * 
 * TEAM (Collaboration) - Future
 * - messages.ts: send_message, check_messages, message_history
 * - handoff.ts: handoff_create_task, handoff_view_queue, handoff_get_next_task, handoff_complete_task
 * 
 * TRACKING (Progress) - Future
 * - checkins.ts: add_checkin, list_checkins, checkin_history
 * - worklogs.ts: create_work_log, save_work_log, list_work_logs
 * - journal.ts: add_journal_entry, list_journal_entries, journal_insights
 * 
 * INTEGRATIONS (External Services) - Future
 * - drive.ts: search_drive, read_from_drive, save_to_drive, update_drive_file
 * - gmail.ts: check_inbox, read_email, send_email, search_email
 * - github.ts: github_list_repos, github_list_files, github_get_file, github_push_file
 * - blogger.ts: list_blogs, list_blog_posts, create_blog_post
 * - analytics.ts: analytics_report, analytics_realtime, analytics_top_content
 * - connections.ts: connect_service, disconnect_service, connection_status
 */
