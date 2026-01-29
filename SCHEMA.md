# UP Command Database Schema

> Single source of truth for database structure

## Database Info

- **Name:** up-command-db
- **Type:** Cloudflare D1 (SQLite)
- **Shared:** Yes - all users share one database with user_id isolation

## Tables

### users

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT DEFAULT 'open',        -- 'open', 'done'
  priority INTEGER DEFAULT 3,         -- 1-5 (1=highest)
  project TEXT,
  category TEXT,
  due_date TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 0,
  parent_id TEXT,                     -- For subtasks
  recurrence TEXT,                    -- 'daily', 'weekly', etc.
  snoozed_until TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_active ON tasks(user_id, is_active);
```

### handoff_tasks

```sql
CREATE TABLE handoff_tasks (
  id TEXT PRIMARY KEY,
  instruction TEXT NOT NULL,
  context TEXT,
  priority TEXT DEFAULT 'normal',     -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'pending',      -- 'pending', 'claimed', 'in_progress', 'complete', 'blocked'
  project_name TEXT,
  estimated_complexity TEXT,          -- 'simple', 'moderate', 'complex'
  files_needed TEXT,                  -- JSON array
  created_by TEXT NOT NULL,
  claimed_by TEXT,
  output_summary TEXT,
  output_location TEXT,               -- 'github', 'drive', 'both', 'local'
  files_created TEXT,                 -- JSON array
  github_repo TEXT,
  github_paths TEXT,                  -- JSON array
  drive_folder_id TEXT,
  drive_file_ids TEXT,                -- JSON array
  worker_notes TEXT,
  blocked_reason TEXT,
  progress_notes TEXT,                -- JSON array of updates
  parent_task_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  claimed_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE INDEX idx_handoff_status ON handoff_tasks(status);
CREATE INDEX idx_handoff_project ON handoff_tasks(project_name);
CREATE INDEX idx_handoff_claimed ON handoff_tasks(claimed_by);
```

### messages

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  content TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (from_user) REFERENCES users(user_id),
  FOREIGN KEY (to_user) REFERENCES users(user_id)
);

CREATE INDEX idx_messages_to ON messages(to_user, read_at);
```

### check_ins

```sql
CREATE TABLE check_ins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_name TEXT,
  thread_summary TEXT NOT NULL,       -- ~280 chars, casual tone
  full_recap TEXT NOT NULL,           -- Detailed markdown
  logged INTEGER DEFAULT 0,           -- Added to work log
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_checkins_user ON check_ins(user_id);
CREATE INDEX idx_checkins_project ON check_ins(project_name);
```

### journal_entries

```sql
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  entry_type TEXT DEFAULT 'freeform', -- 'freeform', 'morning', 'evening', 'reflection', 'braindump'
  mood TEXT,
  energy INTEGER,                     -- 1-10
  entities TEXT,                      -- JSON: extracted people, places, things
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_journal_user ON journal_entries(user_id);
```

### sprints

```sql
CREATE TABLE sprints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT DEFAULT (date('now')),
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'active',       -- 'active', 'completed', 'abandoned'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### sprint_objectives

```sql
CREATE TABLE sprint_objectives (
  id TEXT PRIMARY KEY,
  sprint_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sprint_id) REFERENCES sprints(id)
);
```

### sprint_tasks

```sql
CREATE TABLE sprint_tasks (
  sprint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  objective_id TEXT,
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (sprint_id, task_id),
  FOREIGN KEY (sprint_id) REFERENCES sprints(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (objective_id) REFERENCES sprint_objectives(id)
);
```

### oauth_tokens

```sql
CREATE TABLE oauth_tokens (
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  scopes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, service)
);
```

### analytics_properties

```sql
CREATE TABLE analytics_properties (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL,
  blog_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### email_lists

```sql
CREATE TABLE email_lists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  notify_email TEXT,
  campaign_template_id TEXT,
  sequence_template_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE UNIQUE INDEX idx_list_slug ON email_lists(slug);
```

### email_subscribers

```sql
CREATE TABLE email_subscribers (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active',       -- 'active', 'unsubscribed', 'bounced'
  tags TEXT,                          -- JSON array
  custom_fields TEXT,                 -- JSON object
  subscribed_at TEXT DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  FOREIGN KEY (list_id) REFERENCES email_lists(id)
);

CREATE UNIQUE INDEX idx_subscriber_email ON email_subscribers(list_id, email);
```

### email_campaigns

```sql
CREATE TABLE email_campaigns (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  title TEXT,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  status TEXT DEFAULT 'draft',        -- 'draft', 'scheduled', 'sent'
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (list_id) REFERENCES email_lists(id)
);
```

### email_sequences

```sql
CREATE TABLE email_sequences (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'subscribe', -- 'subscribe', 'manual', 'tag'
  trigger_value TEXT,
  status TEXT DEFAULT 'draft',        -- 'draft', 'active', 'paused'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (list_id) REFERENCES email_lists(id)
);
```

### email_sequence_steps

```sql
CREATE TABLE email_sequence_steps (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  delay_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sequence_id) REFERENCES email_sequences(id)
);
```

### email_sequence_enrollments

```sql
CREATE TABLE email_sequence_enrollments (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',       -- 'active', 'completed', 'cancelled'
  next_send_at TEXT,
  enrolled_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (sequence_id) REFERENCES email_sequences(id),
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id)
);
```

### email_templates

```sql
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  list_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### email_sends

```sql
CREATE TABLE email_sends (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  sequence_id TEXT,
  step_id TEXT,
  subscriber_id TEXT NOT NULL,
  message_id TEXT,                    -- From email provider
  status TEXT DEFAULT 'sent',         -- 'sent', 'delivered', 'bounced', 'complained'
  opened_at TEXT,
  clicked_at TEXT,
  sent_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id)
);

CREATE INDEX idx_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_sends_sequence ON email_sends(sequence_id);
```

### skills

```sql
CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT,
  category TEXT,
  content TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### notes

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'General',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### ideas

```sql
CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'Unsorted',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### work_sessions

```sql
CREATE TABLE work_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### work_logs

```sql
CREATE TABLE work_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  narrative TEXT NOT NULL,
  shipped TEXT,                       -- JSON array
  check_in_ids TEXT,                  -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### launch_docs

```sql
CREATE TABLE launch_docs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,             -- 'engine', 'playbook', 'operations'
  description TEXT,
  content TEXT NOT NULL,              -- Markdown with phases/checklists
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### launches

```sql
CREATE TABLE launches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  genre TEXT,
  target_launch_date TEXT,
  current_phase TEXT DEFAULT 'planning',
  status TEXT DEFAULT 'active',
  shared INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### launch_checklist_items

```sql
CREATE TABLE launch_checklist_items (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  section TEXT,
  item_text TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  tags TEXT,                          -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (launch_id) REFERENCES launches(id)
);
```

### authors

```sql
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  bio TEXT,
  email TEXT,
  photo_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE UNIQUE INDEX idx_author_slug ON authors(slug);
```

## Migration Notes

### Adding New Tables

1. Add the CREATE TABLE statement to this file
2. Create a migration file: `migrations/XXX_description.sql`
3. Run: `npx wrangler d1 execute up-command-db --remote --file=migrations/XXX.sql`
4. Delete the migration file after success

### Adding Columns

SQLite requires individual ALTER statements:

```sql
ALTER TABLE table_name ADD COLUMN new_column TEXT;
```

### User Isolation

All user-specific tables must have:
- `user_id TEXT NOT NULL`
- `FOREIGN KEY (user_id) REFERENCES users(user_id)`
- Index on `user_id` for queries

Always filter by `user_id` in queries to ensure data isolation.