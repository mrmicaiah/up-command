# Deployment Guide

## Server Deployment

### Single User

```bash
cd server
npm run deploy
```

### Multi-User (Team)

Each team member needs their own worker deployment:

```bash
# Micaiah (default)
npm run deploy

# Irene
npx wrangler deploy --config wrangler-irene.jsonc
```

### Environment Variables

Set in `wrangler.jsonc`:

```json
{
  "vars": {
    "USER_ID": "micaiah",
    "TEAM": "irene"
  }
}
```

### Secrets

Set via Wrangler CLI:

```bash
npx wrangler secret put SECRET_NAME
npx wrangler secret put SECRET_NAME --config wrangler-irene.jsonc
```

Required secrets:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## Database

### Running Migrations

```bash
# From migration file
npx wrangler d1 execute up-command-db --remote --file=migrations/xxx.sql

# Direct SQL
npx wrangler d1 execute up-command-db --remote --command="ALTER TABLE tasks ADD COLUMN new_field TEXT;"
```

### Backup

```bash
npx wrangler d1 export up-command-db --output=backup.sql
```

## Dashboard Deployment

Dashboard deploys automatically via GitHub Pages on push to `main`.

### Manual Deploy

1. Commit changes: `git commit -am "Update dashboard"`
2. Push: `git push origin main`
3. Wait ~60 seconds for GitHub Pages rebuild

### Custom Domain

1. Add CNAME file to `dashboard/src/CNAME`
2. Configure DNS with your provider
3. Enable HTTPS in GitHub Pages settings

## Rollback

### Server

```bash
# View deployment history
npx wrangler deployments list

# Rollback to previous
npx wrangler rollback
```

### Dashboard

```bash
git revert HEAD
git push origin main
```

## Monitoring

### Server Logs

```bash
npx wrangler tail
```

### Dashboard

Check browser console and network tab.

## CI/CD (Optional)

GitHub Actions workflow for automated deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: server
```