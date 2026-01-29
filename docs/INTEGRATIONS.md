# UP Command Integrations

This document details all available integrations, what they enable, and how to set them up.

## Overview

| Integration | Provider | Purpose | OAuth Required |
|-------------|----------|---------|----------------|
| Google Drive | Google | File storage & sync | ✅ |
| Gmail (Personal) | Google | Personal email | ✅ |
| Gmail (Company) | Google | Business email | ✅ |
| GitHub | GitHub | Code & deployments | ✅ |
| Blogger (Personal) | Google | Personal blog | ✅ |
| Blogger (Company) | Google | Company blog | ✅ |
| Google Analytics | Google | Website traffic | ✅ |
| Google Contacts (Personal) | Google | Personal contacts | ✅ |
| Google Contacts (Company) | Google | Business contacts | ✅ |
| Cloudinary | Cloudinary | Image hosting | API Key |

---

## Google Drive

**Purpose:** Store, read, and manage files in Google Drive.

### What It Enables

| Feature | Description |
|---------|-------------|
| `save_to_drive` | Save files (documents, spreadsheets, etc.) to Drive |
| `read_from_drive` | Read file contents from Drive |
| `search_drive` | Search for files by name or content |
| `list_drive_folders` | Browse folder structure |
| `update_drive_file` | Modify existing files |
| `get_folder_id` | Get folder ID by path |

### Required Scopes

```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.readonly
```

### How to Connect

1. Go to **Integrations** page in dashboard
2. Click **Google Drive** card
3. Sign in with your Google account
4. Grant file access permissions
5. You're connected!

### Common Use Cases

- Save generated documents (reports, blog posts, etc.)
- Read project files for context
- Sync work between Claude sessions
- Store backups of important content

---

## Gmail (Personal)

**Purpose:** Read and send email from your personal Gmail account.

### What It Enables

| Feature | Description |
|---------|-------------|
| `check_inbox` | View recent emails |
| `read_email` | Read full email content |
| `search_email` | Search emails by query |
| `send_email` | Send new emails |
| `email_to_task` | Convert email to task |

### Required Scopes

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
```

### How to Connect

1. Go to **Integrations** page
2. Click **Gmail (Personal)**
3. Sign in with your personal Google account
4. Grant email access permissions

### Common Use Cases

- Check inbox for important emails
- Draft and send email replies
- Convert emails to actionable tasks
- Search for specific conversations

---

## Gmail (Company)

**Purpose:** Access your business/company Gmail account.

### What It Enables

Same features as Gmail (Personal), but for your company account:
- `check_inbox` (company)
- `read_email` (company)
- `search_email` (company)
- `send_email` (company)

### Required Scopes

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
```

### How to Connect

1. Go to **Integrations** page
2. Click **Gmail (Company)**
3. Sign in with your company Google Workspace account
4. Grant email access permissions

### Common Use Cases

- Manage business correspondence
- Send professional emails
- Track client communications
- Search business email history

---

## GitHub

**Purpose:** Manage code repositories, push files, and track deployments.

### What It Enables

| Feature | Description |
|---------|-------------|
| `github_list_repos` | List your repositories |
| `github_list_files` | Browse repo file structure |
| `github_get_file` | Read file contents |
| `github_push_file` | Create or update a single file |
| `github_push_files` | Push multiple files at once |
| `github_enable_pages` | Enable GitHub Pages |
| `check_deploys` | View recent deployments |
| `deploy_status` | Check deployment status |

### Required Scopes

```
repo (Full control of private repositories)
```

### How to Connect

1. Go to **Integrations** page
2. Click **GitHub**
3. Authorize the GitHub OAuth app
4. Grant repository access

### Common Use Cases

- Push code changes and updates
- Read project files for context
- Check deployment status
- Manage static site content
- Create new files in repos

### Note on OAuth Apps

Each user deployment (Micaiah, Irene) requires a separate GitHub OAuth app because GitHub only allows one callback URL per app.

---

## Blogger (Personal)

**Purpose:** Create and manage posts on your personal blog.

### What It Enables

| Feature | Description |
|---------|-------------|
| `list_blogs` | List available blogs |
| `list_blog_posts` | View posts (drafts, published) |
| `get_blog_post` | Read post content |
| `create_blog_post` | Create new posts |
| `update_blog_post` | Edit existing posts |
| `publish_blog_post` | Publish draft posts |
| `delete_blog_post` | Remove posts |
| `get_blog_stats` | View blog statistics |

### Required Scopes

```
https://www.googleapis.com/auth/blogger
```

### How to Connect

1. Go to **Integrations** page
2. Click **Blogger (Personal)**
3. Sign in with your Google account
4. Grant Blogger access

### Common Use Cases

- Draft blog posts with AI assistance
- Schedule content publication
- Edit and refine existing posts
- Check blog performance metrics

---

## Blogger (Company)

**Purpose:** Manage company blog content.

### What It Enables

Same features as Blogger (Personal), but for company blogs.

### How to Connect

1. Go to **Integrations** page
2. Click **Blogger (Company)**
3. Sign in with your company Google account
4. Grant Blogger access

---

## Google Analytics

**Purpose:** View website traffic, user behavior, and performance metrics.

### What It Enables

| Feature | Description |
|---------|-------------|
| `properties` | List GA4 properties |
| `report` | Get traffic overview (users, sessions, etc.) |
| `realtime` | View active users right now |
| `top_content` | See most viewed pages |
| `sources` | Traffic source breakdown |
| `geography` | Geographic distribution |

### Required Scopes

```
https://www.googleapis.com/auth/analytics.readonly
```

### How to Connect

1. Go to **Integrations** page
2. Click **Google Analytics**
3. Sign in with account that has GA4 access
4. Grant analytics read access

### Common Use Cases

- Check daily traffic numbers
- Monitor real-time visitors
- Identify top-performing content
- Analyze traffic sources
- Review geographic reach

### Dashboard

Once connected, visit the **Analytics** page in the dashboard for:
- Real-time active users
- Traffic over time charts
- Top pages table
- Traffic sources pie chart
- Geographic distribution

---

## Google Contacts (Personal)

**Purpose:** Look up contact information from your personal contacts.

### What It Enables

| Feature | Description |
|---------|-------------|
| `search_contacts` | Find contacts by name or email |

### Required Scopes

```
https://www.googleapis.com/auth/contacts.readonly
```

### How to Connect

1. Go to **Integrations** page
2. Click **Contacts (Personal)**
3. Sign in with your Google account
4. Grant contacts read access

### Common Use Cases

- Look up someone's email address
- Find phone numbers
- Verify contact information

---

## Google Contacts (Company)

**Purpose:** Access company directory and business contacts.

### What It Enables

Same as personal contacts, but for company directory.

### How to Connect

1. Go to **Integrations** page
2. Click **Contacts (Company)**
3. Sign in with your company Google account
4. Grant contacts read access

---

## Cloudinary

**Purpose:** Upload, store, and optimize images for web use.

### What It Enables

| Feature | Description |
|---------|-------------|
| `cloudinary_upload` | Upload images |
| `cloudinary_list` | List stored images |
| `cloudinary_url` | Generate optimized URLs |
| `cloudinary_delete` | Remove images |
| `cloudinary_folders` | Browse folder structure |
| `cloudinary_status` | Check account status |

### Authentication

Cloudinary uses API keys instead of OAuth:
- Cloud Name
- API Key
- API Secret

### How to Connect

Cloudinary credentials are configured as environment secrets in the worker:

```bash
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
```

### Common Use Cases

- Upload images for blog posts
- Generate responsive image URLs
- Optimize images for web delivery
- Organize media assets in folders
- Apply transformations (resize, crop, etc.)

### URL Transformations

Cloudinary URLs support on-the-fly transformations:

```
# Original
https://res.cloudinary.com/{cloud}/image/upload/v1234/folder/image.jpg

# Resized to 800px width
https://res.cloudinary.com/{cloud}/image/upload/w_800/v1234/folder/image.jpg

# Cropped and optimized
https://res.cloudinary.com/{cloud}/image/upload/w_400,h_300,c_fill,q_auto,f_auto/v1234/folder/image.jpg
```

---

## Troubleshooting

### "Failed to connect" error

1. Check that you're signed into the correct Google account
2. Ensure you granted all requested permissions
3. Try disconnecting and reconnecting
4. Check browser console for specific error messages

### "Token expired" issues

OAuth tokens auto-refresh, but if issues persist:
1. Disconnect the service
2. Reconnect to get fresh tokens

### "Permission denied" errors

1. Verify the connected account has access to the resource
2. For company services, ensure your Workspace admin allows the app
3. Some features require specific Google Workspace editions

### GitHub rate limits

GitHub has API rate limits:
- Authenticated: 5,000 requests/hour
- If hitting limits, wait or check for inefficient API usage

---

## Adding New Integrations

To add a new integration:

1. **Register OAuth App** (if OAuth-based)
   - Google: Google Cloud Console
   - GitHub: GitHub Developer Settings

2. **Add to Worker**
   - Add service type to `oauth/index.ts`
   - Implement token exchange
   - Add tool handlers

3. **Add to Dashboard**
   - Update `SERVICES` object in integrations page
   - Add icon and description

4. **Document**
   - Add section to this file
   - Include scopes and use cases
