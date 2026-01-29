/**
 * UP Command MCP Server
 * Main entry point with MCP agent, OAuth, and API routing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import type { Env, ToolContext } from './types.js';
import { registerAllTools } from './tools/index.js';
import { GOOGLE_TOKEN_URL, GITHUB_TOKEN_URL, SERVICE_NAMES } from './oauth/index.js';

// ==================
// MCP AGENT
// ==================
export class UpCommandMCP extends McpAgent {
  server = new McpServer({ name: "UP Command", version: "1.0.0" });

  async init() {
    const env = this.env as Env;
    const userId = env.USER_ID || 'micaiah';

    const getTeammates = (): string[] => {
      const team = env.TEAM || 'micaiah,irene';
      return team.split(',').map((t: string) => t.trim()).filter((t: string) => t !== userId);
    };

    const ctx: ToolContext = {
      server: this.server,
      env,
      getCurrentUser: () => userId,
      getTeammates,
      getTeammate: () => getTeammates()[0] || 'unknown',
    };

    registerAllTools(ctx);
  }
}

// ==================
// REQUEST ROUTING
// ==================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const userId = env.USER_ID || 'micaiah';
    const workerName = env.WORKER_NAME || 'up-command';
    const workerUrl = `https://${workerName}.micaiah-tasks.workers.dev`;

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        name: 'UP Command',
        version: '1.0.0',
        user: userId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // REST API routes for dashboard
    if (url.pathname.startsWith('/api/')) {
      return handleApiRoutes(request, env, url, userId);
    }

    // Google OAuth callback
    if (url.pathname === '/oauth/callback') {
      return handleGoogleOAuth(request, env, workerUrl);
    }

    // GitHub OAuth callback
    if (url.pathname === '/oauth/github/callback') {
      return handleGitHubOAuth(request, env, workerUrl);
    }

    // MCP SSE endpoint
    if (url.pathname.startsWith('/sse')) {
      return UpCommandMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },
};

// ==================
// API ROUTES
// ==================
async function handleApiRoutes(request: Request, env: Env, url: URL, userId: string): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const path = url.pathname.replace('/api/', '');
  const segments = path.split('/').filter(Boolean);
  const method = request.method;

  try {
    // TASKS
    if (segments[0] === 'tasks') {
      if (segments[1] === 'stats' && method === 'GET') {
        return json(await getTaskStats(env, userId), cors);
      }
      if (segments.length === 2 && segments[1] !== 'stats') {
        const taskId = segments[1];
        if (method === 'GET') return json(await getTask(env, taskId), cors);
        if (method === 'PUT') return json(await updateTask(env, taskId, await request.json()), cors);
      }
      if (segments[2] === 'complete' && method === 'POST') {
        return json(await completeTask(env, segments[1]), cors);
      }
      if (segments.length === 1) {
        if (method === 'GET') return json(await listTasks(env, userId, url), cors);
        if (method === 'POST') return json(await createTask(env, userId, await request.json()), cors);
      }
    }

    // SPRINTS
    if (segments[0] === 'sprints') {
      if (segments[1] === 'current' && method === 'GET') {
        return json(await getCurrentSprint(env, userId), cors);
      }
      if (segments.length === 2) {
        const sprintId = segments[1];
        if (method === 'PUT') return json(await updateSprint(env, sprintId, await request.json()), cors);
      }
      if (segments.length === 1) {
        if (method === 'GET') return json(await listSprints(env, userId), cors);
        if (method === 'POST') return json(await createSprint(env, userId, await request.json()), cors);
      }
    }

    // THREAD (Activity Feed)
    if (segments[0] === 'thread') {
      if (segments[1] === 'unread-count' && method === 'GET') {
        return json(await getUnreadCount(env, userId), cors);
      }
      if (segments.length === 1 && method === 'GET') {
        return json(await getActivityFeed(env, userId, url), cors);
      }
    }

    // HANDOFF
    if (segments[0] === 'handoff') {
      if (segments[1] === 'projects') {
        if (segments.length === 2 && method === 'GET') {
          return json(await listHandoffProjects(env), cors);
        }
        if (segments.length === 3 && method === 'GET') {
          return json(await getHandoffProject(env, decodeURIComponent(segments[2])), cors);
        }
      }
      if (segments[1] === 'queue' && method === 'GET') {
        return json(await getHandoffQueue(env, url), cors);
      }
    }

    // MESSAGES
    if (segments[0] === 'messages') {
      if (segments[1] === 'unread-count' && method === 'GET') {
        return json(await getMessageUnreadCount(env, userId), cors);
      }
      if (segments.length === 1) {
        if (method === 'GET') return json(await listMessages(env, userId, url), cors);
        if (method === 'POST') return json(await sendMessage(env, userId, await request.json()), cors);
      }
    }

    // INTEGRATIONS
    if (segments[0] === 'integrations' && segments[1] === 'status' && method === 'GET') {
      return json(await getIntegrationStatus(env, userId), cors);
    }

    // STATS
    if (segments[0] === 'stats' && segments[1] === 'overview' && method === 'GET') {
      return json(await getStatsOverview(env, userId), cors);
    }

    return json({ error: 'Not found', path }, cors, 404);
  } catch (err: any) {
    return json({ error: err.message }, cors, 500);
  }
}

function json(data: any, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers });
}

// ==================
// TASK HANDLERS
// ==================
async function listTasks(env: Env, userId: string, url: URL) {
  const status = url.searchParams.get('status') || 'open';
  const category = url.searchParams.get('category');
  const project = url.searchParams.get('project');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let sql = `SELECT * FROM tasks WHERE user_id = ?`;
  const params: any[] = [userId];

  if (status !== 'all') {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (project) {
    sql += ` AND project = ?`;
    params.push(project);
  }

  sql += ` ORDER BY is_active DESC, priority ASC, created_at DESC LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(sql).bind(...params).all();
  return { tasks: result.results || [], count: result.results?.length || 0 };
}

async function getTaskStats(env: Env, userId: string) {
  const total = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE user_id = ?`
  ).bind(userId).first() as any;

  const open = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open'`
  ).bind(userId).first() as any;

  const active = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND is_active = 1 AND status = 'open'`
  ).bind(userId).first() as any;

  const today = new Date().toISOString().split('T')[0];
  const completedToday = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND date(completed_at) = ?`
  ).bind(userId, today).first() as any;

  const overdue = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open' AND due_date < ?`
  ).bind(userId, today).first() as any;

  return {
    total: total?.count || 0,
    open: open?.count || 0,
    active: active?.count || 0,
    completedToday: completedToday?.count || 0,
    overdue: overdue?.count || 0
  };
}

async function getTask(env: Env, taskId: string) {
  const task = await env.DB.prepare(
    `SELECT * FROM tasks WHERE id = ? OR id LIKE ?`
  ).bind(taskId, `%${taskId}%`).first();
  if (!task) return { error: 'Task not found' };
  return { task };
}

async function createTask(env: Env, userId: string, data: any) {
  const id = `task-${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(`
    INSERT INTO tasks (id, user_id, text, priority, project, category, due_date, notes, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId, data.text, data.priority || 3,
    data.project || null, data.category || null,
    data.due_date || null, data.notes || null,
    data.is_active ? 1 : 0
  ).run();
  return { id, success: true };
}

async function updateTask(env: Env, taskId: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (['text', 'priority', 'project', 'category', 'due_date', 'notes', 'is_active'].includes(key)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (fields.length === 0) return { error: 'No valid fields' };

  params.push(taskId);
  await env.DB.prepare(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? OR id LIKE ?`
  ).bind(...params, `%${taskId}%`).run();

  return { success: true };
}

async function completeTask(env: Env, taskId: string) {
  await env.DB.prepare(`
    UPDATE tasks SET status = 'done', completed_at = datetime('now'), is_active = 0
    WHERE id = ? OR id LIKE ?
  `).bind(taskId, `%${taskId}%`).run();
  return { success: true };
}

// ==================
// SPRINT HANDLERS
// ==================
async function listSprints(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `SELECT * FROM sprints WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
  ).bind(userId).all();
  return { sprints: result.results || [] };
}

async function getCurrentSprint(env: Env, userId: string) {
  const sprint = await env.DB.prepare(
    `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
  ).bind(userId).first();

  if (!sprint) return { sprint: null };

  const objectives = await env.DB.prepare(
    `SELECT * FROM sprint_objectives WHERE sprint_id = ?`
  ).bind((sprint as any).id).all();

  const tasks = await env.DB.prepare(`
    SELECT t.*, st.objective_id FROM tasks t
    JOIN sprint_tasks st ON t.id = st.task_id
    WHERE st.sprint_id = ?
  `).bind((sprint as any).id).all();

  return { 
    sprint, 
    objectives: objectives.results || [],
    tasks: tasks.results || []
  };
}

async function createSprint(env: Env, userId: string, data: any) {
  const id = `sprint-${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(`
    INSERT INTO sprints (id, user_id, name, end_date)
    VALUES (?, ?, ?, ?)
  `).bind(id, userId, data.name, data.end_date).run();
  return { id, success: true };
}

async function updateSprint(env: Env, sprintId: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (['name', 'end_date', 'status'].includes(key)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (fields.length === 0) return { error: 'No valid fields' };

  params.push(sprintId);
  await env.DB.prepare(
    `UPDATE sprints SET ${fields.join(', ')} WHERE id = ? OR id LIKE ?`
  ).bind(...params, `%${sprintId}%`).run();

  return { success: true };
}

// ==================
// THREAD (Activity Feed) HANDLERS
// ==================
async function getActivityFeed(env: Env, userId: string, url: URL) {
  const limit = parseInt(url.searchParams.get('limit') || '30');
  const items: any[] = [];

  // Recent completed tasks
  const tasks = await env.DB.prepare(`
    SELECT id, text, 'task_completed' as type, completed_at as timestamp
    FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at IS NOT NULL
    ORDER BY completed_at DESC LIMIT 10
  `).bind(userId).all();
  items.push(...(tasks.results || []));

  // Recent messages
  const messages = await env.DB.prepare(`
    SELECT id, content as text, 'message' as type, created_at as timestamp, from_user
    FROM messages WHERE to_user = ?
    ORDER BY created_at DESC LIMIT 10
  `).bind(userId).all();
  items.push(...(messages.results || []));

  // Recent check-ins
  const checkins = await env.DB.prepare(`
    SELECT id, thread_summary as text, 'checkin' as type, created_at as timestamp
    FROM check_ins WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 10
  `).bind(userId).all();
  items.push(...(checkins.results || []));

  // Sort by timestamp
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { items: items.slice(0, limit) };
}

async function getUnreadCount(env: Env, userId: string) {
  const messages = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM messages WHERE to_user = ? AND read_at IS NULL`
  ).bind(userId).first() as any;

  return { count: messages?.count || 0 };
}

// ==================
// HANDOFF HANDLERS
// ==================
async function listHandoffProjects(env: Env) {
  const result = await env.DB.prepare(`
    SELECT project_name, 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete
    FROM handoff_tasks 
    WHERE project_name IS NOT NULL
    GROUP BY project_name
  `).all();

  return { projects: result.results || [] };
}

async function getHandoffProject(env: Env, projectName: string) {
  const tasks = await env.DB.prepare(`
    SELECT * FROM handoff_tasks WHERE project_name = ?
    ORDER BY 
      CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      created_at ASC
  `).bind(projectName).all();

  const stats = await env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM handoff_tasks
    WHERE project_name = ? GROUP BY status
  `).bind(projectName).all();

  return { 
    project: projectName,
    tasks: tasks.results || [],
    stats: stats.results || []
  };
}

async function getHandoffQueue(env: Env, url: URL) {
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let sql = `SELECT * FROM handoff_tasks WHERE 1=1`;
  const params: any[] = [];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY 
    CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
    created_at ASC LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(sql).bind(...params).all();
  return { tasks: result.results || [] };
}

// ==================
// MESSAGE HANDLERS
// ==================
async function listMessages(env: Env, userId: string, url: URL) {
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const withUser = url.searchParams.get('with');

  let sql = `SELECT * FROM messages WHERE (from_user = ? OR to_user = ?)`;
  const params: any[] = [userId, userId];

  if (withUser) {
    sql += ` AND (from_user = ? OR to_user = ?)`;
    params.push(withUser, withUser);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(sql).bind(...params).all();
  return { messages: result.results || [] };
}

async function sendMessage(env: Env, userId: string, data: any) {
  const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(`
    INSERT INTO messages (id, from_user, to_user, content)
    VALUES (?, ?, ?, ?)
  `).bind(id, userId, data.to, data.content).run();
  return { id, success: true };
}

async function getMessageUnreadCount(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM messages WHERE to_user = ? AND read_at IS NULL`
  ).bind(userId).first() as any;
  return { count: result?.count || 0 };
}

// ==================
// INTEGRATION HANDLERS
// ==================
async function getIntegrationStatus(env: Env, userId: string) {
  const tokens = await env.DB.prepare(
    `SELECT provider, expires_at FROM oauth_tokens WHERE user_id = ?`
  ).bind(userId).all();

  const services: Record<string, boolean> = {
    google_drive: false,
    gmail_personal: false,
    gmail_company: false,
    blogger_personal: false,
    blogger_company: false,
    github: false
  };

  (tokens.results || []).forEach((t: any) => {
    services[t.provider] = true;
  });

  return { services };
}

// ==================
// STATS HANDLERS
// ==================
async function getStatsOverview(env: Env, userId: string) {
  const taskStats = await getTaskStats(env, userId);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString();

  const weekCompleted = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at >= ?`
  ).bind(userId, weekStr).first() as any;

  const sprint = await env.DB.prepare(
    `SELECT * FROM sprints WHERE user_id = ? AND status = 'active' LIMIT 1`
  ).bind(userId).first();

  const handoffPending = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM handoff_tasks WHERE status = 'pending'`
  ).first() as any;

  return {
    tasks: taskStats,
    weekCompleted: weekCompleted?.count || 0,
    activeSprint: sprint || null,
    handoffPending: handoffPending?.count || 0
  };
}

// ==================
// OAUTH HANDLERS
// ==================
async function handleGoogleOAuth(request: Request, env: Env, workerUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing params', { status: 400 });
  }

  const [stateUserId, provider] = state.includes(':')
    ? state.split(':')
    : [state, 'google_drive'];

  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID || '',
      client_secret: env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: workerUrl + '/oauth/callback',
      grant_type: 'authorization_code'
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return new Response('Token failed: ' + err, { status: 500 });
  }

  const tokens: any = await tokenResp.json();
  const exp = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?) 
     ON CONFLICT(user_id, provider) DO UPDATE SET 
       access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?`
  ).bind(
    crypto.randomUUID(),
    stateUserId,
    provider,
    tokens.access_token,
    tokens.refresh_token,
    exp,
    new Date().toISOString(),
    tokens.access_token,
    tokens.refresh_token,
    exp
  ).run();

  const serviceName = SERVICE_NAMES[provider] || provider;
  return new Response(
    `<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0">
      <div style="text-align:center">
        <h1>✅ ${serviceName} Connected!</h1>
        <p>Close this window and return to Claude</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

async function handleGitHubOAuth(request: Request, env: Env, workerUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing params', { status: 400 });
  }

  const [stateUserId] = state.split(':');

  const tokenResp = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID || '',
      client_secret: env.GITHUB_CLIENT_SECRET || '',
      code: code,
      redirect_uri: workerUrl + '/oauth/github/callback',
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return new Response('GitHub token failed: ' + err, { status: 500 });
  }

  const tokens: any = await tokenResp.json();
  
  if (tokens.error) {
    return new Response('GitHub error: ' + tokens.error_description, { status: 500 });
  }

  await env.DB.prepare(
    `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?) 
     ON CONFLICT(user_id, provider) DO UPDATE SET 
       access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?`
  ).bind(
    crypto.randomUUID(),
    stateUserId,
    'github',
    tokens.access_token,
    null,
    null,
    new Date().toISOString(),
    tokens.access_token,
    null,
    null
  ).run();

  return new Response(
    `<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0">
      <div style="text-align:center">
        <h1>✅ GitHub Connected!</h1>
        <p>Close this window and return to Claude</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
