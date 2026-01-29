# API Reference

All functionality is exposed as MCP tools.

## Tool Categories

### Helm (Tasks & Projects)

| Tool | Description |
|------|-------------|
| `add_task` | Create a new task |
| `complete_task` | Mark task done |
| `list_tasks` | View tasks with filters |
| `activate_task` | Add to active list |
| `update_task` | Modify task details |
| `break_down_task` | Create subtasks |
| `good_morning` | Start work day |
| `good_night` | End work day |
| `plan_week` | Weekly planning |

### Team

| Tool | Description |
|------|-------------|
| `send_message` | Message teammate |
| `check_messages` | View unread messages |
| `team_summary` | Team activity overview |
| `suggest_handoff` | Propose task handoff |
| `view_teammate_tasks` | See teammate's tasks |

### Tracking

| Tool | Description |
|------|-------------|
| `add_checkin` | Record work session |
| `checkpoint` | Auto-save progress |
| `add_journal_entry` | Personal journaling |
| `journal_insights` | Pattern analysis |
| `create_work_log` | Weekly work summary |

### Content

| Tool | Description |
|------|-------------|
| `courier_create_campaign` | New email campaign |
| `courier_send_now` | Send immediately |
| `courier_list_subscribers` | View subscribers |
| `courier_create_sequence` | Email automation |
| `create_blog_post` | New blog post |
| `cloudinary_upload` | Upload images |

### Integrations

| Tool | Description |
|------|-------------|
| `search_drive` | Find Drive files |
| `save_to_drive` | Create Drive file |
| `check_inbox` | View emails |
| `send_email` | Send email |
| `github_push_files` | Push to GitHub |
| `analytics_report` | GA4 metrics |

### System

| Tool | Description |
|------|-------------|
| `connect_service` | OAuth connection |
| `connection_status` | Service status |
| `who_am_i` | Current user info |
| `get_stats` | Usage statistics |

## Request Format

MCP tools are invoked via the MCP protocol. Each tool has:
- Name
- Parameters (JSON schema)
- Returns (JSON response)

## Authentication

The server identifies users via:
1. `USER_ID` environment variable (worker deployment)
2. Session context for dashboard calls

## Error Handling

All tools return structured responses:

```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Rate Limits

- Cloudflare Workers: 100,000 requests/day (free tier)
- D1: 5 million rows read/day
- OAuth APIs: Varies by service