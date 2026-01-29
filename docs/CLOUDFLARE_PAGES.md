# Cloudflare Pages Deployment Guide

## Live URLs

- **Production:** https://command.untitledpublishers.com
- **Cloudflare Pages:** https://up-command-dashboard.pages.dev (or similar)

## Setup (Already Complete)

The dashboard is deployed via **Cloudflare Pages** (not Workers).

### Configuration Used

| Setting | Value |
|---------|-------|
| **Project type** | Pages (NOT Workers) |
| **Git repository** | mrmicaiah/up-command |
| **Production branch** | main |
| **Framework preset** | None |
| **Root directory** | `dashboard` |
| **Build command** | *(empty)* |
| **Build output directory** | `src` |

### Custom Domain

- `command.untitledpublishers.com` → Configured in Pages project settings

## Project Structure

```
dashboard/
├── package.json        # Prevents wrangler detection
└── src/
    ├── index.html      # Root redirect → /pages/home/
    ├── shared/
    │   ├── styles.css  # Design system
    │   ├── api.js      # API client
    │   ├── auth.js     # PIN authentication
    │   ├── nav.js      # Sidebar navigation
    │   └── thread.js   # Mini thread component
    └── pages/
        ├── home/       # Dashboard overview
        ├── helm/       # Task management
        ├── thread/     # Activity feed
        ├── handoff/    # Task queue
        ├── courier/    # Email marketing
        ├── analytics/  # GA4 stats
        ├── integrations/
        └── settings/
```

## URL Structure

- `command.untitledpublishers.com/` → Redirects to home
- `command.untitledpublishers.com/pages/home/`
- `command.untitledpublishers.com/pages/helm/`
- `command.untitledpublishers.com/pages/thread/`
- etc.

## Authentication

PIN-based login:
- **Micaiah:** 1987
- **Irene:** 1976

Sessions persist for 7 days in localStorage.

## API Backend

The dashboard calls the UP Command worker:
- **Micaiah:** `https://up-command.micaiah-tasks.workers.dev`
- **Irene:** `https://up-command-irene.micaiah-tasks.workers.dev`

CORS is enabled on the worker for all origins.

## Redeployment

Automatic on push to `main` branch. No manual action needed.

## Troubleshooting

### "Deploy command: npx wrangler deploy" error
This means you created a **Workers** project instead of **Pages**. Delete and recreate as Pages.

### API calls failing
1. Check browser console for errors
2. Verify UP Command worker is deployed
3. Check CORS headers in worker response

### Auth not working
1. Clear localStorage
2. Check browser console for errors
3. Verify PIN is correct (4 digits)
