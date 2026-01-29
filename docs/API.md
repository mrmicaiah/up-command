# UP Command API Reference

Base URL: `https://up-command.micaiah-tasks.workers.dev`

## Authentication

All requests require the `X-User-Id` header:

```
X-User-Id: micaiah
```

---

## Tasks

### List Tasks

```
GET /api/tasks
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `status` | string | `open`, `done`, or `all` (default: `open`) |
| `category` | string | Filter by category |
| `project` | string | Filter by project |
| `is_active` | boolean | Filter active tasks only |
| `is_recurring` | boolean | Filter recurring tasks only |
| `has_due_date` | boolean | Filter tasks with due dates |
| `limit` | number | Max results (default: 50) |

**Response:**

```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "text": "Review pull requests",
      "status": "open",
      "priority": 2,
      "category": "Development",
      "project": "UP Command",
      "due_date": "2026-01-30",
      "notes": "Focus on the API changes",
      "is_active": 1,
      "recurrence": null,
      "created_at": "2026-01-28T10:00:00Z"
    }
  ]
}
```

---

### Get Task

```
GET /api/tasks/:id
```

**Response:**

```json
{
  "task": {
    "id": "task_abc123",
    "text": "Review pull requests",
    "status": "open",
    "priority": 2,
    "category": "Development",
    "project": "UP Command",
    "due_date": "2026-01-30",
    "notes": "Focus on the API changes",
    "is_active": 1,
    "recurrence": null,
    "created_at": "2026-01-28T10:00:00Z",
    "completed_at": null
  }
}
```

---

### Create Task

```
POST /api/tasks
```

**Body:**

```json
{
  "text": "Review pull requests",
  "priority": 2,
  "category": "Development",
  "project": "UP Command",
  "due_date": "2026-01-30",
  "notes": "Focus on the API changes",
  "is_active": 0,
  "recurrence": null
}
```

**Response:**

```json
{
  "task": {
    "id": "task_abc123",
    "text": "Review pull requests",
    ...
  }
}
```

---

### Update Task

```
PUT /api/tasks/:id
```

**Body:** (all fields optional)

```json
{
  "text": "Updated task text",
  "priority": 1,
  "category": "Urgent",
  "due_date": "2026-01-29",
  "notes": "Updated notes",
  "is_active": 1
}
```

**Response:**

```json
{
  "task": { ... }
}
```

---

### Delete Task

```
DELETE /api/tasks/:id
```

**Response:**

```json
{
  "success": true
}
```

---

### Complete Task

```
POST /api/tasks/:id/complete
```

**Response:**

```json
{
  "task": {
    "id": "task_abc123",
    "status": "done",
    "completed_at": "2026-01-28T15:30:00Z",
    ...
  }
}
```

---

### Activate Task

```
POST /api/tasks/:id/activate
```

Adds task to the active list.

**Response:**

```json
{
  "task": {
    "id": "task_abc123",
    "is_active": 1,
    ...
  }
}
```

---

### Deactivate Task

```
POST /api/tasks/:id/deactivate
```

**Response:**

```json
{
  "task": {
    "id": "task_abc123",
    "is_active": 0,
    ...
  }
}
```

---

### Snooze Task

```
POST /api/tasks/:id/snooze
```

**Body:**

```json
{
  "until": "2026-02-01"
}
```

**Response:**

```json
{
  "task": {
    "id": "task_abc123",
    "snoozed_until": "2026-02-01",
    ...
  }
}
```

---

## Sprints

### List Sprints

```
GET /api/sprints
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `status` | string | `active`, `completed`, `abandoned`, or `all` |

**Response:**

```json
{
  "sprints": [
    {
      "id": "sprint_abc123",
      "name": "January Sprint",
      "start_date": "2026-01-20",
      "end_date": "2026-02-03",
      "status": "active",
      "created_at": "2026-01-20T08:00:00Z"
    }
  ]
}
```

---

### Get Current Sprint

```
GET /api/sprints/current
```

Returns the active sprint with objectives and tasks.

**Response:**

```json
{
  "sprint": {
    "id": "sprint_abc123",
    "name": "January Sprint",
    "start_date": "2026-01-20",
    "end_date": "2026-02-03",
    "status": "active"
  },
  "objectives": [
    {
      "id": "obj_123",
      "statement": "Launch UP Command dashboard",
      "sprint_id": "sprint_abc123"
    }
  ],
  "tasks": [
    {
      "id": "task_abc",
      "text": "Build home page",
      "status": "done",
      "objective_id": "obj_123"
    }
  ]
}
```

---

### Get Sprint

```
GET /api/sprints/:id
```

**Response:**

```json
{
  "sprint": { ... },
  "objectives": [ ... ],
  "tasks": [ ... ]
}
```

---

### Create Sprint

```
POST /api/sprints
```

**Body:**

```json
{
  "name": "February Sprint",
  "end_date": "2026-02-14"
}
```

**Response:**

```json
{
  "sprint": {
    "id": "sprint_def456",
    "name": "February Sprint",
    "start_date": "2026-01-29",
    "end_date": "2026-02-14",
    "status": "active"
  }
}
```

---

### Update Sprint

```
PUT /api/sprints/:id
```

**Body:**

```json
{
  "name": "Updated Sprint Name",
  "end_date": "2026-02-20",
  "status": "completed"
}
```

---

### End Sprint

```
POST /api/sprints/:id/end
```

**Body:**

```json
{
  "status": "completed"
}
```

Status can be `completed` or `abandoned`.

---

### Add Objective

```
POST /api/sprints/:id/objectives
```

**Body:**

```json
{
  "statement": "Ship the analytics dashboard"
}
```

**Response:**

```json
{
  "objective": {
    "id": "obj_456",
    "statement": "Ship the analytics dashboard",
    "sprint_id": "sprint_abc123"
  }
}
```

---

### Remove Objective

```
DELETE /api/sprints/:sprintId/objectives/:objectiveId
```

---

### Add Task to Sprint

```
POST /api/sprints/:id/tasks
```

**Body:**

```json
{
  "taskId": "task_abc123",
  "objectiveId": "obj_456"
}
```

`objectiveId` is optional.

---

### Remove Task from Sprint

```
DELETE /api/sprints/:sprintId/tasks/:taskId
```

---

## Handoff Queue

Task handoff system for team collaboration.

### View Queue

```
GET /api/handoff/queue
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `status` | string | `pending`, `claimed`, `in_progress`, `complete`, `blocked` |
| `project_name` | string | Filter by project |
| `priority` | string | `low`, `normal`, `high`, `urgent` |
| `limit` | number | Max results (default: 20) |

**Response:**

```json
{
  "tasks": [
    {
      "id": "handoff_abc123",
      "instruction": "Build the settings page",
      "context": "Use the same design system as other pages",
      "status": "pending",
      "priority": "normal",
      "complexity": "moderate",
      "project_name": "UP Command Center",
      "created_by": "micaiah",
      "claimed_by": null,
      "created_at": "2026-01-28T10:00:00Z"
    }
  ]
}
```

---

### Get Handoff Task

```
GET /api/handoff/tasks/:id
```

---

### Create Handoff Task

```
POST /api/handoff/tasks
```

**Body:**

```json
{
  "instruction": "Build the settings page",
  "context": "Use the same design system",
  "priority": "normal",
  "complexity": "moderate",
  "project_name": "UP Command Center",
  "files_needed": ["dashboard/src/shared/styles.css"]
}
```

---

### Claim Task

```
POST /api/handoff/tasks/:id/claim
```

---

### Claim Next Available

```
POST /api/handoff/claim
```

**Body:** (optional filters)

```json
{
  "project_name": "UP Command Center",
  "priority_filter": "high"
}
```

---

### Update Progress

```
POST /api/handoff/tasks/:id/progress
```

**Body:**

```json
{
  "notes": "Completed the header section, working on forms"
}
```

---

### Complete Handoff Task

```
POST /api/handoff/tasks/:id/complete
```

**Body:**

```json
{
  "output_summary": "Built settings page with theme toggle and profile section",
  "output_location": "github",
  "github_repo": "up-command",
  "github_paths": ["dashboard/src/pages/settings/index.html"],
  "worker_notes": "Used localStorage for theme preference"
}
```

---

### Block Task

```
POST /api/handoff/tasks/:id/block
```

**Body:**

```json
{
  "reason": "Waiting for API endpoint to be implemented"
}
```

---

### Get Results

```
GET /api/handoff/results
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `project_name` | string | Filter by project |
| `since` | string | ISO date to filter from |
| `task_id` | string | Get specific result |

---

### Project Status

```
GET /api/handoff/projects/:projectName
```

---

## Activity / Thread

### List Activity

```
GET /api/activity
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `limit` | number | Max results |
| `type` | string | Filter by activity type |

**Response:**

```json
{
  "activities": [
    {
      "id": "act_123",
      "type": "task_completed",
      "description": "Completed: Build analytics page",
      "metadata": { "task_id": "task_abc" },
      "created_at": "2026-01-28T15:00:00Z"
    }
  ]
}
```

---

### List Check-ins

```
GET /api/checkins
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `limit` | number | Max results (default: 20) |
| `logged` | boolean | Filter by logged status |

**Response:**

```json
{
  "checkins": [
    {
      "id": "checkin_123",
      "project_name": "UP Command Center",
      "thread_summary": "Built 5 dashboard pages, we're cooking! 🔥",
      "full_recap": "## Session Recap\n\n...",
      "created_at": "2026-01-28T20:00:00Z"
    }
  ]
}
```

---

### Create Check-in

```
POST /api/checkins
```

**Body:**

```json
{
  "project_name": "UP Command Center",
  "thread_summary": "Built 5 dashboard pages today",
  "full_recap": "## Session Recap\n\n### Completed\n- Home page\n- Tasks page\n..."
}
```

---

## Messages

Team messaging between users.

### List Messages

```
GET /api/messages
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `with_user` | string | Filter to conversation with user |
| `limit` | number | Max results (default: 20) |

**Response:**

```json
{
  "messages": [
    {
      "id": "msg_123",
      "from_user": "micaiah",
      "to_user": "irene",
      "message": "Can you review the sprint tasks?",
      "read": false,
      "created_at": "2026-01-28T14:00:00Z"
    }
  ]
}
```

---

### Send Message

```
POST /api/messages
```

**Body:**

```json
{
  "to": "irene",
  "message": "Can you review the sprint tasks?"
}
```

---

### Mark Read

```
POST /api/messages/:id/read
```

---

### Unread Count

```
GET /api/messages/unread-count
```

**Response:**

```json
{
  "count": 3
}
```

---

## Team

### Team Summary

```
GET /api/team/summary
```

**Response:**

```json
{
  "members": [
    {
      "id": "micaiah",
      "name": "Micaiah",
      "tasks_completed_today": 5,
      "active_tasks": 3
    },
    {
      "id": "irene",
      "name": "Irene",
      "tasks_completed_today": 2,
      "active_tasks": 4
    }
  ],
  "pending_handoffs": 2
}
```

---

### Team Handoffs

```
GET /api/team/handoffs
```

Returns pending handoff requests for current user.

---

## Integrations

### Connection Status

```
GET /api/connections/status
```

**Response:**

```json
{
  "services": {
    "google_drive": true,
    "gmail_personal": true,
    "gmail_company": false,
    "github": true,
    "blogger_personal": false,
    "blogger_company": false,
    "google_analytics": true,
    "google_contacts_personal": false,
    "google_contacts_company": false,
    "cloudinary": true
  }
}
```

---

### Connect Service

```
GET /api/connect/:service
```

Returns OAuth authorization URL.

**Response:**

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

### Disconnect Service

```
POST /api/disconnect/:service
```

**Response:**

```json
{
  "success": true
}
```

---

## Analytics (GA4)

### List Properties

```
GET /api/analytics/properties
```

**Response:**

```json
{
  "properties": [
    {
      "property_id": "123456789",
      "name": "Untitled Publishers"
    }
  ]
}
```

---

### Get Report

```
GET /api/analytics/report
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `property_id` | string | GA4 property ID |
| `days` | number | Days to report (default: 7) |

**Response:**

```json
{
  "users": 1250,
  "pageViews": 4500,
  "sessions": 1800,
  "avgSessionDuration": 125,
  "usersChange": 12.5,
  "pageViewsChange": -3.2,
  "daily": [
    { "date": "2026-01-22", "users": 150, "pageViews": 520 },
    { "date": "2026-01-23", "users": 180, "pageViews": 650 }
  ]
}
```

---

### Real-time Data

```
GET /api/analytics/realtime
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `property_id` | string | GA4 property ID |

**Response:**

```json
{
  "activeUsers": 12,
  "topPages": [
    { "pagePath": "/blog/post-1", "pageTitle": "My Post", "activeUsers": 5 },
    { "pagePath": "/", "pageTitle": "Home", "activeUsers": 4 }
  ]
}
```

---

### Top Content

```
GET /api/analytics/top-content
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `property_id` | string | GA4 property ID |
| `days` | number | Days to analyze (default: 30) |
| `limit` | number | Max pages (default: 10) |

**Response:**

```json
{
  "pages": [
    { "pagePath": "/blog/popular-post", "pageTitle": "Popular Post", "pageViews": 2500 },
    { "pagePath": "/", "pageTitle": "Home", "pageViews": 1800 }
  ]
}
```

---

### Traffic Sources

```
GET /api/analytics/sources
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `property_id` | string | GA4 property ID |
| `days` | number | Days to analyze (default: 30) |

**Response:**

```json
{
  "sources": [
    { "source": "google", "sessions": 800 },
    { "source": "direct", "sessions": 500 },
    { "source": "twitter", "sessions": 200 }
  ]
}
```

---

### Geography

```
GET /api/analytics/geography
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `property_id` | string | GA4 property ID |
| `days` | number | Days to analyze (default: 30) |

**Response:**

```json
{
  "countries": [
    { "country": "United States", "users": 650 },
    { "country": "United Kingdom", "users": 180 },
    { "country": "Canada", "users": 120 }
  ]
}
```

---

## Journal

### List Entries

```
GET /api/journal
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `days` | number | Days to fetch (default: 7) |
| `entry_type` | string | Filter by type |
| `mood` | string | Filter by mood |

---

### Get Entry

```
GET /api/journal/:id
```

---

### Create Entry

```
POST /api/journal
```

**Body:**

```json
{
  "content": "Today was productive...",
  "entry_type": "evening",
  "mood": "content",
  "energy": 7
}
```

---

### Update Entry

```
PUT /api/journal/:id
```

---

### Delete Entry

```
DELETE /api/journal/:id
```

---

### Journal Insights

```
GET /api/journal/insights
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `days` | number | Days to analyze (default: 30) |

---

### Journal Streak

```
GET /api/journal/streak
```

---

## Work Sessions

### Current Session

```
GET /api/work-sessions/current
```

---

### Start Session

```
POST /api/work-sessions/start
```

**Body:**

```json
{
  "focus": "Building dashboard pages"
}
```

---

### End Session

```
POST /api/work-sessions/end
```

**Body:**

```json
{
  "notes": "Completed 5 pages, good session"
}
```

---

### Session History

```
GET /api/work-sessions
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `days` | number | Days of history (default: 7) |

---

## Error Responses

All errors return JSON with an `error` field:

```json
{
  "error": "Task not found"
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing X-User-Id) |
| 404 | Not Found |
| 500 | Server Error |
