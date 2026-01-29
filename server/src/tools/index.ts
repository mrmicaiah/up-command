/**
 * Tool Registration Hub
 * Imports and registers all tool modules organized by category
 */

import type { ToolContext } from '../types.js';

// Tool module imports (uncomment as implemented)
// Helm - Task management, sprints, daily workflow
// import { registerTaskTools } from './helm/tasks.js';
// import { registerSprintTools } from './helm/sprints.js';
// import { registerRoutineTools } from './helm/routines.js';

// Team - Collaboration, messaging, handoffs
// import { registerMessageTools } from './team/messages.js';
// import { registerHandoffTools } from './team/handoff.js';

// Tracking - Check-ins, work logs, journal
// import { registerCheckinTools } from './tracking/checkins.js';
// import { registerWorkLogTools } from './tracking/worklogs.js';
// import { registerJournalTools } from './tracking/journal.js';

// Content - Notes, ideas, skills
// import { registerNoteTools } from './content/notes.js';
// import { registerIdeaTools } from './content/ideas.js';
// import { registerSkillTools } from './content/skills.js';

// Integrations - Google, GitHub, external services
// import { registerDriveTools } from './integrations/drive.js';
// import { registerGmailTools } from './integrations/gmail.js';
// import { registerGitHubTools } from './integrations/github.js';
// import { registerBloggerTools } from './integrations/blogger.js';
// import { registerAnalyticsTools } from './integrations/analytics.js';

// System - Connections, settings, utilities
// import { registerConnectionTools } from './system/connections.js';
// import { registerSettingsTools } from './system/settings.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(ctx: ToolContext): void {
  const { getCurrentUser } = ctx;
  
  // ==================
  // HELM TOOLS
  // ==================
  // registerTaskTools(ctx);
  // registerSprintTools(ctx);
  // registerRoutineTools(ctx);
  
  // ==================
  // TEAM TOOLS
  // ==================
  // registerMessageTools(ctx);
  // registerHandoffTools(ctx);
  
  // ==================
  // TRACKING TOOLS
  // ==================
  // registerCheckinTools(ctx);
  // registerWorkLogTools(ctx);
  // registerJournalTools(ctx);
  
  // ==================
  // CONTENT TOOLS
  // ==================
  // registerNoteTools(ctx);
  // registerIdeaTools(ctx);
  // registerSkillTools(ctx);
  
  // ==================
  // INTEGRATION TOOLS
  // ==================
  // registerDriveTools(ctx);
  // registerGmailTools(ctx);
  // registerGitHubTools(ctx);
  // registerBloggerTools(ctx);
  // registerAnalyticsTools(ctx);
  
  // ==================
  // SYSTEM TOOLS
  // ==================
  // registerConnectionTools(ctx);
  // registerSettingsTools(ctx);
  
  console.log(`[UP Command] Tools registered for user: ${getCurrentUser()}`);
}

/**
 * Tool Categories for reference:
 * 
 * HELM (Task Management)
 * - tasks.ts: add_task, list_tasks, complete_task, update_task, delete_task, activate_task, deactivate_task
 * - sprints.ts: create_sprint, view_sprint, list_sprints, end_sprint, add_objective, pull_to_sprint
 * - routines.ts: good_morning, good_night, plan_week, set_focus
 * 
 * TEAM (Collaboration)
 * - messages.ts: send_message, check_messages, message_history
 * - handoff.ts: handoff_create_task, handoff_view_queue, handoff_get_next_task, handoff_complete_task, etc.
 * 
 * TRACKING (Progress)
 * - checkins.ts: add_checkin, list_checkins, checkin_history
 * - worklogs.ts: create_work_log, save_work_log, list_work_logs, get_work_log
 * - journal.ts: add_journal_entry, list_journal_entries, journal_insights, journal_streak
 * 
 * CONTENT (Knowledge)
 * - notes.ts: add_note, list_notes, search_notes
 * - ideas.ts: add_idea, list_ideas, update_idea
 * - skills.ts: save_skill, get_skill, list_skills, delete_skill
 * 
 * INTEGRATIONS (External Services)
 * - drive.ts: search_drive, read_from_drive, save_to_drive, update_drive_file, list_drive_folders
 * - gmail.ts: check_inbox, read_email, send_email, search_email
 * - github.ts: github_list_repos, github_list_files, github_get_file, github_push_file
 * - blogger.ts: list_blogs, list_blog_posts, create_blog_post, update_blog_post
 * - analytics.ts: analytics_report, analytics_realtime, analytics_top_content
 * 
 * SYSTEM (Infrastructure)
 * - connections.ts: connect_service, disconnect_service, connection_status
 * - settings.ts: who_am_i, get_stats, configure_settings
 */
