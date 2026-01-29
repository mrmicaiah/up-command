/**
 * UP Command Type Definitions
 */

export interface Env {
  DB: D1Database;
  USER_ID: string;
  TEAM: string;
  
  // OAuth secrets
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export interface ToolContext {
  env: Env;
  userId: string;
}

export interface User {
  user_id: string;
  name: string;
  settings: Record<string, unknown>;
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
  created_at: string;
  completed_at?: string;
}

export interface HandoffTask {
  id: string;
  instruction: string;
  context?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'claimed' | 'in_progress' | 'complete' | 'blocked';
  project_name?: string;
  created_by: string;
  claimed_by?: string;
  output_summary?: string;
  output_location?: 'github' | 'drive' | 'both' | 'local';
  files_created?: string[];
  worker_notes?: string;
  created_at: string;
  completed_at?: string;
}

export interface Message {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  read_at?: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  project_name?: string;
  thread_summary: string;
  full_recap: string;
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

export interface OAuthToken {
  user_id: string;
  service: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}