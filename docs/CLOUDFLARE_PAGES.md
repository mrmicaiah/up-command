# Cloudflare Pages Deployment Guide

## Setup Steps

### 1. Connect Repository to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select the `up-command` repository
4. Configure build settings:
   - **Production branch:** `main`
   - **Build command:** (leave empty - static files)
   - **Build output directory:** `dashboard/src`
   - **Root directory:** `/` (or leave default)

### 2. Deploy Settings

No build command is needed since this is a static site with vanilla JS.

### 3. Custom Domain Setup

After initial deployment:
1. Go to the project's Custom Domains tab
2. Add: `command.untitledpublishers.com`
3. Cloudflare will auto-configure DNS if domain is on Cloudflare

### 4. Environment Variables

No environment variables needed - all config is in the JS files.

## Project Structure

```
dashboard/src/
├── index.html          # Root redirect → /pages/home/
├── shared/
│   ├── styles.css      # Design system
│   ├── api.js          # API client
│   ├── auth.js         # PIN authentication
│   ├── nav.js          # Sidebar navigation
│   └── thread.js       # Mini thread component
└── pages/
    ├── home/           # Dashboard overview
    ├── helm/           # Task management
    ├── thread/         # Activity feed
    ├── handoff/        # Task queue
    ├── courier/        # Email marketing
    ├── analytics/      # GA4 stats
    ├── integrations/   # Service connections
    └── settings/       # User preferences
```

## URL Structure

After deployment, pages will be available at:
- `command.untitledpublishers.com/` → Redirects to home
- `command.untitledpublishers.com/pages/home/`
- `command.untitledpublishers.com/pages/helm/`
- `command.untitledpublishers.com/pages/thread/`
- etc.

## CORS Configuration

The UP Command worker already has CORS enabled:
```javascript
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

## Testing Deployment

1. Visit the Cloudflare Pages URL (e.g., `up-command.pages.dev`)
2. Verify PIN login works (1987 for Micaiah, 1976 for Irene)
3. Check that API calls succeed (open browser console)
4. Test navigation between pages
5. Verify custom domain SSL is active

## Troubleshooting

### API calls failing
- Check browser console for CORS errors
- Verify the API URL in `shared/api.js` is correct
- Ensure the UP Command worker is deployed

### Auth not persisting
- Check localStorage in browser dev tools
- Verify `up_session` and `up_user_id` keys exist

### Styles not loading
- Check relative paths in HTML files
- Verify `shared/styles.css` exists

## Deployment URL

After setup, the dashboard will be available at:
- **Cloudflare Pages URL:** `https://up-command.pages.dev`
- **Custom Domain:** `https://command.untitledpublishers.com`
