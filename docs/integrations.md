# Integrations

## Google Services

All Google services use a single OAuth application with multiple scopes.

### Google Drive

**Scope:** `https://www.googleapis.com/auth/drive`

**Tools:**
- `search_drive` - Find files by name/content
- `read_from_drive` - Get file contents
- `save_to_drive` - Create new file
- `update_drive_file` - Modify existing file
- `list_drive_folders` - Browse folders

**Use Cases:**
- Document storage
- File sharing with team
- Backup location for content

### Gmail

**Scope:** `https://www.googleapis.com/auth/gmail.modify`

**Tools:**
- `check_inbox` - View recent emails
- `read_email` - Get email content
- `send_email` - Send email
- `search_email` - Find emails
- `email_to_task` - Convert email to task

**Accounts:**
- `personal` - Personal Gmail
- `company` - Business Gmail

### Blogger

**Scope:** `https://www.googleapis.com/auth/blogger`

**Tools:**
- `list_blogs` - View available blogs
- `create_blog_post` - New post
- `update_blog_post` - Edit post
- `publish_blog_post` - Publish draft
- `get_blog_stats` - View statistics

### Google Contacts

**Scope:** `https://www.googleapis.com/auth/contacts.readonly`

**Tools:**
- `search_contacts` - Find contacts by name/email

### Google Analytics

**Scope:** `https://www.googleapis.com/auth/analytics.readonly`

**Tools:**
- `analytics_report` - Traffic overview
- `analytics_realtime` - Live visitors
- `analytics_top_content` - Popular pages
- `analytics_sources` - Traffic sources
- `analytics_geography` - Visitor locations

## GitHub

**Note:** Requires separate OAuth app per worker deployment.

**Tools:**
- `github_list_repos` - View repositories
- `github_list_files` - Browse repo files
- `github_get_file` - Read file content
- `github_push_file` - Create/update single file
- `github_push_files` - Create/update multiple files
- `github_enable_pages` - Enable GitHub Pages
- `check_deploys` - View deployment status

**Use Cases:**
- Code storage
- Dashboard hosting
- Version control

## Cloudinary

**Authentication:** API key/secret

**Tools:**
- `cloudinary_upload` - Upload images
- `cloudinary_list` - View images
- `cloudinary_url` - Generate optimized URLs
- `cloudinary_delete` - Remove images
- `cloudinary_folders` - Browse folders
- `cloudinary_status` - Account info

**Use Cases:**
- Book covers
- Blog images
- Email graphics

## Resend (via Courier)

**Authentication:** API key

Email delivery for Courier campaigns and sequences.

## DataForSEO

**Authentication:** API credentials

**Tools:**
- `seo_discover` - Keyword research
- `seo_analyze` - SERP analysis
- `seo_difficulty` - Keyword difficulty
- `seo_longtail` - Long-tail opportunities
- `seo_wordcount` - Content length analysis

## Connecting Services

```
connect_service google_drive
connect_service gmail_personal
connect_service gmail_company
connect_service blogger_personal
connect_service blogger_company
connect_service google_contacts_personal
connect_service google_contacts_company
connect_service google_analytics
connect_service github
```

## Connection Status

```
connection_status
```

Returns status of all configured services.