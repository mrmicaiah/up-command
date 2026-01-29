# Handoff System Documentation

The Handoff System is an asynchronous task management workflow that enables effective delegation between different Claude chat sessions. Think of it as a kanban board where one chat creates work, another executes it, and they communicate through a shared queue.

---

## Overview

### What is the Handoff System?

The Handoff System solves a fundamental challenge: Claude conversations are isolated. What you discuss in one chat doesn't carry over to another. But sometimes you want to:

- Create a batch of tasks in one session, then execute them later
- Have one "planning" conversation and separate "doing" conversations
- Delegate work to a chat session optimized for execution
- Track work across multiple sessions over days or weeks

The Handoff System makes this possible through a **dual-chat workflow**:

| Role | Purpose | Primary Activity |
|------|---------|------------------|
| **Manager Chat** | Plans and orchestrates | Creates tasks, monitors progress, reviews results |
| **Worker Chat** | Executes and delivers | Claims tasks, does the work, reports completion |

Both roles access the same queue through MCP tools, enabling asynchronous collaboration between chat sessions.

---

## Core Concepts

### Manager Chat

The Manager creates work and monitors progress. This is where you do project planning, break down complex initiatives into discrete tasks, and review what's been completed.

Manager responsibilities:
- Break projects into actionable tasks
- Write clear instructions with sufficient context
- Set appropriate priorities
- Monitor queue status
- Handle blocked tasks by providing missing information
- Review completed work and create follow-ups

### Worker Chat

The Worker executes tasks. This session is optimized for doing—claiming a task, completing it, and reporting the results.

Worker responsibilities:
- Claim the next available task
- Execute the work as instructed
- Save outputs to GitHub or Drive
- Report completion with detailed output information
- Block tasks when missing required information

### Projects

Projects group related tasks together. Use consistent `project_name` values to:
- Filter the queue to see only relevant tasks
- Get project-level status reports
- Track completion percentages
- Review all results for a project at once

Examples: "Proverbs Library Launch", "UP Command Center", "Q1 Blog Content"

### Task Lifecycle

Every task moves through these states:

```
pending → claimed → in_progress → complete
                 ↘ blocked ↗
```

| Status | Meaning |
|--------|---------|
| `pending` | Task created, waiting for a Worker to claim |
| `claimed` | Worker has taken the task, not yet started |
| `in_progress` | Worker is actively working on it |
| `complete` | Work finished, outputs documented |
| `blocked` | Worker cannot proceed, needs Manager input |

---

## Manager Workflow

### Creating Tasks

Use `handoff_create_task` to add work to the queue:

```
handoff_create_task
├── instruction (required) - What needs to be done
├── context - Background, requirements, constraints
├── files_needed - File references the Worker might need
├── priority - "low" | "normal" | "high" | "urgent"
├── estimated_complexity - "simple" | "moderate" | "complex"
├── project_name - Group related tasks
└── parent_task_id - For subtasks
```

**Example:**
```
Create task:
- instruction: "Build responsive landing page for the Proverbs Quiz with email signup"
- priority: high
- project_name: "Proverbs Library Launch"
- context: "Use Tailwind CSS, mobile-first design. Include: hero section with quiz preview, email signup form connected to Courier API, testimonial section, FAQ accordion"
- estimated_complexity: moderate
```

### Viewing the Queue

Use `handoff_view_queue` to see tasks:

```
handoff_view_queue
├── status - Filter: pending, claimed, in_progress, complete, blocked
├── project_name - Filter by project
├── priority - Filter by priority level
└── limit - Max results (default: 20)
```

**Examples:**
- See all pending tasks: `handoff_view_queue` with status "pending"
- See blocked tasks: `handoff_view_queue` with status "blocked"
- See project tasks: `handoff_view_queue` with project_name "UP Command Center"

### Checking Project Status

Use `handoff_project_status` for a comprehensive overview:

```
handoff_project_status
└── project_name (required) - Project to check
```

Returns:
- Completion percentage
- Task counts by status (pending, claimed, in_progress, complete, blocked)
- List of blocked tasks with reasons

### Reviewing Results

Use `handoff_get_results` to see completed work:

```
handoff_get_results
├── task_id - Get specific task results
├── project_name - Get all results for a project
└── since - ISO date to get results since
```

Results include:
- `output_summary`: What was accomplished
- `output_location`: Where files are stored (github/drive/both/local)
- `files_created`: List of created files
- `github_repo` & `github_paths`: Repository and file paths
- `drive_folder_id` & `drive_file_ids`: Drive locations
- `worker_notes`: Worker's observations and recommendations

### Updating Tasks

Use `handoff_update_task` to modify existing tasks:

```
handoff_update_task
├── task_id (required) - Task to update
├── instruction - New/updated instructions
├── context - Add or update context
├── priority - Change priority level
└── status - Manually change status (use sparingly)
```

Common uses:
- Adding missing context when a task is blocked
- Elevating priority for urgent work
- Clarifying instructions based on Worker questions

---

## Worker Workflow

### Claiming Tasks

Use `handoff_get_next_task` to claim the next available task:

```
handoff_get_next_task
├── priority_filter - Only claim "high" | "urgent" tasks
└── project_name - Only claim from specific project
```

The system automatically:
- Selects highest priority pending task (urgent → high → normal → low)
- Within same priority, picks oldest task first
- Updates status to "claimed"
- Returns full task details

### Getting Task Details

Use `handoff_get_task` to retrieve a specific task:

```
handoff_get_task
└── task_id (required) - The task ID
```

Useful when you know which task you want or need to reference task details.

### Updating Progress

Use `handoff_update_progress` to signal you're actively working:

```
handoff_update_progress
├── task_id (required) - Task you're working on
└── notes (required) - Progress update
```

This changes status to "in_progress" and logs your notes.

### Completing Tasks

Use `handoff_complete_task` when finished:

```
handoff_complete_task
├── task_id (required) - Task to complete
├── output_summary (required) - What you accomplished
├── output_location (required) - "github" | "drive" | "both" | "local"
├── files_created - List of files created
├── github_repo - Repository name
├── github_paths - File paths in repo
├── drive_folder_id - Google Drive folder ID
├── drive_file_ids - Array of Drive file IDs
└── worker_notes - Commentary, observations, recommendations
```

**Example:**
```
Complete task TASK-abc123:
- output_summary: "Created responsive landing page with hero section, email signup, quiz preview, and FAQ accordion"
- output_location: github
- files_created: ["index.html", "styles.css", "app.js"]
- github_repo: "mrmicaiah/proverbs-library"
- github_paths: ["landing/index.html", "landing/styles.css", "landing/app.js"]
- worker_notes: "Used Tailwind CDN for styling. Form submits to Courier API. Tested on mobile and desktop viewports."
```

### Blocking Tasks

Use `handoff_block_task` when you can't proceed:

```
handoff_block_task
├── task_id (required) - Task that's blocked
└── reason (required) - Clear explanation of what's missing
```

**Example:**
```
Block task TASK-abc123:
- reason: "Missing brand style guide. Need: logo files, brand colors (hex values), and typography specifications."
```

The Manager will see blocked tasks in `handoff_view_queue` and can use `handoff_update_task` to provide the missing information.

### Viewing Your Tasks

Use `handoff_my_tasks` to see tasks you've claimed:

```
handoff_my_tasks
```

Returns all tasks with status "claimed" or "in_progress" assigned to you.

---

## Best Practices

### For Managers

**Write Clear Instructions**
- Be specific: "Create landing page" → "Create landing page with hero section, email signup, and social proof"
- Include acceptance criteria when possible
- Specify technologies, frameworks, or constraints

**Provide Rich Context**
- Background on why the task matters
- Design requirements or references
- File locations the Worker will need
- Dependencies on other tasks

**Set Appropriate Priorities**
- `urgent`: Blocking other work, needs immediate attention
- `high`: Important, should be done soon
- `normal`: Standard work, no special urgency
- `low`: Nice to have, can wait

**Respond to Blocked Tasks Quickly**
- Check `handoff_view_queue` with status "blocked" regularly
- Read the `blocked_reason` carefully
- Use `handoff_update_task` to add missing context
- Consider if the instructions need rewriting

**Review Results Thoroughly**
- Check `output_summary` matches expectations
- Verify files are in the right location
- Read `worker_notes` for important observations
- Create follow-up tasks if needed

### For Workers

**Read Instructions Carefully**
- Understand the full scope before starting
- Note any context or constraints
- Check `files_needed` for required references

**Claim One Task at a Time**
- Focus on completing current work before claiming more
- Use `handoff_my_tasks` to track what you have

**Save Work to GitHub/Drive Immediately**
- Don't keep outputs in local-only locations
- Document exactly where files are stored
- Use consistent folder structures

**Block Proactively**
- If something is unclear, block early with specific questions
- Don't guess—better to ask than redo work
- Provide enough detail for Manager to help

**Document Thoroughly When Completing**
- Detailed `output_summary` of what was done
- Complete `files_created` list
- Accurate paths/IDs for all outputs
- Thoughtful `worker_notes` with observations

---

## Examples

### Example 1: Creating a Project

**Manager session:**

```
"Let's build out the UP Command Center. I'll create the initial tasks."

Create task:
- instruction: "Create the up-command GitHub repository with project structure"
- priority: high
- project_name: "UP Command Center"
- context: "Initialize with: /dashboard (frontend), /server (MCP worker), /docs, package.json, README"
- estimated_complexity: simple

Create task:
- instruction: "Build the shared design system (CSS variables, typography, base styles)"
- priority: high  
- project_name: "UP Command Center"
- context: "Create reusable CSS foundation. Include: color palette (dark theme), typography scale, spacing system, component primitives"
- estimated_complexity: moderate

Create task:
- instruction: "Build the shared navigation component"
- priority: high
- project_name: "UP Command Center"
- context: "Sidebar navigation that works across all pages. Include: logo, nav links (Helm, Thread, Courier, Analytics), user indicator, collapse toggle"
- estimated_complexity: moderate

Check project status for "UP Command Center"
```

### Example 2: Worker Claiming and Completing

**Worker session:**

```
"I'll work on the UP Command Center project."

Get next task for project "UP Command Center"

→ Claims: "Create the up-command GitHub repository with project structure"

[Worker creates the repo, sets up folder structure]

Complete task TASK-780037c6-a:
- output_summary: "Created up-command repository with complete project structure: /dashboard for frontend, /server for MCP worker, /docs for documentation. Added package.json with workspace config, README with project overview."
- output_location: github
- files_created: ["package.json", "README.md", ".gitignore"]
- github_repo: "mrmicaiah/up-command"
- github_paths: ["package.json", "README.md", "dashboard/", "server/", "docs/"]
- worker_notes: "Set up as npm workspace for monorepo management. Both dashboard and server can have independent dependencies. Ready for next phase."
```

### Example 3: Handling a Blocked Task

**Worker session:**

```
Get next task

→ Claims: "Design social media graphics for launch"

[Worker reads instructions, realizes something is missing]

Block task TASK-xyz789:
- reason: "Need brand assets to proceed: 1) Logo files (SVG preferred), 2) Brand color palette (hex codes), 3) Approved fonts or typography guidelines. Please add these to the Drive folder or provide links."
```

**Manager session (later):**

```
View queue with status "blocked"

→ Sees TASK-xyz789 is blocked, reads reason

Update task TASK-xyz789:
- context: "Brand assets added to Drive folder '1abc123'. Logo: logo-dark.svg and logo-light.svg. Colors: Primary #6366f1, Secondary #8b5cf6, Background #0f172a, Text #e2e8f0. Font: Inter (Google Fonts)."
- status: pending
```

**Worker session (next day):**

```
Get next task

→ Claims TASK-xyz789 again, now with brand assets context

[Worker completes the graphics]

Complete task TASK-xyz789:
- output_summary: "Created 3 social media graphics for Instagram/Facebook: quote card 1 (Proverbs 3:5-6), quote card 2 (Proverbs 16:9), quote card 3 (Proverbs 22:6). All 1080x1080px, brand colors applied."
- output_location: drive
- files_created: ["quote-card-1.png", "quote-card-2.png", "quote-card-3.png"]
- drive_folder_id: "1abc123"
- drive_file_ids: ["file1", "file2", "file3"]
- worker_notes: "Used Inter Bold for quotes, Inter Regular for attribution. Left space at bottom for platform-specific text if needed."
```

### Example 4: Reviewing Project Results

**Manager session:**

```
Get project status for "Proverbs Library Launch"

→ Shows: 65% complete (13/20 tasks)
   Pending: 3, In Progress: 2, Complete: 13, Blocked: 2

View queue for "Proverbs Library Launch" with status "blocked"

→ Shows 2 blocked tasks with reasons

Get results for project "Proverbs Library Launch"

→ Returns all 13 completed tasks with output locations, file lists, and worker notes

[Manager reviews, identifies follow-up work needed]

Create task:
- instruction: "Add mobile hamburger menu to landing page"
- priority: normal
- project_name: "Proverbs Library Launch"
- context: "Noticed navigation doesn't collapse on mobile. Add hamburger menu that expands to full-screen nav on tap."
```

---

## Database Schema

The Handoff System uses the `handoff_queue` table:

```sql
CREATE TABLE handoff_queue (
  id TEXT PRIMARY KEY,              -- TASK-xxxxxxxxxx
  instruction TEXT NOT NULL,        -- What needs to be done
  context TEXT,                     -- Additional requirements
  files_needed TEXT,                -- JSON array of file references
  priority TEXT DEFAULT 'normal',   -- low/normal/high/urgent
  estimated_complexity TEXT,        -- simple/moderate/complex
  project_name TEXT,                -- Group related tasks
  parent_task_id TEXT,              -- For subtasks
  status TEXT DEFAULT 'pending',    -- pending/claimed/in_progress/complete/blocked
  
  -- Timestamps
  created_at TEXT,
  updated_at TEXT,
  claimed_at TEXT,
  completed_at TEXT,
  
  -- Completion data
  output_summary TEXT,
  output_location TEXT,             -- github/drive/both/local
  files_created TEXT,               -- JSON array
  github_repo TEXT,
  github_paths TEXT,                -- JSON array
  drive_folder_id TEXT,
  drive_file_ids TEXT,              -- JSON array
  worker_notes TEXT,
  blocked_reason TEXT
);
```

---

## Quick Reference

### Manager Tools
| Tool | Purpose |
|------|---------|
| `handoff_create_task` | Create new task in queue |
| `handoff_view_queue` | View tasks with filtering |
| `handoff_get_results` | Get completed task details |
| `handoff_project_status` | Get project overview |
| `handoff_update_task` | Modify existing task |

### Worker Tools
| Tool | Purpose |
|------|---------|
| `handoff_get_next_task` | Claim next available task |
| `handoff_get_task` | Get specific task details |
| `handoff_update_progress` | Signal active work |
| `handoff_complete_task` | Mark task done with outputs |
| `handoff_block_task` | Flag task as blocked |
| `handoff_my_tasks` | View your claimed tasks |

### Status Flow
```
pending → claimed → in_progress → complete
                 ↘ blocked ↗
```

### Priority Levels
- `urgent`: Blocking other work
- `high`: Important, do soon
- `normal`: Standard work
- `low`: Can wait