/**
 * API Client
 * Handles all communication with UP Command server
 * Integrates with auth.js for session management
 */

const API_ENDPOINTS = {
  micaiah: 'https://up-command.micaiah-tasks.workers.dev',
  irene: 'https://productivity-irene.micaiah-tasks.workers.dev'
};

/**
 * Get API base URL for current user
 */
function getApiUrl() {
  const userId = localStorage.getItem('up_user_id') || 'micaiah';
  return API_ENDPOINTS[userId] || API_ENDPOINTS.micaiah;
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
  return localStorage.getItem('up_user_id') || 'micaiah';
}

/**
 * Make API request
 */
async function api(endpoint, options = {}) {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': getCurrentUserId(),
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Handle 401 - clear session and show login
    if (response.status === 401) {
      if (typeof handleAuthError === 'function') {
        handleAuthError();
      }
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    // Handle empty responses
    const text = await response.text();
    if (!text) return { success: true };
    
    try {
      return JSON.parse(text);
    } catch {
      return { data: text };
    }
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

/**
 * GET request
 */
async function apiGet(endpoint) {
  return api(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
async function apiPost(endpoint, data) {
  return api(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PUT request
 */
async function apiPut(endpoint, data) {
  return api(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request
 */
async function apiDelete(endpoint) {
  return api(endpoint, { method: 'DELETE' });
}

/**
 * PATCH request
 */
async function apiPatch(endpoint, data) {
  return api(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

// ============================================
// DOMAIN-SPECIFIC API HELPERS
// ============================================

/**
 * Task Management
 */
const Tasks = {
  list: (filters = {}) => apiGet(`/api/tasks?${new URLSearchParams(filters)}`),
  get: (id) => apiGet(`/api/tasks/${id}`),
  create: (task) => apiPost('/api/tasks', task),
  update: (id, data) => apiPut(`/api/tasks/${id}`, data),
  delete: (id) => apiDelete(`/api/tasks/${id}`),
  complete: (id) => apiPost(`/api/tasks/${id}/complete`),
  activate: (id) => apiPost(`/api/tasks/${id}/activate`),
  deactivate: (id) => apiPost(`/api/tasks/${id}/deactivate`),
  snooze: (id, until) => apiPost(`/api/tasks/${id}/snooze`, { until }),
  stats: () => apiGet('/api/tasks/stats')
};

/**
 * Sprint Management
 */
const Sprints = {
  list: (status = 'all') => apiGet(`/api/sprints?status=${status}`),
  current: () => apiGet('/api/sprints/current'),
  get: (id) => apiGet(`/api/sprints/${id}`),
  create: (sprint) => apiPost('/api/sprints', sprint),
  update: (id, data) => apiPut(`/api/sprints/${id}`, data),
  end: (id, status = 'completed') => apiPost(`/api/sprints/${id}/end`, { status }),
  addTask: (sprintId, taskId, objectiveId) => apiPost(`/api/sprints/${sprintId}/tasks`, { taskId, objectiveId }),
  removeTask: (sprintId, taskId) => apiDelete(`/api/sprints/${sprintId}/tasks/${taskId}`),
  objectives: {
    add: (sprintId, statement) => apiPost(`/api/sprints/${sprintId}/objectives`, { statement }),
    remove: (sprintId, objectiveId) => apiDelete(`/api/sprints/${sprintId}/objectives/${objectiveId}`)
  }
};

/**
 * Handoff System
 */
const Handoff = {
  queue: (filters = {}) => apiGet(`/api/handoff/queue?${new URLSearchParams(filters)}`),
  projects: () => apiGet('/api/handoff/projects'),
  projectStatus: (project) => apiGet(`/api/handoff/projects/${encodeURIComponent(project)}`),
  get: (id) => apiGet(`/api/handoff/tasks/${id}`),
  create: (task) => apiPost('/api/handoff/tasks', task),
  update: (id, data) => apiPut(`/api/handoff/tasks/${id}`, data),
  claim: (id) => apiPost(`/api/handoff/tasks/${id}/claim`),
  claimNext: (filters = {}) => apiPost('/api/handoff/claim', filters),
  complete: (id, data) => apiPost(`/api/handoff/tasks/${id}/complete`, data),
  block: (id, reason) => apiPost(`/api/handoff/tasks/${id}/block`, { reason }),
  progress: (id, notes) => apiPost(`/api/handoff/tasks/${id}/progress`, { notes }),
  results: (filters = {}) => apiGet(`/api/handoff/results?${new URLSearchParams(filters)}`)
};

/**
 * Email Marketing (Courier)
 */
const Courier = {
  // Lists
  lists: () => apiGet('/api/courier/lists'),
  getList: (id) => apiGet(`/api/courier/lists/${id}`),
  createList: (list) => apiPost('/api/courier/lists', list),
  updateList: (id, data) => apiPut(`/api/courier/lists/${id}`, data),
  deleteList: (id) => apiDelete(`/api/courier/lists/${id}`),
  
  // Subscribers
  subscribers: (listId, filters = {}) => apiGet(`/api/courier/subscribers?list_id=${listId}&${new URLSearchParams(filters)}`),
  addSubscriber: (listId, data) => apiPost(`/api/courier/subscribers`, { list_id: listId, ...data }),
  removeSubscriber: (id) => apiDelete(`/api/courier/subscribers/${id}`),
  
  // Campaigns
  campaigns: (listId, filters = {}) => apiGet(`/api/courier/campaigns?list_id=${listId}&${new URLSearchParams(filters)}`),
  getCampaign: (id) => apiGet(`/api/courier/campaigns/${id}`),
  createCampaign: (campaign) => apiPost('/api/courier/campaigns', campaign),
  updateCampaign: (id, data) => apiPut(`/api/courier/campaigns/${id}`, data),
  deleteCampaign: (id) => apiDelete(`/api/courier/campaigns/${id}`),
  sendCampaign: (id) => apiPost(`/api/courier/campaigns/${id}/send`),
  scheduleCampaign: (id, scheduledAt) => apiPost(`/api/courier/campaigns/${id}/schedule`, { scheduled_at: scheduledAt }),
  
  // Sequences
  sequences: (listId) => apiGet(`/api/courier/sequences?list_id=${listId}`),
  getSequence: (id) => apiGet(`/api/courier/sequences/${id}`),
  createSequence: (sequence) => apiPost('/api/courier/sequences', sequence),
  updateSequence: (id, data) => apiPut(`/api/courier/sequences/${id}`, data),
  deleteSequence: (id) => apiDelete(`/api/courier/sequences/${id}`),
  
  // Stats
  stats: () => apiGet('/api/courier/stats'),
  campaignStats: (id) => apiGet(`/api/courier/campaigns/${id}/stats`)
};

/**
 * Analytics (GA4)
 */
const Analytics = {
  // Admin - manage properties
  accounts: () => apiGet('/api/analytics/accounts'),
  available: () => apiGet('/api/analytics/available'),
  properties: () => apiGet('/api/analytics/properties'),
  addProperty: (data) => apiPost('/api/analytics/properties', data),
  updateProperty: (id, data) => apiPut(`/api/analytics/properties/${id}`, data),
  deleteProperty: (id) => apiDelete(`/api/analytics/properties/${id}`),
  
  // Reporting
  report: (propertyId, days = 7) => apiGet(`/api/analytics/report?property_id=${propertyId}&days=${days}`),
  realtime: (propertyId) => apiGet(`/api/analytics/realtime?property_id=${propertyId}`),
  topContent: (propertyId, days = 30, limit = 10) => apiGet(`/api/analytics/top-content?property_id=${propertyId}&days=${days}&limit=${limit}`),
  sources: (propertyId, days = 30) => apiGet(`/api/analytics/sources?property_id=${propertyId}&days=${days}`),
  geography: (propertyId, days = 30) => apiGet(`/api/analytics/geography?property_id=${propertyId}&days=${days}`)
};

/**
 * Activity Feed / Thread
 */
const Activity = {
  list: (filters = {}) => apiGet(`/api/activity?${new URLSearchParams(filters)}`),
  checkins: (filters = {}) => apiGet(`/api/checkins?${new URLSearchParams(filters)}`),
  createCheckin: (data) => apiPost('/api/checkins', data)
};

/**
 * Team & Messages
 */
const Team = {
  summary: () => apiGet('/api/team/summary'),
  messages: (filters = {}) => apiGet(`/api/messages?${new URLSearchParams(filters)}`),
  sendMessage: (to, message) => apiPost('/api/messages', { to, message }),
  markRead: (id) => apiPost(`/api/messages/${id}/read`),
  unreadCount: () => apiGet('/api/messages/unread-count'),
  handoffs: () => apiGet('/api/team/handoffs')
};

/**
 * Notifications
 */
const Notifications = {
  list: () => apiGet('/api/notifications'),
  unreadCount: () => apiGet('/api/notifications/unread'),
  markRead: (id) => apiPost(`/api/notifications/${id}/read`),
  markAllRead: () => apiPost('/api/notifications/read-all')
};

/**
 * Integrations / Connections
 */
const Integrations = {
  status: () => apiGet('/api/integrations/status'),
  connect: (service) => apiGet(`/api/connect/${service}`),
  disconnect: (service) => apiPost(`/api/disconnect/${service}`)
};

/**
 * GitHub
 */
const GitHub = {
  repos: () => apiGet('/api/github/repos')
};

/**
 * Protected Repos
 */
const Protected = {
  list: () => apiGet('/api/protected-repos'),
  add: (repo, reason) => apiPost('/api/protected-repos', { repo, reason }),
  update: (id, data) => apiPut(`/api/protected-repos/${id}`, data),
  remove: (id) => apiDelete(`/api/protected-repos/${id}`)
};

/**
 * Journal
 */
const Journal = {
  list: (filters = {}) => apiGet(`/api/journal?${new URLSearchParams(filters)}`),
  get: (id) => apiGet(`/api/journal/${id}`),
  create: (entry) => apiPost('/api/journal', entry),
  update: (id, data) => apiPut(`/api/journal/${id}`, data),
  delete: (id) => apiDelete(`/api/journal/${id}`),
  insights: (days = 30) => apiGet(`/api/journal/insights?days=${days}`),
  streak: () => apiGet('/api/journal/streak')
};

/**
 * Work Sessions
 */
const WorkSessions = {
  current: () => apiGet('/api/work-sessions/current'),
  start: (focus) => apiPost('/api/work-sessions/start', { focus }),
  end: (notes) => apiPost('/api/work-sessions/end', { notes }),
  history: (days = 7) => apiGet(`/api/work-sessions?days=${days}`)
};

/**
 * Stats
 */
const Stats = {
  overview: () => apiGet('/api/stats/overview')
};

/**
 * Routines
 */
const Routines = {
  list: () => apiGet('/api/routines')
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.api = api;
  window.apiGet = apiGet;
  window.apiPost = apiPost;
  window.apiPut = apiPut;
  window.apiDelete = apiDelete;
  window.apiPatch = apiPatch;
  window.getApiUrl = getApiUrl;
  window.getCurrentUserId = getCurrentUserId;
  
  window.Tasks = Tasks;
  window.Sprints = Sprints;
  window.Handoff = Handoff;
  window.Courier = Courier;
  window.Analytics = Analytics;
  window.Activity = Activity;
  window.Team = Team;
  window.Notifications = Notifications;
  window.Integrations = Integrations;
  window.GitHub = GitHub;
  window.Protected = Protected;
  window.Journal = Journal;
  window.WorkSessions = WorkSessions;
  window.Stats = Stats;
  window.Routines = Routines;
}