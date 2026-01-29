/**
 * UP Command API Server
 * REST API for the UP Command dashboard
 * Updated: 2026-01-29 - Added Google Analytics Admin API
 */

import type { Env } from './types.js';
import { GOOGLE_TOKEN_URL, GITHUB_TOKEN_URL, SERVICE_NAMES } from './oauth/index.js';

const ANALYTICS_DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const ANALYTICS_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta';

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
        status: 'ok', name: 'UP Command', version: '1.0.3', user: userId
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRoutes(request, env, url, userId);
    }

    // OAuth callbacks
    if (url.pathname === '/oauth/callback') {
      return handleGoogleOAuth(request, env, workerUrl);
    }

    if (url.pathname === '/oauth/github/callback') {
      return handleGitHubOAuth(request, env, workerUrl);
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const path = url.pathname.replace('/api/', '');
  const segments = path.split('/').filter(Boolean);
  const method = request.method;

  try {
    // TASKS
    if (segments[0] === 'tasks') {
      if (segments[1] === 'stats' && method === 'GET') return json(await getTaskStats(env, userId), cors);
      if (segments.length === 2 && segments[1] !== 'stats') {
        if (method === 'GET') return json(await getTask(env, segments[1]), cors);
        if (method === 'PUT') return json(await updateTask(env, segments[1], await request.json()), cors);
        if (method === 'DELETE') return json(await deleteTask(env, userId, segments[1]), cors);
      }
      if (segments[2] === 'complete' && method === 'POST') return json(await completeTask(env, segments[1]), cors);
      if (segments.length === 1) {
        if (method === 'GET') return json(await listTasks(env, userId, url), cors);
        if (method === 'POST') return json(await createTask(env, userId, await request.json()), cors);
      }
    }

    // ROUTINES - dedicated endpoint with proper logic
    if (segments[0] === 'routines') {
      if (method === 'GET') return json(await getRoutines(env, userId), cors);
    }

    // SPRINTS
    if (segments[0] === 'sprints') {
      if (segments[1] === 'current' && method === 'GET') return json(await getCurrentSprint(env, userId), cors);
      if (segments.length === 2 && method === 'PUT') return json(await updateSprint(env, segments[1], await request.json()), cors);
      if (segments.length === 1) {
        if (method === 'GET') return json(await listSprints(env, userId), cors);
        if (method === 'POST') return json(await createSprint(env, userId, await request.json()), cors);
      }
    }

    // ACTIVITY (for Thread page - uses 'types' param and returns 'data' array)
    if (segments[0] === 'activity') {
      if (segments.length === 1 && method === 'GET') return json(await getActivityForDashboard(env, userId, url), cors);
    }

    // THREAD (Activity Feed - legacy endpoint)
    if (segments[0] === 'thread') {
      if (segments[1] === 'unread-count' && method === 'GET') return json(await getUnreadCount(env, userId), cors);
      if (segments.length === 1 && method === 'GET') return json(await getActivityFeed(env, userId, url), cors);
    }

    // NOTIFICATIONS (stub - returns 0)
    if (segments[0] === 'notifications') {
      if (segments[1] === 'unread' && method === 'GET') return json({ count: 0 }, cors);
      if (segments.length === 1 && method === 'GET') return json({ notifications: [] }, cors);
    }

    // HANDOFF
    if (segments[0] === 'handoff') {
      if (segments[1] === 'projects') {
        if (segments.length === 2 && method === 'GET') return json(await listHandoffProjects(env), cors);
        if (segments.length === 3 && method === 'GET') return json(await getHandoffProject(env, decodeURIComponent(segments[2])), cors);
      }
      if (segments[1] === 'queue' && method === 'GET') return json(await getHandoffQueue(env, url), cors);
    }

    // MESSAGES
    if (segments[0] === 'messages') {
      if (segments[1] === 'unread-count' && method === 'GET') return json(await getMessageUnreadCount(env, userId), cors);
      if (segments.length === 1) {
        if (method === 'GET') return json(await listMessages(env, userId, url), cors);
        if (method === 'POST') return json(await sendMessage(env, userId, await request.json()), cors);
      }
    }

    // INTEGRATIONS
    if (segments[0] === 'integrations' && segments[1] === 'status' && method === 'GET') {
      return json(await getIntegrationStatus(env, userId), cors);
    }

    // ANALYTICS - Full GA4 integration with Admin API
    if (segments[0] === 'analytics') {
      // Admin: List GA4 accounts from Google
      if (segments[1] === 'accounts' && method === 'GET') {
        return json(await listAnalyticsAccounts(env, userId), cors);
      }
      // Admin: List available properties from Google (not yet added locally)
      if (segments[1] === 'available' && method === 'GET') {
        return json(await listAvailableProperties(env, userId), cors);
      }
      // Properties CRUD
      if (segments[1] === 'properties') {
        // GET /analytics/properties - list configured properties
        if (segments.length === 2 && method === 'GET') {
          return json(await getAnalyticsProperties(env, userId), cors);
        }
        // POST /analytics/properties - add a new property
        if (segments.length === 2 && method === 'POST') {
          return json(await addAnalyticsProperty(env, userId, await request.json()), cors);
        }
        // PUT /analytics/properties/:id - update a property
        if (segments.length === 3 && method === 'PUT') {
          return json(await updateAnalyticsProperty(env, userId, segments[2], await request.json()), cors);
        }
        // DELETE /analytics/properties/:id - remove a property
        if (segments.length === 3 && method === 'DELETE') {
          return json(await deleteAnalyticsProperty(env, userId, segments[2]), cors);
        }
      }
      // Reporting endpoints
      if (segments[1] === 'report' && method === 'GET') {
        return json(await getAnalyticsReport(env, userId, url), cors);
      }
      if (segments[1] === 'realtime' && method === 'GET') {
        return json(await getAnalyticsRealtime(env, userId, url), cors);
      }
      if (segments[1] === 'top-content' && method === 'GET') {
        return json(await getAnalyticsTopContent(env, userId, url), cors);
      }
      if (segments[1] === 'sources' && method === 'GET') {
        return json(await getAnalyticsSources(env, userId, url), cors);
      }
      if (segments[1] === 'geography' && method === 'GET') {
        return json(await getAnalyticsGeography(env, userId, url), cors);
      }
    }

    // STATS
    if (segments[0] === 'stats' && segments[1] === 'overview' && method === 'GET') {
      return json(await getStatsOverview(env, userId), cors);
    }

    return json({ error: 'Not found', path }, cors, 404);
  } catch (err: any) {
    console.error('API Error:', err);
    return json({ error: err.message }, cors, 500);
  }
}

function json(data: any, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers });
}

// ==================
// TOKEN HELPERS
// ==================
async function getValidToken(env: Env, userId: string, provider: string = 'google_drive'): Promise<string | null> {
  const token = await env.DB.prepare(
    'SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).bind(userId, provider).first() as any;
  
  if (!token) return null;
  
  // GitHub tokens don't expire the same way
  if (provider === 'github') {
    return token.access_token;
  }
  
  // Check if token is expired
  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    // Refresh the token
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) return null;
    
    const data: any = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    
    await env.DB.prepare(
      'UPDATE oauth_tokens SET access_token = ?, expires_at = ? WHERE user_id = ? AND provider = ?'
    ).bind(data.access_token, expiresAt, userId, provider).run();
    
    return data.access_token;
  }
  
  return token.access_token;
}

// ==================
// TASK HANDLERS
// ==================
async function listTasks(env: Env, userId: string, url: URL) {
  const status = url.searchParams.get('status') || 'open';
  const category = url.searchParams.get('category');
  const project = url.searchParams.get('project');
  const isActive = url.searchParams.get('is_active');
  const isRecurring = url.searchParams.get('is_recurring');
  const completedAfter = url.searchParams.get('completed_after');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let sql = `SELECT * FROM tasks WHERE user_id = ?`;
  const params: any[] = [userId];

  if (status !== 'all') { sql += ` AND status = ?`; params.push(status); }
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (project) { sql += ` AND project = ?`; params.push(project); }
  if (isActive === 'true') { sql += ` AND is_active = 1`; }
  if (isActive === 'false') { sql += ` AND is_active = 0`; }
  if (isRecurring === 'true') { sql += ` AND recurrence IS NOT NULL AND recurrence != ''`; }
  if (isRecurring === 'false') { sql += ` AND (recurrence IS NULL OR recurrence = '')`; }
  if (completedAfter) { sql += ` AND date(completed_at) >= ?`; params.push(completedAfter); }

  sql += ` ORDER BY is_active DESC, priority ASC, created_at DESC LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(sql).bind(...params).all();
  return { tasks: result.results || [], count: result.results?.length || 0 };
}

async function getTaskStats(env: Env, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const [total, open, active, completedToday, overdue] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ?`).bind(userId).first(),
    env.DB.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open'`).bind(userId).first(),
    env.DB.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND is_active = 1 AND status = 'open'`).bind(userId).first(),
    env.DB.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND date(completed_at) = ?`).bind(userId, today).first(),
    env.DB.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'open' AND due_date < ?`).bind(userId, today).first()
  ]);

  return {
    total: (total as any)?.count || 0,
    open: (open as any)?.count || 0,
    active: (active as any)?.count || 0,
    completedToday: (completedToday as any)?.count || 0,
    overdue: (overdue as any)?.count || 0
  };
}

async function getTask(env: Env, taskId: string) {
  const task = await env.DB.prepare(`SELECT * FROM tasks WHERE id = ? OR id LIKE ?`).bind(taskId, `%${taskId}%`).first();
  return task ? { task } : { error: 'Task not found' };
}

async function createTask(env: Env, userId: string, data: any) {
  const id = `task-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO tasks (id, user_id, text, priority, project, category, due_date, notes, is_active, recurrence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, userId, data.text, data.priority || 3, data.project || null, data.category || null, data.due_date || null, data.notes || null, data.is_active ? 1 : 0, data.recurrence || null, now).run();
  return { id, success: true };
}

async function updateTask(env: Env, taskId: string, data: any) {
  const fields: string[] = [], params: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (['text', 'priority', 'project', 'category', 'due_date', 'notes', 'is_active', 'recurrence', 'status'].includes(key)) {
      fields.push(`${key} = ?`); params.push(value);
    }
  }
  if (fields.length === 0) return { error: 'No valid fields' };
  params.push(taskId);
  await env.DB.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? OR id LIKE ?`).bind(...params, `%${taskId}%`).run();
  return { success: true };
}

async function deleteTask(env: Env, userId: string, taskId: string) {
  const result = await env.DB.prepare(
    `DELETE FROM tasks WHERE (id = ? OR id LIKE ?) AND user_id = ?`
  ).bind(taskId, `%${taskId}%`, userId).run();
  
  return { 
    success: true, 
    deleted: result.meta?.changes || 0 
  };
}

async function completeTask(env: Env, taskId: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE tasks SET status = 'done', completed_at = ?, is_active = 0 WHERE id = ? OR id LIKE ?`).bind(now, taskId, `%${taskId}%`).run();
  return { success: true };
}

// ==================
// ROUTINES HANDLER
// ==================
async function getRoutines(env: Env, userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayName = dayNames[dayOfWeek];
  
  const result = await env.DB.prepare(
    `SELECT * FROM tasks WHERE user_id = ? AND recurrence IS NOT NULL AND recurrence != '' ORDER BY text`
  ).bind(userId).all();
  
  const allRoutines = result.results || [];
  
  function isDueToday(recurrence: string): boolean {
    if (!recurrence) return false;
    const r = recurrence.toLowerCase();
    
    if (r === 'daily') return true;
    if (r === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
    if (r === 'weekly') return true;
    if (r === 'biweekly') return true;
    if (r === 'monthly') return true;
    if (r === 'yearly') return true;
    if (r === todayName) return true;
    
    if (r.includes(',')) {
      const days = r.split(',').map(d => d.trim().toLowerCase());
      return days.includes(todayName);
    }
    
    return false;
  }
  
  function isCompletedToday(completedAt: string | null): boolean {
    if (!completedAt) return false;
    return completedAt.split('T')[0] === todayStr;
  }
  
  const todayRoutines: any[] = [];
  let doneToday = 0;
  let remaining = 0;
  
  allRoutines.forEach((routine: any) => {
    const dueToday = isDueToday(routine.recurrence);
    const completedToday = isCompletedToday(routine.completed_at);
    
    routine.due_today = dueToday;
    routine.completed_today = completedToday;
    
    if (dueToday) {
      todayRoutines.push(routine);
      if (completedToday) {
        doneToday++;
      } else {
        remaining++;
      }
    }
  });
  
  const historyResult = await env.DB.prepare(
    `SELECT date(completed_at) as date, COUNT(*) as count 
     FROM tasks 
     WHERE user_id = ? 
       AND recurrence IS NOT NULL AND recurrence != ''
       AND completed_at IS NOT NULL 
       AND date(completed_at) >= date('now', '-28 days')
     GROUP BY date(completed_at)
     ORDER BY date DESC`
  ).bind(userId).all();
  
  const completionHistory: Record<string, number> = {};
  (historyResult.results || []).forEach((row: any) => {
    completionHistory[row.date] = row.count;
  });
  
  return {
    all: allRoutines,
    today: todayRoutines,
    stats: {
      total: allRoutines.length,
      doneToday,
      remaining,
      todayTotal: todayRoutines.length
    },
    completionHistory
  };
}

// ==================
// SPRINT HANDLERS
// ==================
async function listSprints(env: Env, userId: string) {
  const result = await env.DB.prepare(`SELECT * FROM sprints WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`).bind(userId).all();
  return { sprints: result.results || [] };
}

async function getCurrentSprint(env: Env, userId: string) {
  try {
    const sprint = await env.DB.prepare(`SELECT * FROM sprints WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`).bind(userId).first();
    if (!sprint) return { sprint: null, objectives: [], tasks: [] };

    const objectivesResult = await env.DB.prepare(`SELECT * FROM objectives WHERE sprint_id = ? ORDER BY sort_order ASC`).bind((sprint as any).id).all();
    const objectives = objectivesResult.results || [];

    const allTasks: any[] = [];
    
    if (objectives.length > 0) {
      const objectiveIds = objectives.map((o: any) => o.id);
      const placeholders = objectiveIds.map(() => '?').join(',');
      const tasksResult = await env.DB.prepare(
        `SELECT * FROM tasks WHERE user_id = ? AND objective_id IN (${placeholders}) ORDER BY status ASC, is_active DESC, priority DESC`
      ).bind(userId, ...objectiveIds).all();
      
      allTasks.push(...(tasksResult.results || []));
    }

    return { sprint, objectives, tasks: allTasks };
  } catch (e: any) {
    console.error('getCurrentSprint error:', e);
    return { sprint: null, objectives: [], tasks: [], error: e.message };
  }
}

async function createSprint(env: Env, userId: string, data: any) {
  const id = `sprint-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO sprints (id, user_id, name, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, userId, data.name, data.end_date, now, now).run();
  return { id, success: true };
}

async function updateSprint(env: Env, sprintId: string, data: any) {
  const fields: string[] = [], params: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (['name', 'end_date', 'status'].includes(key)) { fields.push(`${key} = ?`); params.push(value); }
  }
  if (fields.length === 0) return { error: 'No valid fields' };
  fields.push(`updated_at = ?`); params.push(new Date().toISOString());
  params.push(sprintId);
  await env.DB.prepare(`UPDATE sprints SET ${fields.join(', ')} WHERE id = ? OR id LIKE ?`).bind(...params, `%${sprintId}%`).run();
  return { success: true };
}

// ==================
// ACTIVITY FEED (for Dashboard Thread page)
// ==================
interface DashboardActivityItem {
  id: string;
  type: string;
  user: string;
  created_at: string;
  summary?: string;
  narrative?: string;
  full_recap?: string;
  project?: string;
  shipped?: string[];
  unread?: boolean;
}

async function getActivityForDashboard(env: Env, userId: string, url: URL) {
  const limit = parseInt(url.searchParams.get('limit') || '30');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const typesParam = url.searchParams.get('types');
  const search = url.searchParams.get('search');
  
  const allowedTypes = typesParam ? typesParam.split(',').map(t => t.trim()) : null;
  const items: DashboardActivityItem[] = [];

  // Check-ins
  if (!allowedTypes || allowedTypes.includes('checkin')) {
    try {
      let sql = `SELECT id, user_id, project_name, thread_summary, full_recap, created_at FROM check_ins WHERE user_id = ?`;
      const params: any[] = [userId];
      if (search) { sql += ` AND (thread_summary LIKE ? OR full_recap LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit * 2);
      
      const checkins = await env.DB.prepare(sql).bind(...params).all();
      (checkins.results || []).forEach((r: any) => items.push({
        id: r.id, type: 'checkin', user: r.user_id === userId ? 'You' : r.user_id,
        created_at: r.created_at, summary: r.thread_summary, full_recap: r.full_recap, project: r.project_name
      }));
    } catch (e) { console.error('checkins error:', e); }
  }

  // Work Logs
  if (!allowedTypes || allowedTypes.includes('worklog')) {
    try {
      let sql = `SELECT id, user_id, narrative, shipped, created_at FROM work_logs WHERE user_id = ?`;
      const params: any[] = [userId];
      if (search) { sql += ` AND narrative LIKE ?`; params.push(`%${search}%`); }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit * 2);
      
      const worklogs = await env.DB.prepare(sql).bind(...params).all();
      (worklogs.results || []).forEach((r: any) => {
        let shipped: string[] = [];
        try { shipped = r.shipped ? JSON.parse(r.shipped) : []; } catch (e) {}
        items.push({ id: r.id, type: 'worklog', user: r.user_id === userId ? 'You' : r.user_id,
          created_at: r.created_at, narrative: r.narrative, shipped });
      });
    } catch (e) { console.error('worklogs error:', e); }
  }

  // Task completions
  if (!allowedTypes || allowedTypes.includes('task_complete')) {
    try {
      let sql = `SELECT id, user_id, text, project, category, completed_at FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at IS NOT NULL`;
      const params: any[] = [userId];
      if (search) { sql += ` AND text LIKE ?`; params.push(`%${search}%`); }
      sql += ` ORDER BY completed_at DESC LIMIT ?`;
      params.push(limit * 2);
      
      const tasks = await env.DB.prepare(sql).bind(...params).all();
      (tasks.results || []).forEach((r: any) => items.push({
        id: r.id, type: 'task_complete', user: r.user_id === userId ? 'You' : r.user_id,
        created_at: r.completed_at, summary: r.text, project: r.project || r.category
      }));
    } catch (e) { console.error('tasks error:', e); }
  }

  // Messages
  if (!allowedTypes || allowedTypes.includes('message')) {
    try {
      let sql = `SELECT id, from_user, to_user, content, read_at, created_at FROM messages WHERE to_user = ?`;
      const params: any[] = [userId];
      if (search) { sql += ` AND content LIKE ?`; params.push(`%${search}%`); }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit * 2);
      
      const messages = await env.DB.prepare(sql).bind(...params).all();
      (messages.results || []).forEach((r: any) => items.push({
        id: r.id, type: 'message', user: r.from_user,
        created_at: r.created_at, summary: r.content, unread: !r.read_at
      }));
    } catch (e) { console.error('messages error:', e); }
  }

  // Handoffs
  const handoffTypes = ['handoff_created', 'handoff_complete', 'handoff_blocked', 'handoff_claimed'];
  if (!allowedTypes || handoffTypes.some(t => allowedTypes.includes(t))) {
    try {
      let sql = `SELECT id, instruction, output_summary, project_name, status, created_by, claimed_by, created_at, claimed_at, completed_at FROM handoff_queue WHERE created_by = ? OR claimed_by = ?`;
      const params: any[] = [userId, userId];
      if (search) { sql += ` AND (instruction LIKE ? OR output_summary LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit * 2);
      
      const handoffs = await env.DB.prepare(sql).bind(...params).all();
      (handoffs.results || []).forEach((r: any) => {
        if (r.status === 'complete' && r.completed_at && (!allowedTypes || allowedTypes.includes('handoff_complete'))) {
          items.push({ id: r.id + '-complete', type: 'handoff_complete', user: r.claimed_by === userId ? 'You' : r.claimed_by,
            created_at: r.completed_at, summary: r.output_summary || r.instruction, project: r.project_name });
        } else if (r.status === 'blocked' && (!allowedTypes || allowedTypes.includes('handoff_blocked'))) {
          items.push({ id: r.id + '-blocked', type: 'handoff_blocked', user: r.claimed_by === userId ? 'You' : r.claimed_by,
            created_at: r.claimed_at || r.created_at, summary: r.instruction, project: r.project_name });
        } else if (r.claimed_by && r.claimed_at && (!allowedTypes || allowedTypes.includes('handoff_claimed'))) {
          items.push({ id: r.id + '-claimed', type: 'handoff_claimed', user: r.claimed_by === userId ? 'You' : r.claimed_by,
            created_at: r.claimed_at, summary: r.instruction, project: r.project_name });
        }
        if (!allowedTypes || allowedTypes.includes('handoff_created')) {
          items.push({ id: r.id + '-created', type: 'handoff_created', user: r.created_by === userId ? 'You' : r.created_by,
            created_at: r.created_at, summary: r.instruction, project: r.project_name });
        }
      });
    } catch (e) { console.error('handoffs error:', e); }
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { data: items.slice(offset, offset + limit) };
}

// ==================
// THREAD (Legacy Activity Feed)
// ==================
interface ActivityItem { id: string; type: string; user: string; timestamp: string; summary: string; data: any; }

async function getActivityFeed(env: Env, userId: string, url: URL) {
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const before = url.searchParams.get('before');
  const typeFilter = url.searchParams.get('type');
  const userFilter = url.searchParams.get('user') || userId;
  const items: ActivityItem[] = [];

  if (!typeFilter || typeFilter === 'check_in') {
    try {
      const checkins = await env.DB.prepare(`SELECT id, user_id, thread_summary, full_recap, created_at as timestamp FROM check_ins WHERE user_id = ? ${before ? `AND created_at < ?` : ''} ORDER BY created_at DESC LIMIT ?`).bind(...(before ? [userFilter, before, limit] : [userFilter, limit])).all();
      (checkins.results || []).forEach((r: any) => items.push({ id: r.id, type: 'check_in', user: r.user_id, timestamp: r.timestamp, summary: r.thread_summary, data: r }));
    } catch (e) {}
  }

  if (!typeFilter || typeFilter === 'task_complete') {
    try {
      const tasks = await env.DB.prepare(`SELECT id, user_id, text, project, category, completed_at as timestamp FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at IS NOT NULL ${before ? `AND completed_at < ?` : ''} ORDER BY completed_at DESC LIMIT ?`).bind(...(before ? [userFilter, before, limit] : [userFilter, limit])).all();
      (tasks.results || []).forEach((r: any) => items.push({ id: r.id, type: 'task_complete', user: r.user_id, timestamp: r.timestamp, summary: `Completed: ${r.text}`, data: r }));
    } catch (e) {}
  }

  if (!typeFilter || typeFilter === 'message') {
    try {
      const messages = await env.DB.prepare(`SELECT id, from_user, to_user, content, created_at as timestamp FROM messages WHERE to_user = ? ${before ? `AND created_at < ?` : ''} ORDER BY created_at DESC LIMIT ?`).bind(...(before ? [userFilter, before, limit] : [userFilter, limit])).all();
      (messages.results || []).forEach((r: any) => items.push({ id: r.id, type: 'message', user: r.from_user, timestamp: r.timestamp, summary: `From ${r.from_user}: ${r.content?.slice(0, 80)}...`, data: r }));
    } catch (e) {}
  }

  if (!typeFilter || typeFilter === 'handoff_completed') {
    try {
      const completed = await env.DB.prepare(`SELECT id, claimed_by, instruction, output_summary, project_name, completed_at as timestamp FROM handoff_queue WHERE status = 'complete' AND claimed_by = ? ${before ? `AND completed_at < ?` : ''} ORDER BY completed_at DESC LIMIT ?`).bind(...(before ? [userFilter, before, limit] : [userFilter, limit])).all();
      (completed.results || []).forEach((r: any) => items.push({ id: r.id, type: 'handoff_completed', user: r.claimed_by || 'unknown', timestamp: r.timestamp, summary: r.output_summary?.slice(0, 80) || `Completed: ${r.instruction?.slice(0, 60)}...`, data: r }));
    } catch (e) {}
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { items: items.slice(0, limit), hasMore: items.length > limit };
}

async function getUnreadCount(env: Env, userId: string) {
  try {
    const messages = await env.DB.prepare(`SELECT COUNT(*) as count FROM messages WHERE to_user = ? AND read_at IS NULL`).bind(userId).first() as any;
    return { count: messages?.count || 0 };
  } catch (e) { return { count: 0 }; }
}

// ==================
// HANDOFF HANDLERS
// ==================
async function listHandoffProjects(env: Env) {
  try {
    const result = await env.DB.prepare(`SELECT project_name, COUNT(*) as total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete FROM handoff_queue WHERE project_name IS NOT NULL GROUP BY project_name`).all();
    return { projects: result.results || [] };
  } catch (e) { return { projects: [] }; }
}

async function getHandoffProject(env: Env, projectName: string) {
  try {
    const [tasks, stats] = await Promise.all([
      env.DB.prepare(`SELECT * FROM handoff_queue WHERE project_name = ? ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, created_at ASC`).bind(projectName).all(),
      env.DB.prepare(`SELECT status, COUNT(*) as count FROM handoff_queue WHERE project_name = ? GROUP BY status`).bind(projectName).all()
    ]);
    return { project: projectName, tasks: tasks.results || [], stats: stats.results || [] };
  } catch (e) { return { project: projectName, tasks: [], stats: [] }; }
}

async function getHandoffQueue(env: Env, url: URL) {
  try {
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    let sql = `SELECT * FROM handoff_queue WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ` AND status = ?`; params.push(status); }
    sql += ` ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, created_at ASC LIMIT ?`;
    params.push(limit);
    const result = await env.DB.prepare(sql).bind(...params).all();
    return { tasks: result.results || [] };
  } catch (e) { return { tasks: [] }; }
}

// ==================
// MESSAGE HANDLERS
// ==================
async function listMessages(env: Env, userId: string, url: URL) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const withUser = url.searchParams.get('with');
    let sql = `SELECT * FROM messages WHERE (from_user = ? OR to_user = ?)`;
    const params: any[] = [userId, userId];
    if (withUser) { sql += ` AND (from_user = ? OR to_user = ?)`; params.push(withUser, withUser); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    const result = await env.DB.prepare(sql).bind(...params).all();
    return { messages: result.results || [] };
  } catch (e) { return { messages: [] }; }
}

async function sendMessage(env: Env, userId: string, data: any) {
  const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO messages (id, from_user, to_user, content, created_at) VALUES (?, ?, ?, ?, ?)`).bind(id, userId, data.to, data.content, now).run();
  return { id, success: true };
}

async function getMessageUnreadCount(env: Env, userId: string) {
  try {
    const result = await env.DB.prepare(`SELECT COUNT(*) as count FROM messages WHERE to_user = ? AND read_at IS NULL`).bind(userId).first() as any;
    return { count: result?.count || 0 };
  } catch (e) { return { count: 0 }; }
}

// ==================
// INTEGRATION HANDLERS
// ==================
async function getIntegrationStatus(env: Env, userId: string) {
  try {
    const tokens = await env.DB.prepare(`SELECT provider, expires_at FROM oauth_tokens WHERE user_id = ?`).bind(userId).all();
    const services: Record<string, boolean> = { 
      google_drive: false, gmail_personal: false, gmail_company: false, 
      blogger_personal: false, blogger_company: false, github: false,
      google_analytics: false, google_contacts_personal: false, google_contacts_company: false,
      cloudinary: true
    };
    (tokens.results || []).forEach((t: any) => { services[t.provider] = true; });
    return { services };
  } catch (e) { return { services: {} }; }
}

// ==================
// ANALYTICS ADMIN API
// ==================

// List GA4 account summaries from Google
async function listAnalyticsAccounts(env: Env, userId: string) {
  const token = await getValidToken(env, userId, 'google_analytics');
  if (!token) {
    return { accounts: [], error: 'Google Analytics not connected', needsConnection: true };
  }

  try {
    const response = await fetch(`${ANALYTICS_ADMIN_API}/accountSummaries`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.text();
      return { accounts: [], error: `GA4 Admin API error: ${error}` };
    }

    const data: any = await response.json();
    const accounts = (data.accountSummaries || []).map((account: any) => ({
      name: account.name,
      displayName: account.displayName,
      account: account.account,
      properties: (account.propertySummaries || []).map((prop: any) => ({
        property: prop.property,
        displayName: prop.displayName,
        propertyType: prop.propertyType,
        // Extract just the numeric ID from "properties/123456789"
        propertyId: prop.property?.replace('properties/', '')
      }))
    }));

    return { accounts };
  } catch (e: any) {
    return { accounts: [], error: e.message };
  }
}

// List available properties from Google that aren't already added locally
async function listAvailableProperties(env: Env, userId: string) {
  // Get all properties from Google
  const accountsResult = await listAnalyticsAccounts(env, userId);
  if (accountsResult.error) {
    return { properties: [], error: accountsResult.error };
  }

  // Get locally configured properties
  const localProps = await env.DB.prepare(
    'SELECT property_id FROM analytics_properties WHERE user_id = ?'
  ).bind(userId).all();
  const configuredIds = new Set((localProps.results || []).map((p: any) => p.property_id));

  // Flatten and filter
  const availableProperties: any[] = [];
  for (const account of accountsResult.accounts) {
    for (const prop of account.properties || []) {
      if (!configuredIds.has(prop.propertyId)) {
        availableProperties.push({
          propertyId: prop.propertyId,
          displayName: prop.displayName,
          propertyType: prop.propertyType,
          accountName: account.displayName
        });
      }
    }
  }

  return { properties: availableProperties };
}

// Get configured analytics properties (local database)
async function getAnalyticsProperties(env: Env, userId: string) {
  try {
    const token = await getValidToken(env, userId, 'google_analytics');
    if (!token) {
      return { properties: [], error: 'Google Analytics not connected', needsConnection: true };
    }
    
    const properties = await env.DB.prepare(
      'SELECT * FROM analytics_properties WHERE user_id = ? ORDER BY name'
    ).bind(userId).all();
    
    return { 
      properties: (properties.results || []).map((p: any) => ({
        id: p.id,
        property_id: p.property_id,
        name: p.name,
        blog_id: p.blog_id,
        created_at: p.created_at
      }))
    };
  } catch (e: any) {
    return { properties: [], error: e.message };
  }
}

// Add a new analytics property to track
async function addAnalyticsProperty(env: Env, userId: string, data: any) {
  if (!data.property_id || !data.name) {
    return { error: 'property_id and name are required' };
  }

  // Check if already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM analytics_properties WHERE user_id = ? AND property_id = ?'
  ).bind(userId, data.property_id).first();

  if (existing) {
    return { error: 'Property already configured' };
  }

  const id = `ga-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO analytics_properties (id, user_id, property_id, name, blog_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, data.property_id, data.name, data.blog_id || null, now).run();

  return { id, success: true };
}

// Update an analytics property
async function updateAnalyticsProperty(env: Env, userId: string, propertyDbId: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.blog_id !== undefined) { fields.push('blog_id = ?'); params.push(data.blog_id || null); }

  if (fields.length === 0) {
    return { error: 'No valid fields to update' };
  }

  params.push(userId, propertyDbId);
  await env.DB.prepare(
    `UPDATE analytics_properties SET ${fields.join(', ')} WHERE user_id = ? AND id = ?`
  ).bind(...params).run();

  return { success: true };
}

// Delete an analytics property
async function deleteAnalyticsProperty(env: Env, userId: string, propertyDbId: string) {
  const result = await env.DB.prepare(
    'DELETE FROM analytics_properties WHERE user_id = ? AND id = ?'
  ).bind(userId, propertyDbId).run();

  return { success: true, deleted: result.meta?.changes || 0 };
}

// ==================
// ANALYTICS REPORTING API
// ==================
async function getAnalyticsReport(env: Env, userId: string, url: URL) {
  const propertyId = url.searchParams.get('property_id');
  const days = parseInt(url.searchParams.get('days') || '7');
  
  let propId = propertyId;
  if (!propId) {
    const prop = await env.DB.prepare('SELECT property_id FROM analytics_properties WHERE user_id = ? LIMIT 1').bind(userId).first() as any;
    if (prop) propId = prop.property_id;
  }
  
  if (!propId) return { error: 'No GA4 property configured', needsProperty: true };
  
  const token = await getValidToken(env, userId, 'google_analytics');
  if (!token) return { error: 'Google Analytics not connected', needsConnection: true };
  
  try {
    const response = await fetch(`${ANALYTICS_DATA_API}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [
          { startDate: `${days}daysAgo`, endDate: 'today' },
          { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` }
        ],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' }, { name: 'screenPageViews' },
          { name: 'sessions' }, { name: 'averageSessionDuration' }
        ],
        orderBys: [{ dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'date' } }]
      })
    });
    
    if (!response.ok) return { error: `GA4 API error: ${await response.text()}` };
    
    const data: any = await response.json();
    let users = 0, pageViews = 0, sessions = 0, totalDuration = 0;
    let prevUsers = 0, prevPageViews = 0, prevSessions = 0, prevDuration = 0;
    const daily: any[] = [];
    
    if (data.rows) {
      for (const row of data.rows) {
        const rowUsers = parseFloat(row.metricValues[0]?.value || 0);
        const rowViews = parseFloat(row.metricValues[1]?.value || 0);
        const rowSessions = parseFloat(row.metricValues[2]?.value || 0);
        const rowDuration = parseFloat(row.metricValues[3]?.value || 0);
        const dateStr = row.dimensionValues[0]?.value;
        
        if (dateStr) {
          const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
          const rowDate = new Date(date);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          if (rowDate >= cutoffDate) {
            users += rowUsers; pageViews += rowViews; sessions += rowSessions;
            totalDuration += rowDuration * rowSessions;
            daily.push({ date, users: Math.round(rowUsers), pageViews: Math.round(rowViews), sessions: Math.round(rowSessions) });
          } else {
            prevUsers += rowUsers; prevPageViews += rowViews; prevSessions += rowSessions;
            prevDuration += rowDuration * rowSessions;
          }
        }
      }
    }
    
    const usersChange = prevUsers > 0 ? ((users - prevUsers) / prevUsers) * 100 : 0;
    const pageViewsChange = prevPageViews > 0 ? ((pageViews - prevPageViews) / prevPageViews) * 100 : 0;
    const sessionsChange = prevSessions > 0 ? ((sessions - prevSessions) / prevSessions) * 100 : 0;
    const avgDuration = sessions > 0 ? totalDuration / sessions : 0;
    const prevAvgDuration = prevSessions > 0 ? prevDuration / prevSessions : 0;
    const durationChange = prevAvgDuration > 0 ? ((avgDuration - prevAvgDuration) / prevAvgDuration) * 100 : 0;
    
    return {
      users: Math.round(users), pageViews: Math.round(pageViews), sessions: Math.round(sessions),
      avgSessionDuration: avgDuration, usersChange, pageViewsChange, sessionsChange, durationChange,
      daily: daily.sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (e: any) { return { error: e.message }; }
}

async function getAnalyticsRealtime(env: Env, userId: string, url: URL) {
  const propertyId = url.searchParams.get('property_id');
  let propId = propertyId;
  if (!propId) {
    const prop = await env.DB.prepare('SELECT property_id FROM analytics_properties WHERE user_id = ? LIMIT 1').bind(userId).first() as any;
    if (prop) propId = prop.property_id;
  }
  if (!propId) return { activeUsers: 0, topPages: [], error: 'No GA4 property configured' };
  
  const token = await getValidToken(env, userId, 'google_analytics');
  if (!token) return { activeUsers: 0, topPages: [], error: 'Google Analytics not connected' };
  
  try {
    const response = await fetch(`${ANALYTICS_DATA_API}/properties/${propId}:runRealtimeReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10
      })
    });
    
    if (!response.ok) return { activeUsers: 0, topPages: [], error: `GA4 API error: ${await response.text()}` };
    
    const data: any = await response.json();
    let totalUsers = 0;
    const topPages: any[] = [];
    
    if (data.rows) {
      for (const row of data.rows) {
        const users = parseInt(row.metricValues[0]?.value || 0);
        totalUsers += users;
        topPages.push({ pageTitle: row.dimensionValues[0]?.value || 'Unknown', activeUsers: users });
      }
    }
    
    return { activeUsers: totalUsers, topPages };
  } catch (e: any) { return { activeUsers: 0, topPages: [], error: e.message }; }
}

async function getAnalyticsTopContent(env: Env, userId: string, url: URL) {
  const propertyId = url.searchParams.get('property_id');
  const days = parseInt(url.searchParams.get('days') || '30');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  let propId = propertyId;
  if (!propId) {
    const prop = await env.DB.prepare('SELECT property_id FROM analytics_properties WHERE user_id = ? LIMIT 1').bind(userId).first() as any;
    if (prop) propId = prop.property_id;
  }
  if (!propId) return { pages: [], error: 'No GA4 property configured' };
  
  const token = await getValidToken(env, userId, 'google_analytics');
  if (!token) return { pages: [], error: 'Google Analytics not connected' };
  
  try {
    const response = await fetch(`${ANALYTICS_DATA_API}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit
      })
    });
    
    if (!response.ok) return { pages: [], error: `GA4 API error: ${await response.text()}` };
    
    const data: any = await response.json();
    const pages: any[] = [];
    if (data.rows) {
      for (const row of data.rows) {
        pages.push({
          pageTitle: row.dimensionValues[0]?.value || 'Untitled',
          pagePath: row.dimensionValues[1]?.value || '/',
          pageViews: Math.round(parseFloat(row.metricValues[0]?.value || 0)),
          users: Math.round(parseFloat(row.metricValues[1]?.value || 0)),
          avgDuration: parseFloat(row.metricValues[2]?.value || 0)
        });
      }
    }
    return { pages };
  } catch (e: any) { return { pages: [], error: e.message }; }
}

async function getAnalyticsSources(env: Env, userId: string, url: URL) {
  const propertyId = url.searchParams.get('property_id');
  const days = parseInt(url.searchParams.get('days') || '30');
  
  let propId = propertyId;
  if (!propId) {
    const prop = await env.DB.prepare('SELECT property_id FROM analytics_properties WHERE user_id = ? LIMIT 1').bind(userId).first() as any;
    if (prop) propId = prop.property_id;
  }
  if (!propId) return { sources: [], error: 'No GA4 property configured' };
  
  const token = await getValidToken(env, userId, 'google_analytics');
  if (!token) return { sources: [], error: 'Google Analytics not connected' };
  
  try {
    const response = await fetch(`${ANALYTICS_DATA_API}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15
      })
    });
    
    if (!response.ok) return { sources: [], error: `GA4 API error: ${await response.text()}` };
    
    const data: any = await response.json();
    const sources: any[] = [];
    if (data.rows) {
      for (const row of data.rows) {
        sources.push({
          source: row.dimensionValues[0]?.value || '(direct)',
          medium: row.dimensionValues[1]?.value || '(none)',
          sessions: Math.round(parseFloat(row.metricValues[0]?.value || 0)),
          users: Math.round(parseFloat(row.metricValues[1]?.value || 0)),
          bounceRate: parseFloat(row.metricValues[2]?.value || 0) * 100
        });
      }
    }
    return { sources };
  } catch (e: any) { return { sources: [], error: e.message }; }
}

async function getAnalyticsGeography(env: Env, userId: string, url: URL) {
  const propertyId = url.searchParams.get('property_id');
  const days = parseInt(url.searchParams.get('days') || '30');
  
  let propId = propertyId;
  if (!propId) {
    const prop = await env.DB.prepare('SELECT property_id FROM analytics_properties WHERE user_id = ? LIMIT 1').bind(userId).first() as any;
    if (prop) propId = prop.property_id;
  }
  if (!propId) return { countries: [], error: 'No GA4 property configured' };
  
  const token = await getValidToken(env, userId, 'google_analytics');
  if (!token) return { countries: [], error: 'Google Analytics not connected' };
  
  try {
    const response = await fetch(`${ANALYTICS_DATA_API}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20
      })
    });
    
    if (!response.ok) return { countries: [], error: `GA4 API error: ${await response.text()}` };
    
    const data: any = await response.json();
    const countries: any[] = [];
    if (data.rows) {
      for (const row of data.rows) {
        countries.push({
          country: row.dimensionValues[0]?.value || 'Unknown',
          users: Math.round(parseFloat(row.metricValues[0]?.value || 0)),
          sessions: Math.round(parseFloat(row.metricValues[1]?.value || 0))
        });
      }
    }
    return { countries };
  } catch (e: any) { return { countries: [], error: e.message }; }
}

// ==================
// STATS HANDLERS
// ==================
async function getStatsOverview(env: Env, userId: string) {
  const taskStats = await getTaskStats(env, userId);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  
  let weekCompleted = 0, sprint = null, handoffPending = 0;
  
  try {
    const wc = await env.DB.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at >= ?`).bind(userId, weekAgo.toISOString()).first() as any;
    weekCompleted = wc?.count || 0;
  } catch (e) {}
  
  try { sprint = await env.DB.prepare(`SELECT * FROM sprints WHERE user_id = ? AND status = 'active' LIMIT 1`).bind(userId).first(); } catch (e) {}
  
  try {
    const hp = await env.DB.prepare(`SELECT COUNT(*) as count FROM handoff_queue WHERE status = 'pending'`).first() as any;
    handoffPending = hp?.count || 0;
  } catch (e) {}
  
  return { tasks: taskStats, weekCompleted, activeSprint: sprint || null, handoffPending };
}

// ==================
// OAUTH HANDLERS
// ==================
async function handleGoogleOAuth(request: Request, env: Env, workerUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return new Response('Missing params', { status: 400 });

  const [stateUserId, provider] = state.includes(':') ? state.split(':') : [state, 'google_drive'];

  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID || '', client_secret: env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: workerUrl + '/oauth/callback', grant_type: 'authorization_code'
    }),
  });

  if (!tokenResp.ok) return new Response('Token failed: ' + await tokenResp.text(), { status: 500 });

  const tokens: any = await tokenResp.json();
  const exp = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const now = new Date().toISOString();

  await env.DB.prepare(`INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, provider) DO UPDATE SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?, updated_at = ?`).bind(crypto.randomUUID(), stateUserId, provider, tokens.access_token, tokens.refresh_token, exp, now, now, tokens.access_token, tokens.refresh_token, exp, now).run();

  const serviceName = SERVICE_NAMES[provider] || provider;
  return new Response(`<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0"><div style="text-align:center"><h1>✅ ${serviceName} Connected!</h1><p>Close this window and return to Claude</p></div></body></html>`, { headers: { 'Content-Type': 'text/html' } });
}

async function handleGitHubOAuth(request: Request, env: Env, workerUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return new Response('Missing params', { status: 400 });

  const [stateUserId] = state.split(':');

  const tokenResp = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID || '', client_secret: env.GITHUB_CLIENT_SECRET || '', code, redirect_uri: workerUrl + '/oauth/github/callback' }),
  });

  if (!tokenResp.ok) return new Response('GitHub token failed: ' + await tokenResp.text(), { status: 500 });

  const tokens: any = await tokenResp.json();
  if (tokens.error) return new Response('GitHub error: ' + tokens.error_description, { status: 500 });

  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, provider) DO UPDATE SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?, updated_at = ?`).bind(crypto.randomUUID(), stateUserId, 'github', tokens.access_token, null, null, now, now, tokens.access_token, null, null, now).run();

  return new Response(`<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0"><div style="text-align:center"><h1>✅ GitHub Connected!</h1><p>Close this window and return to Claude</p></div></body></html>`, { headers: { 'Content-Type': 'text/html' } });
}
