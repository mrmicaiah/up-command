// Courier API Helper
// Shared across all Courier dashboard pages

const COURIER_API = 'https://email-bot-server.micaiah-tasks.workers.dev';
const COURIER_TOKEN_KEY = 'courier_token';

function getCourierToken() {
  return localStorage.getItem(COURIER_TOKEN_KEY);
}

function setCourierToken(token) {
  localStorage.setItem(COURIER_TOKEN_KEY, token);
}

function courierLogout() {
  localStorage.removeItem(COURIER_TOKEN_KEY);
  showCourierLogin();
}

async function courierFetch(endpoint, options = {}) {
  const token = getCourierToken();
  if (!token) {
    showCourierLogin();
    throw new Error('Not authenticated');
  }
  
  const url = `${COURIER_API}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    localStorage.removeItem(COURIER_TOKEN_KEY);
    showCourierLogin();
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  
  const text = await response.text();
  if (!text) return { success: true };
  return JSON.parse(text);
}

const CourierAPI = {
  // Stats
  stats: () => courierFetch('/api/stats'),
  
  // Lists
  lists: () => courierFetch('/api/lists'),
  getList: (id) => courierFetch(`/api/lists/${id}`),
  createList: (data) => courierFetch('/api/lists', { method: 'POST', body: JSON.stringify(data) }),
  updateList: (id, data) => courierFetch(`/api/lists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteList: (id) => courierFetch(`/api/lists/${id}`, { method: 'DELETE' }),
  
  // Campaigns/Emails
  campaigns: () => courierFetch('/api/emails'),
  getCampaign: (id) => courierFetch(`/api/emails/${id}`),
  createCampaign: (data) => courierFetch('/api/emails', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id, data) => courierFetch(`/api/emails/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCampaign: (id) => courierFetch(`/api/emails/${id}`, { method: 'DELETE' }),
  sendCampaign: (id, data) => courierFetch(`/api/emails/${id}/send`, { method: 'POST', body: JSON.stringify(data || {}) }),
  sendTestEmail: (id, email) => courierFetch(`/api/emails/${id}/test`, { method: 'POST', body: JSON.stringify({ email }) }),
  
  // Sequences
  sequences: () => courierFetch('/api/sequences'),
  getSequence: (id) => courierFetch(`/api/sequences/${id}`),
  createSequence: (data) => courierFetch('/api/sequences', { method: 'POST', body: JSON.stringify(data) }),
  updateSequence: (id, data) => courierFetch(`/api/sequences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSequence: (id) => courierFetch(`/api/sequences/${id}`, { method: 'DELETE' }),
  
  // Sequence Steps
  getSequenceSteps: (seqId) => courierFetch(`/api/sequences/${seqId}/steps`),
  addSequenceStep: (seqId, data) => courierFetch(`/api/sequences/${seqId}/steps`, { method: 'POST', body: JSON.stringify(data) }),
  updateSequenceStep: (seqId, stepId, data) => courierFetch(`/api/sequences/${seqId}/steps/${stepId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSequenceStep: (seqId, stepId) => courierFetch(`/api/sequences/${seqId}/steps/${stepId}`, { method: 'DELETE' }),
  
  // Subscribers
  subscribers: (listId, limit = 100) => courierFetch(`/api/subscribers?${listId ? `list_id=${listId}&` : ''}limit=${limit}`),
  getSubscriber: (id) => courierFetch(`/api/subscribers/${id}`),
  addSubscriber: (listId, data) => courierFetch(`/api/lists/${listId}/subscribers`, { method: 'POST', body: JSON.stringify(data) }),
  removeSubscriber: (listId, subId) => courierFetch(`/api/lists/${listId}/subscribers/${subId}`, { method: 'DELETE' }),
};

function showCourierLogin(onSuccess) {
  const existing = document.getElementById('courier-login-overlay');
  if (existing) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'courier-login-overlay';
  overlay.className = 'login-overlay';
  overlay.innerHTML = `
    <div class="login-modal">
      <div style="font-size: 3rem; margin-bottom: var(--space-4);">📧</div>
      <h2 class="login-title">Courier Login</h2>
      <p class="login-subtitle">Enter your PIN to access email marketing</p>
      <div class="login-error" id="login-error">Invalid PIN</div>
      <input type="password" class="pin-input" id="pin-input" maxlength="4" placeholder="••••" autofocus>
      <button class="btn btn-primary btn-lg" style="width: 100%;" id="login-btn">Login</button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const pinInput = document.getElementById('pin-input');
  const loginBtn = document.getElementById('login-btn');
  
  async function doLogin() {
    const pin = pinInput.value;
    const errorEl = document.getElementById('login-error');
    
    if (!pin || pin.length !== 4) {
      errorEl.textContent = 'Enter 4-digit PIN';
      errorEl.classList.add('show');
      return;
    }
    
    try {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      
      const response = await fetch(`${COURIER_API}/api/dashboard/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setCourierToken(data.token);
        overlay.remove();
        if (onSuccess) onSuccess();
      } else {
        errorEl.textContent = data.error || 'Invalid PIN';
        errorEl.classList.add('show');
        pinInput.value = '';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    } catch (err) {
      errorEl.textContent = 'Connection failed';
      errorEl.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }
  
  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
  });
  
  loginBtn.addEventListener('click', doLogin);
}
