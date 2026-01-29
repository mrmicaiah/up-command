# Getting Started with UP Command

## Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for Workers + D1)
- GitHub account

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mrmicaiah/up-command.git
cd up-command
```

### 2. Server Setup

```bash
cd server
npm install
```

### 3. Configure Wrangler

Copy the template and add your account details:

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Edit `wrangler.jsonc` with your Cloudflare account ID.

### 4. Create Database

```bash
npx wrangler d1 create up-command-db
```

Add the database ID to your `wrangler.jsonc`.

### 5. Run Migrations

```bash
npx wrangler d1 execute up-command-db --remote --file=migrations/001_initial.sql
```

### 6. Set Secrets

```bash
# Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

# GitHub OAuth
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

### 7. Deploy

```bash
npm run deploy
```

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

## Dashboard Setup

The dashboard is static HTML/JS served via GitHub Pages.

1. Push changes to `main` branch
2. Enable GitHub Pages in repo settings
3. Configure custom domain (optional)

## Connecting Services

Use the `connect_service` MCP tool:

```
connect_service google_drive
connect_service gmail_personal
connect_service github
```

Follow the OAuth URLs to authorize.

## Next Steps

- [Deployment Guide](./deployment.md) - Production deployment
- [Handoff System](./handoff-system.md) - Manager/Worker workflow
- [API Reference](./api-reference.md) - Available MCP tools