# UP Command Architecture

## Design Philosophy

### 1. Single Source of Truth
One repo, one database, one deployment process. No more scattered infrastructure.

### 2. Multi-User by Design
User isolation via `user_id` fields, but shared database for team features.

### 3. MCP-First
All functionality exposed as MCP tools for AI integration. Dashboard is a consumer of the same API.

### 4. Modular Tools
Tools organized by domain, not by technical layer. Easy to add, test, and maintain.

## System Components

### MCP Server (`/server`)

**Runtime:** Cloudflare Workers  
**Database:** Cloudflare D1 (SQLite)  
**Framework:** @modelcontextprotocol/sdk

```
server/src/
├── index.ts           # Entry point, routing
├── types.ts           # TypeScript interfaces
├── tools/
│   ├── index.ts       # Tool registration
│   ├── helm/          # Tasks, projects, sprints
│   ├── team/          # Messages, handoffs, collaboration
│   ├── tracking/      # Work sessions, check-ins, journals
│   ├── content/       # Courier (email), blogs, media
│   ├── integrations/  # Google, GitHub, external services
│   └── system/        # Settings, connections, admin
├── helpers/           # Utilities, parsing, intelligence
└── oauth/             # Token management, OAuth flows
```

### Dashboard (`/dashboard`)

**Hosting:** GitHub Pages (untitledpublishers.com)  
**Stack:** Vanilla JS, Tailwind CSS, Chart.js  
**Auth:** PIN-based with localStorage sessions

```
dashboard/src/
├── index.html         # Redirect to /home
├── shared/
│   ├── styles.css     # Design system
│   ├── nav.js         # Sidebar navigation
│   ├── thread.js      # Mini thread component
│   ├── auth.js        # PIN authentication
│   └── api.js         # API client
└── pages/
    ├── home/          # Dashboard overview
    ├── thread/        # Activity feed
    ├── helm/          # Task management
    ├── handoff/       # Manager/Worker workflow
    ├── courier/       # Email marketing
    ├── analytics/     # GA4 + internal metrics
    ├── integrations/  # Service connections
    └── settings/      # User preferences
```

## Database Design

### Core Tables

```sql
-- User data isolation
users (user_id, name, settings)

-- Task management
tasks (id, user_id, text, status, priority, project, category, ...)
projects (id, user_id, name, status, phase, ...)
sprints (id, user_id, name, start_date, end_date, status)

-- Team collaboration  
messages (id, from_user, to_user, content, read_at)
handoff_tasks (id, instruction, status, created_by, claimed_by, ...)

-- Work tracking
work_sessions (id, user_id, started_at, ended_at, focus, ...)
check_ins (id, user_id, thread_summary, full_recap, ...)
journal_entries (id, user_id, content, mood, energy, ...)

-- Content & email
email_lists (id, user_id, name, slug, ...)
email_subscribers (id, list_id, email, status, ...)
email_campaigns (id, list_id, subject, body_html, status, ...)
email_sequences (id, list_id, name, trigger_type, ...)

-- Integrations
oauth_tokens (user_id, service, access_token, refresh_token, ...)
analytics_properties (id, user_id, property_id, name)
```

## Authentication

### MCP Server
- Worker secrets for OAuth credentials
- User identified via `USER_ID` env var per deployment
- Separate deployments for each team member

### Dashboard
- PIN-based auth (1987 Micaiah, 1976 Irene)
- Session stored in localStorage
- All API calls include user context

### OAuth Services
- Single Google OAuth app with multiple scopes
- Separate GitHub OAuth apps per worker (callback URL limitation)
- Tokens stored in D1 with refresh handling

## Deployment

### Server
```bash
cd server
npm run deploy                                    # Micaiah
npx wrangler deploy --config wrangler-irene.jsonc # Irene
```

### Dashboard
```bash
git push origin main  # Auto-deploys via GitHub Pages
```

### Database Migrations
```bash
npx wrangler d1 execute up-command-db --remote --file=migrations/xxx.sql
```

## Design Decisions

### Why Cloudflare Workers?
- Global edge deployment
- D1 for SQLite simplicity
- Native MCP SDK support
- Cost-effective at scale

### Why Vanilla JS for Dashboard?
- Simple deployment (static files)
- No build step required
- Easy to modify inline
- Fast load times

### Why Single Repo?
- Atomic changes across server + dashboard
- Single version history
- Easier onboarding
- Coordinated releases

### Why Separate Worker Deployments?
- User-specific OAuth tokens
- Isolated secrets
- Independent uptime
- GitHub OAuth limitation (one callback URL per app)