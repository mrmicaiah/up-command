# UP Command Center

> The unified operations hub for Untitled Publishers

UP Command is a complete rebuild of our productivity infrastructure into a single, cohesive system. It replaces the scattered architecture of productivity-mcp, email-bot, and multiple dashboards with one unified platform.

## What is UP Command?

**For Micaiah & Irene:** A single place to manage tasks, launches, content, emails, and analytics - with smart automation and team collaboration.

**Technically:** A Cloudflare Workers MCP server with a modern web dashboard, supporting multi-user workflows and AI-powered operations.

## Key Features

- **Helm** - Task and project management with smart prioritization
- **Thread** - Conversation-style activity feed and check-ins
- **Handoff** - Manager/Worker dual-chat workflow for AI collaboration
- **Courier** - Email marketing with sequences and analytics
- **Integrations** - Google Drive, Gmail, Blogger, GitHub, Analytics, Cloudinary

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design decisions.

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Deployment](./docs/deployment.md)
- [Handoff System](./docs/handoff-system.md)
- [API Reference](./docs/api-reference.md)
- [Integrations](./docs/integrations.md)

## Project Structure

```
up-command/
├── server/          # MCP server (Cloudflare Worker)
│   ├── src/
│   │   ├── tools/   # MCP tool implementations
│   │   ├── helpers/ # Shared utilities
│   │   └── oauth/   # OAuth flow handlers
│   └── wrangler.jsonc
├── dashboard/       # Web UI
│   └── src/
│       ├── shared/  # Common components
│       └── pages/   # Route-specific pages
└── docs/           # Documentation
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/mrmicaiah/up-command.git
cd up-command

# Server setup
cd server
npm install
npm run dev

# Deploy
npm run deploy
```

## Deployment

Auto-deploys to Cloudflare Workers on push to `main` branch via Git integration.

## Team

- **Micaiah** - Builder, operator
- **Irene** - Creative director, teammate

---

*Untitled Publishers © 2026*
