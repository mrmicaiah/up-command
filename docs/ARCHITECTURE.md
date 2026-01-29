# UP Command Center Architecture

## Overview

UP Command Center is a productivity and business operations platform for Untitled Publishers. It provides task management, email marketing, analytics, and integrations through both a web dashboard and Claude AI assistant.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UP Command Center                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐  │
│  │   Dashboard  │      │   Claude AI  │      │    External Services     │  │
│  │  (Browser)   │      │  (Anthropic) │      │                          │  │
│  └──────┬───────┘      └──────┬───────┘      │  • Google (Drive, Gmail, │  │
│         │                     │              │    Analytics, Contacts,  │  │
│         │ REST API            │ MCP Tools    │    Blogger)              │  │
│         │                     │              │  • GitHub                │  │
│         ▼                     ▼              │  • Cloudinary            │  │
│  ┌─────────────────────────────────────┐    │  • Resend (Email)        │  │
│  │         UP Command Worker           │    └──────────────────────────┘  │
│  │       (Cloudflare Workers)          │◄────────────────┘                │
│  │                                     │         OAuth / API              │
│  │  • REST API endpoints               │                                  │
│  │  • MCP tool handlers                │                                  │
│  │  • OAuth flow management            │                                  │
│  │  • Business logic                   │                                  │
│  └──────────────┬──────────────────────┘                                  │
│                 │                                                          │
│                 │ SQL                                                      │
│                 ▼                                                          │
│  ┌─────────────────────────────────────┐                                  │
│  │        productivity-brain           │                                  │
│  │         (Cloudflare D1)             │                                  │
│  │                                     │                                  │
│  │  • Tasks, Sprints, Objectives       │                                  │
│  │  • OAuth tokens                     │                                  │
│  │  • Check-ins, Work logs             │                                  │
│  │  • Journal entries                  │                                  │
│  │  • Team messages                    │                                  │
│  └─────────────────────────────────────┘                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Dashboard (Cloudflare Pages)

**Location:** `dashboard/src/`  
**URL:** `command.untitledpublishers.com`  
**Technology:** Vanilla HTML/CSS/JavaScript

The dashboard is a static site hosted on Cloudflare Pages. It provides a web interface for:
- Task and sprint management (Helm)
- Email marketing (Courier integration)
- Analytics viewing
- Service integrations management

**Key Files:**
```
dashboard/
├── src/
│   ├── index.html              # Root redirect
│   ├── shared/
│   │   ├── api.js              # API client with domain helpers
│   │   ├── auth.js             # PIN authentication
│   │   ├── nav.js              # Navigation and layout
│   │   └── styles.css          # Design system
│   └── pages/
│       ├── home/               # Main dashboard
│       ├── helm/               # Task management
│       │   ├── index.html      # Overview
│       │   ├── tasks.html      # Full task list
│       │   ├── sprint.html     # Sprint planning
│       │   ├── backlog.html    # Kanban view
│       │   └── routines.html   # Recurring tasks
│       ├── courier/            # Email marketing
│       ├── analytics/          # GA4 dashboard
│       └── integrations/       # Service connections
```

### 2. API Server (Cloudflare Workers)

**Location:** `server/src/`  
**URL:** `up-command.micaiah-tasks.workers.dev`  
**Technology:** Cloudflare Workers (TypeScript)

Single worker serving both REST API and MCP tools:

```typescript
// Dual interface pattern
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // REST API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }
    
    // MCP SSE endpoint (for Claude)
    if (url.pathname === '/sse') {
      return handleMcpRequest(request, env);
    }
    
    // OAuth callbacks
    if (url.pathname.startsWith('/oauth/')) {
      return handleOAuthCallback(request, env);
    }
  }
}
```

**API Endpoints:**
| Path | Description |
|------|-------------|
| `/api/tasks/*` | Task CRUD, completion, activation |
| `/api/sprints/*` | Sprint management, objectives |
| `/api/handoff/*` | Task handoff queue |
| `/api/courier/*` | Email marketing (proxied) |
| `/api/analytics/*` | GA4 data |
| `/api/connections/*` | Integration status |
| `/oauth/*` | OAuth flows |

### 3. Database (Cloudflare D1)

**Name:** `productivity-brain`  
**ID:** `be348cf9-552b-41ae-a1d8-cd20be25d6ee`

SQLite database shared between all users, with row-level isolation via `user_id`.

**Core Tables:**
```sql
-- Task Management
tasks (id, user_id, text, status, priority, category, project, due_date, ...)
sprints (id, user_id, name, start_date, end_date, status)
objectives (id, sprint_id, user_id, statement)
sprint_tasks (sprint_id, task_id, objective_id)

-- Work Tracking
check_ins (id, user_id, project_name, thread_summary, full_recap, ...)
work_logs (id, user_id, narrative, shipped, ...)
journal_entries (id, user_id, content, mood, energy, ...)

-- Team
team_messages (id, from_user, to_user, message, ...)
handoff_tasks (id, created_by, claimed_by, instruction, status, ...)

-- OAuth
oauth_tokens (id, user_id, service, access_token, refresh_token, ...)
```

### 4. Email Marketing (Courier)

**Separate Worker:** `email-bot-server.micaiah-tasks.workers.dev`  
**Database:** Shared `productivity-brain`

Courier is a separate worker for email marketing to keep concerns separated:
- Subscriber management
- Campaign creation and sending
- Sequence automation
- Delivery via Resend API

The main UP Command dashboard proxies to Courier's API.

## Data Flow

### Dashboard → API → Database

```
User Action (Browser)
       │
       ▼
┌─────────────────┐
│  api.js client  │  POST /api/tasks { text: "..." }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UP Command     │  X-User-Id: "micaiah"
│  Worker         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  D1 Database    │  INSERT INTO tasks WHERE user_id = 'micaiah'
└─────────────────┘
```

### Claude → MCP Tools → Database

```
User message to Claude
       │
       ▼
┌─────────────────┐
│  Claude AI      │  "Add task: Review PRs"
└────────┬────────┘
         │ MCP Protocol (SSE)
         ▼
┌─────────────────┐
│  UP Command     │  tool: "add_task"
│  Worker         │  args: { text: "Review PRs" }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  D1 Database    │  INSERT INTO tasks ...
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Claude AI      │  "✅ Task added: Review PRs"
└─────────────────┘
```

## Authentication

### Dashboard (PIN-based)

Simple PIN authentication for personal use:
- Micaiah: `1987`
- Irene: `1976`

```javascript
// auth.js
const USERS = {
  '1987': { id: 'micaiah', name: 'Micaiah' },
  '1976': { id: 'irene', name: 'Irene' }
};

function authenticate(pin) {
  const user = USERS[pin];
  if (user) {
    localStorage.setItem('up_user_id', user.id);
    return user;
  }
  return null;
}
```

The `X-User-Id` header is sent with all API requests for user identification.

### OAuth (Service Integrations)

OAuth 2.0 flow for external services:

```
1. User clicks "Connect" on dashboard
2. Dashboard calls: GET /api/connect/google_drive
3. Worker generates OAuth URL with state token
4. User redirected to Google consent screen
5. Google redirects to: /oauth/callback?code=...&state=...
6. Worker exchanges code for tokens
7. Tokens stored in oauth_tokens table
8. User redirected back to dashboard
```

**Token Storage:**
```sql
oauth_tokens (
  user_id TEXT,
  service TEXT,           -- 'google_drive', 'github', etc.
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  scope TEXT
)
```

### User Isolation

All database queries include user_id filtering:

```typescript
// Every query pattern
async function listTasks(env: Env, userId: string) {
  return env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND status = ?'
  ).bind(userId, 'open').all();
}
```

MCP tools get user_id from the connection context. REST API gets it from the `X-User-Id` header.

## Key Decisions

### Why Single Worker (Not Per-User)?

**Decision:** One worker deployment serves all users, with user isolation at the data layer.

**Reasoning:**
- Simpler deployment and maintenance
- Shared codebase, no sync issues
- D1 supports row-level isolation well
- Team features (handoffs, messages) need shared access
- Cold start overhead avoided

**Trade-off:** OAuth tokens are per-user, so we store user_id with each token and filter accordingly.

### Why D1 Over Other Databases?

**Decision:** Cloudflare D1 (SQLite) as primary database.

**Reasoning:**
- Native Cloudflare integration (same edge network)
- SQL familiarity and power
- No connection management overhead
- Free tier generous for our use case
- Automatic backups and point-in-time recovery
- Works great with Workers

**Trade-off:** SQLite limitations (no concurrent writes, limited types), but fine for our scale.

### Why Static Dashboard Over SPA Framework?

**Decision:** Vanilla HTML/CSS/JS instead of React/Vue/etc.

**Reasoning:**
- Instant load times (no JS bundle to parse)
- Simpler debugging and maintenance
- No build step required for Pages
- Each page is independent (good for Claude artifacts)
- Easier to generate/modify programmatically
- Sufficient for our UI complexity

**Trade-off:** More boilerplate per page, no component reuse beyond shared scripts.

### Why Separate Courier Worker?

**Decision:** Email marketing as separate worker from main productivity tools.

**Reasoning:**
- Separation of concerns (email is complex domain)
- Can scale independently
- Different rate limits and quotas
- Cleaner API surface
- Could be extracted as standalone product

**Trade-off:** Extra deployment to manage, API proxying needed.

## Directory Structure

```
up-command/
├── server/                    # API Server (Worker)
│   ├── src/
│   │   ├── index.ts          # Main entry, routing
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── api/              # REST endpoint handlers
│   │   │   ├── tasks.ts
│   │   │   ├── sprints.ts
│   │   │   └── ...
│   │   ├── mcp/              # MCP tool definitions
│   │   │   ├── tools.ts
│   │   │   └── handlers.ts
│   │   └── oauth/            # OAuth flow handlers
│   │       └── index.ts
│   ├── wrangler.jsonc        # Worker config
│   └── package.json
│
├── dashboard/                 # Web Dashboard (Pages)
│   ├── src/
│   │   ├── index.html
│   │   ├── shared/           # Shared utilities
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── nav.js
│   │   │   └── styles.css
│   │   └── pages/            # Page-specific files
│   │       ├── home/
│   │       ├── helm/
│   │       ├── courier/
│   │       ├── analytics/
│   │       └── integrations/
│   └── package.json          # Prevents wrangler detection
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md       # This file
│   ├── SCHEMA.md             # Database schema
│   └── CLOUDFLARE_PAGES.md   # Deployment guide
│
└── .github/
    └── workflows/            # CI/CD (future)
```

## Deployment

### Dashboard (Cloudflare Pages)

```bash
# Automatic via GitHub integration
# Push to main → Pages rebuilds

# Manual if needed
cd dashboard
npx wrangler pages deploy src --project-name=up-command
```

### API Server (Cloudflare Workers)

```bash
cd server
npm install
npx wrangler deploy
```

### Database Migrations

```bash
# Run SQL directly
npx wrangler d1 execute productivity-brain --remote --command "ALTER TABLE ..."

# Or from file
npx wrangler d1 execute productivity-brain --remote --file=migrations/001_add_column.sql
```

## Security Considerations

1. **PIN Authentication:** Sufficient for personal/small team use. Not suitable for public deployment.

2. **OAuth Tokens:** Stored encrypted at rest in D1. Refresh tokens allow long-lived sessions.

3. **CORS:** Worker sets appropriate headers for dashboard origin only.

4. **User Isolation:** All queries filter by user_id. No cross-user data access possible through normal API.

5. **Rate Limiting:** Cloudflare provides basic DDoS protection. Could add explicit rate limits if needed.

## Future Considerations

- **Multi-tenant:** Current architecture could support more users with proper auth (replace PIN with proper auth provider)
- **Real-time:** WebSocket support for live updates (D1 doesn't support triggers, would need polling or external pub/sub)
- **Mobile App:** API is already REST-based, mobile client could connect easily
- **Plugin System:** MCP tools are modular, could allow custom tool registration
