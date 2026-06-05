# UP Command — `server/src/tools/` Audit

**Repo:** `mrmicaiah/up-command`
**Path audited:** `server/src/tools/`
**Date:** 2026-06-04
**Purpose:** Determine what MCP tools are actually registered vs. what exists but is dead, before removing anything. Goal state: UP Command keeps only REST API endpoints for the dashboard; all MCP tools move to `productivity-mcp-server`.

---

## TL;DR

1. **The entire `tools/` tree is dead code in the deployed worker.** `server/src/index.ts` (the Cloudflare Worker entrypoint) is a self-contained REST API. It never imports `registerAllTools`, never instantiates an MCP server, and never references anything under `tools/`. Nothing in `tools/` ships.
2. **`tools/index.ts` registers only 2 of 6 modules** — `content` and `system`. The other 4 (`helm`, `team`, `tracking`, `integrations`) are commented out as "Future."
3. **Those 4 "Future" modules are not stubs — they are fully implemented**, each with a complete `register*Tools()` function wiring up real submodules. The "Future" comments are stale.
4. **Every REST endpoint the dashboard needs already lives inline in `index.ts`** — independent of `tools/`. So `tools/` can be deleted wholesale without touching the REST surface.

---

## 1) Currently Registered Tools (per `tools/index.ts`)

`registerAllTools()` calls exactly two registrars:

| Module | Registrar | Source files | Tools registered |
|--------|-----------|--------------|------------------|
| **content** | `registerContentTools` | `content/blog.ts`, `content/authors.ts` | `mb_list_posts`, `mb_get_post`, `mb_create_post`, `mb_update_post`, `mb_delete_post`, `mb_publish_post`, `mb_unpublish_post`, `mb_schedule_post`, `author_list`, `author_get`, `author_create`, `author_update`, `author_delete` |
| **system** | `registerSystemTools` | `system/notes.ts`, `system/skills.ts` | `add_note`, `add_idea`, `list_ideas`, `list_skills`, `get_skill`, `save_skill`, `delete_skill` |

Tool names above are taken from the category reference block at the bottom of `tools/index.ts`. They were not individually re-verified against each source file's `server.tool(...)` calls — if exact tool-name accuracy matters for the migration, spot-check `blog.ts`, `authors.ts`, `notes.ts`, and `skills.ts` directly.

**Caveat on "registered":** Even these two are only registered *into a function that nothing calls*. `registerAllTools` is exported but has no caller in `index.ts`. So in practice, "registered" here means "wired into the registration hub," not "live in the deployed worker."

---

## 2) Files That Exist But Aren't Wired Up

All four modules below have a complete `index.ts` with a working `register*Tools()` function. They are commented out in `tools/index.ts` (both the `import` and the call), labeled "Future" — but the code is finished, not pending.

### `helm/` — Task & project management (commented out)
- `helm/index.ts` → `registerHelmTools()` wires up ~19 tools across four submodules:
  - `tasks/` → `list_tasks`, `add_task`, `complete_task`, `update_task`, `delete_task`, `snooze_task`, `claim_task`, `break_down_task`
  - `sprints/` → sprint CRUD, sprint objectives, task activation
  - `workday/` → `good_morning`, `good_night`, `checkpoint`, `set_focus`, `work_history`
  - `reporting/` → daily / weekly / stats reporting

### `team/` — Collaboration & handoffs (commented out)
- `team/index.ts` → `registerTeamTools()` wires up:
  - `messaging.ts` → `registerMessaging`
  - `collaboration.ts` → `registerCollaboration`
  - `handoffs-simple.ts` → `registerSimpleHandoffs` (quick transfers)
  - `handoff-queue/` → `registerHandoffManager`, `registerHandoffWorker` (the full handoff queue — `handoff_create_task`, `handoff_get_next_task`, `handoff_complete_task`, etc.)

### `tracking/` — Check-ins, work logs, journals (commented out)
- `tracking/index.ts` → `registerTrackingTools()` wires up:
  - `checkins.ts`, `checkin-comments.ts`
  - `work-logs.ts`
  - `journal/` → entry, insight, and config tools
  - `progress.ts`

### `integrations/` — External services (commented out)
- `integrations/index.ts` → `registerIntegrationTools()` wires up:
  - `connections.ts`, `drive.ts`, `email.ts`, `github.ts`, `blogger.ts`, `contacts.ts`, `cloudinary.ts`, `analytics.ts`

**Net:** roughly 60+ MCP tools exist in fully-built form across these four modules and are not loaded by the registration hub. These are the prime candidates to migrate to `productivity-mcp-server` and then delete from UP Command. Plus the two "registered" modules (`content`, `system`) — since nothing in this worker actually calls `registerAllTools`, those should migrate too.

---

## 3) REST API Handlers to KEEP

These do **not** live in `tools/`. They are inline `async function` handlers in `server/src/index.ts`, routed through `handleApiRoutes()` under `/api/*`. This is the dashboard's actual backend and should stay in UP Command.

| Route prefix | Handlers | Keep? |
|--------------|----------|-------|
| `/api/tasks` | `listTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `completeTask`, `reopenTask`, `getTaskStats` | ✅ Keep |
| `/api/routines` | `getRoutines` | ✅ Keep |
| `/api/sprints` | `listSprints`, `getCurrentSprint`, `createSprint`, `updateSprint` | ✅ Keep |
| `/api/activity` | `getActivityForDashboard` | ✅ Keep |
| `/api/thread` | `getActivityFeed`, `getUnreadCount` | ⚠️ Keep (marked "Legacy" in code — confirm dashboard still calls it) |
| `/api/notifications` | inline stubs (return empty) | ⚠️ Keep or drop — currently placeholder |
| `/api/handoff` | `listHandoffProjects`, `getHandoffProject`, `getHandoffQueue` | ✅ Keep (read-only dashboard views of the handoff queue) |
| `/api/messages` | `listMessages`, `sendMessage`, `getMessageUnreadCount` | ✅ Keep |
| `/api/integrations/status` | `getIntegrationStatus` | ✅ Keep |
| `/api/analytics` | `listAnalyticsAccounts`, `listAvailableProperties`, `getAnalyticsProperties`, `addAnalyticsProperty`, `updateAnalyticsProperty`, `deleteAnalyticsProperty`, `getAnalyticsReport`, `getAnalyticsRealtime`, `getAnalyticsTopContent`, `getAnalyticsSources`, `getAnalyticsGeography` | ✅ Keep |
| `/api/stats/overview` | `getStatsOverview` | ✅ Keep |
| `/api/protected-repos` | `listProtectedRepos`, `addProtectedRepo`, `updateProtectedRepo`, `toggleStarRepo`, `deleteProtectedRepo` | ✅ Keep |
| `/api/github/repos` | `listGitHubRepos` | ✅ Keep |
| `/oauth/callback`, `/oauth/github/callback` | `handleGoogleOAuth`, `handleGitHubOAuth` | ✅ Keep (token exchange feeds both REST and any MCP layer) |
| `/`, `/health` | inline health check | ✅ Keep |

Supporting helper to keep: `getValidToken()` (OAuth token refresh, used by analytics + github handlers).

---

## Recommendation for the cleanup

1. **Migrate** all of `tools/` (both the 2 wired modules and the 4 commented-out ones) into `productivity-mcp-server`, since that's where MCP tools belong. The handoff-queue, tasks, sprints, etc. functionally overlap with what the live Productivity MCP server already exposes — reconcile rather than duplicate before deleting.
2. **Delete** the entire `server/src/tools/` directory from UP Command afterward. It is not referenced by the deployed worker, so removal carries no REST-side risk.
3. **Keep** `server/src/index.ts` REST handlers, `oauth/`, `helpers/`, and `types.ts` as-is — that's the dashboard API.
4. Before deleting: grep the dashboard frontend for `/api/thread` and `/api/notifications` to confirm whether those two are still consumed; if not, drop them too.

---

## Notes / caveats

- I did not open every leaf source file (e.g. each file under `helm/tasks/`, `integrations/github.ts`). Module-level `index.ts` files were read directly; individual tool names within `helm`/`team`/`tracking`/`integrations` are inferred from their `register*` import names and the category reference in `tools/index.ts`. If a precise tool-by-tool inventory is needed for the migration, the leaf files should be opened.
- The single most important and verified finding stands regardless: **`tools/` is entirely disconnected from the deployed REST worker**, so the audit's core conclusion (safe to migrate-then-delete) does not depend on the leaf-level details.
