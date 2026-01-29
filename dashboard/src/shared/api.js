/**
 * API Client
 * Handles all communication with UP Command server
 */

const API_ENDPOINTS = {
  micaiah: 'https://up-command.micaiah-tasks.workers.dev',
  irene: 'https://up-command-irene.micaiah-tasks.workers.dev'
};

/**
 * Get API base URL for current user
 */
function getApiUrl() {
  const userId = localStorage.getItem('up_user_id') || 'micaiah';
  return API_ENDPOINTS[userId] || API_ENDPOINTS.micaiah;
}

/**
 * Make API request
 */
async function api(endpoint, options = {}) {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return await response.json();
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

// Convenience methods for common operations
const Tasks = {
  list: (filters = {}) => apiGet(`/api/tasks?${new URLSearchParams(filters)}`),
  create: (task) => apiPost('/api/tasks', task),
  complete: (id) => apiPost(`/api/tasks/${id}/complete`),
  update: (id, data) => apiPut(`/api/tasks/${id}`, data),
  delete: (id) => apiDelete(`/api/tasks/${id}`)
};

const Handoff = {
  queue: (filters = {}) => apiGet(`/api/handoff/queue?${new URLSearchParams(filters)}`),
  create: (task) => apiPost('/api/handoff/tasks', task),
  claim: () => apiPost('/api/handoff/claim'),
  complete: (id, data) => apiPost(`/api/handoff/tasks/${id}/complete`, data),
  block: (id, reason) => apiPost(`/api/handoff/tasks/${id}/block`, { reason })
};

const Courier = {
  lists: () => apiGet('/api/courier/lists'),
  campaigns: (listId) => apiGet(`/api/courier/campaigns?list_id=${listId}`),
  subscribers: (listId) => apiGet(`/api/courier/subscribers?list_id=${listId}`),
  stats: () => apiGet('/api/courier/stats')
};

const Analytics = {
  report: (propertyId, days = 7) => apiGet(`/api/analytics/report?property_id=${propertyId}&days=${days}`),
  realtime: (propertyId) => apiGet(`/api/analytics/realtime?property_id=${propertyId}`),
  topContent: (propertyId, days = 30) => apiGet(`/api/analytics/top-content?property_id=${propertyId}&days=${days}`)
};