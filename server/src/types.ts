/**
 * UP Command Type Definitions
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ==================
// ENVIRONMENT
// ==================
export interface Env {
  DB: D1Database;
  USER_ID: string;
  TEAM: string;
  WORKER_NAME?: string;
  
  // OAuth secrets
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  
  // API keys
  DASHBOARD_API_KEY?: string;
  COURIER_API_KEY?: string;
  UP_BLOGS_API_KEY?: string;
  UP_BLOGS_ADMIN_KEY?: string;
  
  // Dynamic blog API keys (per-blog)
  [key: `BLOG_API_KEY_${string}`]: string | undefined;
}

// ==================
// TOOL CONTEXT
// ==================
export interface ToolContext {
  server: McpServer;
  env: Env;
  getCurrentUser: () => string;
  getTeammates: () => string[];
  getTeammate: () => string;
}

// ==================
// CORE ENTITIES
// ==================
export interface User {
  user_id: string;
  name: string;
  settings?: Record<string, unknown>;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  text: string;
  status: 'open' | 'done';
  priority: number;
  project?: string;
  category?: string;
  due_date?: string;
  notes?: string;
  is_active: boolean;
  recurrence?: string;
  snoozed_until?: string;
  created_at: string;
  completed_at?: string;
}

export interface Sprint {
  id: string;
  user_id: string;
  name: string;
  status: 'active' | 'completed' | 'abandoned';
  end_date: string;
  created_at: string;
  completed_at?: string;
}

export interface SprintObjective {
  id: string;
  sprint_id: string;
  statement: string;
  created_at: string;
}

export interface SprintTask {
  sprint_id: string;
  task_id: string;
  objective_id?: string;
  added_at: string;
}

// ==================
// HANDOFF SYSTEM
// ==================
export interface HandoffTask {
  id: string;
  instruction: string;
  context?: string;
  files_needed?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_complexity?: 'simple' | 'moderate' | 'complex';
  project_name?: string;
  parent_task_id?: string;
  status: 'pending' | 'claimed' | 'in_progress' | 'complete' | 'blocked';
  
  // Completion data
  output_summary?: string;
  output_location?: 'github' | 'drive' | 'both' | 'local';
  files_created?: string[];
  github_repo?: string;
  github_paths?: string[];
  drive_folder_id?: string;
  drive_file_ids?: string[];
  worker_notes?: string;
  blocked_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  claimed_at?: string;
  completed_at?: string;
}

// ==================
// TEAM & MESSAGING
// ==================
export interface Message {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  read_at?: string;
  created_at: string;
}

export interface TaskHandoff {
  id: string;
  task_id: string;
  from_user: string;
  to_user: string;
  reason?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// ==================
// TRACKING
// ==================
export interface CheckIn {
  id: string;
  user_id: string;
  project_name?: string;
  thread_summary: string;
  full_recap: string;
  logged: boolean;
  created_at: string;
}

export interface WorkLog {
  id: string;
  user_id: string;
  narrative: string;
  shipped: string[];
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  entry_type: 'freeform' | 'morning' | 'evening' | 'reflection' | 'braindump';
  mood?: string;
  energy?: number;
  created_at: string;
}

export interface ProgressLog {
  id: string;
  user_id: string;
  task_id?: string;
  description: string;
  minutes_spent?: number;
  created_at: string;
}

// ==================
// CONTENT & NOTES
// ==================
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category: string;
  status: 'new' | 'exploring' | 'parked' | 'done';
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  content: string;
  category?: string;
  version: string;
  created_at: string;
  updated_at?: string;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  photo_url?: string;
  email?: string;
  created_at: string;
}

// ==================
// INTEGRATIONS
// ==================
export interface OAuthToken {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  created_at: string;
}

export type GoogleService = 
  | 'google_drive'
  | 'gmail_personal'
  | 'gmail_company'
  | 'blogger_personal'
  | 'blogger_company'
  | 'google_contacts_personal'
  | 'google_contacts_company'
  | 'google_analytics';

export type OAuthProvider = GoogleService | 'github';
