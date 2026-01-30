/**
 * Thread Component
 * Activity feed that shows check-ins, task completions, messages, and handoff activity
 * Can be rendered as a mini widget, sidebar, or full page
 */

// Activity type configuration
const ACTIVITY_TYPES = {
  checkin: { icon: '📝', color: 'var(--accent)', label: 'Check-in' },
  task_complete: { icon: '✅', color: 'var(--success)', label: 'Completed' },
  task_created: { icon: '➕', color: 'var(--info)', label: 'Created' },
  message: { icon: '💬', color: 'var(--info)', label: 'Message' },
  handoff_created: { icon: '📤', color: 'var(--warning)', label: 'Handoff' },
  handoff_claimed: { icon: '🤝', color: 'var(--info)', label: 'Claimed' },
  handoff_complete: { icon: '📥', color: 'var(--success)', label: 'Delivered' },
  handoff_blocked: { icon: '🚫', color: 'var(--danger)', label: 'Blocked' },
  sprint_started: { icon: '🏃', color: 'var(--accent)', label: 'Sprint' },
  sprint_ended: { icon: '🏁', color: 'var(--success)', label: 'Sprint' }
};

/**
 * Render mini thread widget (for embedding in other pages)
 */
async function renderMiniThread(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const { limit = 5, showHeader = true, compact = true, types = null } = options;
  
  container.innerHTML = `
    <div class="card" style="padding: ${compact ? 'var(--space-4)' : 'var(--space-6)'};">
      ${showHeader ? `
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">💬 Recent Activity</h3>
          <a href="/pages/thread/" class="text-accent text-sm">View All →</a>
        </div>
      ` : ''}
      <div id="${containerId}-items" class="thread-items">
        <div class="flex items-center gap-2 text-muted p-2">
          <div class="spinner spinner-sm"></div>
          <span class="text-sm">Loading...</span>
        </div>
      </div>
    </div>
  `;
  
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (types) params.set('types', types.join(','));
    
    const response = await apiGet(`/api/activity?${params}`);
    const items = response.data || [];
    const itemsContainer = document.getElementById(`${containerId}-items`);
    
    if (items.length === 0) {
      itemsContainer.innerHTML = `<p class="text-muted text-sm text-center p-4">No recent activity</p>`;
      return;
    }
    
    itemsContainer.innerHTML = items.map(item => renderActivityItem(item, { compact })).join('');
  } catch (err) {
    document.getElementById(`${containerId}-items`).innerHTML = `
      <p class="text-danger text-sm text-center p-4">Failed to load activity</p>
    `;
  }
}

/**
 * Render full thread page
 */
async function renderFullThread(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const { limit = 50, groupByDate = true } = options;
  injectThreadStyles();
  
  container.innerHTML = `
    <div class="thread-page">
      <div class="thread-header">
        <h1 class="text-3xl font-semibold">💬 Thread</h1>
        <p class="text-secondary mt-2">Your activity feed</p>
      </div>
      <div class="thread-filters flex gap-2 mt-6 mb-6 flex-wrap">
        <button class="btn btn-secondary btn-sm filter-btn active" data-filter="all">All</button>
        <button class="btn btn-ghost btn-sm filter-btn" data-filter="checkin">📝 Check-ins</button>
        <button class="btn btn-ghost btn-sm filter-btn" data-filter="task_complete">✅ Completions</button>
        <button class="btn btn-ghost btn-sm filter-btn" data-filter="message">💬 Messages</button>
        <button class="btn btn-ghost btn-sm filter-btn" data-filter="handoff">🔄 Handoffs</button>
      </div>
      <div class="thread-content" id="${containerId}-content">
        <div class="flex items-center justify-center gap-3 p-8 text-muted">
          <div class="spinner"></div>
          <span>Loading activity...</span>
        </div>
      </div>
      <div class="thread-load-more text-center mt-6" id="${containerId}-load-more" style="display: none;">
        <button class="btn btn-secondary" onclick="loadMoreActivity('${containerId}')">Load More</button>
      </div>
    </div>
  `;
  
  initThreadFilters(containerId);
  await loadThreadContent(containerId, { limit, groupByDate });
}

/**
 * Load thread content
 */
async function loadThreadContent(containerId, options = {}) {
  const contentEl = document.getElementById(`${containerId}-content`);
  const loadMoreEl = document.getElementById(`${containerId}-load-more`);
  if (!contentEl) return;
  
  const { limit = 50, offset = 0, filter = 'all', groupByDate = true, append = false } = options;
  
  try {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    
    if (filter !== 'all') {
      const typeMap = {
        checkin: ['checkin'],
        task_complete: ['task_complete', 'task_created'],
        message: ['message'],
        handoff: ['handoff_created', 'handoff_claimed', 'handoff_complete', 'handoff_blocked']
      };
      if (typeMap[filter]) params.set('types', typeMap[filter].join(','));
    }
    
    const response = await apiGet(`/api/activity?${params}`);
    const items = response.data || [];
    
    if (items.length === 0 && !append) {
      contentEl.innerHTML = `
        <div class="text-center p-8">
          <p class="text-muted text-lg">No activity found</p>
        </div>
      `;
      if (loadMoreEl) loadMoreEl.style.display = 'none';
      return;
    }
    
    let html = '';
    if (groupByDate) {
      const grouped = groupActivityByDate(items);
      html = Object.entries(grouped).map(([date, dateItems]) => `
        <div class="thread-date-group">
          <div class="thread-date-header">
            <span class="thread-date-label">${date}</span>
            <span class="thread-date-line"></span>
          </div>
          <div class="thread-items">
            ${dateItems.map(item => renderActivityItem(item, { showDate: false })).join('')}
          </div>
        </div>
      `).join('');
    } else {
      html = items.map(item => renderActivityItem(item)).join('');
    }
    
    if (append) contentEl.innerHTML += html;
    else contentEl.innerHTML = html;
    
    if (loadMoreEl) loadMoreEl.style.display = items.length >= limit ? 'block' : 'none';
    contentEl.dataset.offset = (parseInt(offset) + items.length).toString();
    contentEl.dataset.filter = filter;
  } catch (err) {
    if (!append) {
      contentEl.innerHTML = `
        <div class="text-center p-8">
          <p class="text-danger">Failed to load activity</p>
        </div>
      `;
    }
  }
}

async function loadMoreActivity(containerId) {
  const contentEl = document.getElementById(`${containerId}-content`);
  if (!contentEl) return;
  await loadThreadContent(containerId, {
    offset: parseInt(contentEl.dataset.offset || '0'),
    filter: contentEl.dataset.filter || 'all',
    append: true
  });
}

function initThreadFilters(containerId) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active', 'btn-secondary');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('active', 'btn-secondary');
      btn.classList.remove('btn-ghost');
      
      const contentEl = document.getElementById(`${containerId}-content`);
      contentEl.innerHTML = `<div class="flex items-center justify-center gap-3 p-8 text-muted">
        <div class="spinner"></div><span>Loading...</span>
      </div>`;
      await loadThreadContent(containerId, { filter: btn.dataset.filter });
    });
  });
}

function renderActivityItem(item, options = {}) {
  const { compact = false, showDate = true } = options;
  const config = ACTIVITY_TYPES[item.type] || { icon: '•', color: 'var(--text-muted)', label: 'Activity' };
  
  // Add undo button for task_complete items
  const undoButton = item.type === 'task_complete' 
    ? `<button class="activity-undo-btn" onclick="restoreTask('${item.id}', this)" title="Restore task">Undo</button>`
    : '';
  
  return `
    <div class="activity-item ${compact ? 'compact' : ''}" data-type="${item.type}" data-id="${item.id}">
      <div class="activity-icon" style="color: ${config.color}">${config.icon}</div>
      <div class="activity-content">
        <div class="activity-main">
          <span class="activity-text">${escapeHtml(item.summary)}</span>
        </div>
        <div class="activity-meta">
          <span class="activity-type badge badge-default">${config.label}</span>
          ${item.project ? `<span class="text-accent">${escapeHtml(item.project)}</span>` : ''}
          <span>${showDate ? formatRelativeTime(item.created_at) : formatTime(item.created_at)}</span>
          ${undoButton}
        </div>
      </div>
    </div>
  `;
}

/**
 * Restore a completed task back to open status
 */
async function restoreTask(taskId, buttonEl) {
  const activityItem = buttonEl.closest('.activity-item');
  
  try {
    // Disable button and show loading state
    buttonEl.disabled = true;
    buttonEl.textContent = '...';
    
    // Call the API to reopen the task
    await Tasks.reopen(taskId);
    
    // Show success feedback
    activityItem.style.transition = 'all 0.3s ease';
    activityItem.style.opacity = '0.5';
    activityItem.style.backgroundColor = 'var(--success-bg, rgba(34, 197, 94, 0.1))';
    
    // Update button to show success
    buttonEl.textContent = '✓ Restored';
    buttonEl.style.color = 'var(--success)';
    buttonEl.style.borderColor = 'var(--success)';
    
    // Remove the item after a short delay
    setTimeout(() => {
      activityItem.style.height = activityItem.offsetHeight + 'px';
      activityItem.style.overflow = 'hidden';
      
      requestAnimationFrame(() => {
        activityItem.style.height = '0';
        activityItem.style.padding = '0';
        activityItem.style.margin = '0';
        activityItem.style.opacity = '0';
      });
      
      setTimeout(() => {
        activityItem.remove();
      }, 300);
    }, 800);
    
  } catch (err) {
    console.error('Failed to restore task:', err);
    buttonEl.disabled = false;
    buttonEl.textContent = 'Undo';
    alert('Failed to restore task. Please try again.');
  }
}

function groupActivityByDate(items) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  items.forEach(item => {
    const date = new Date(item.created_at);
    const dateStr = date.toDateString();
    let label = dateStr === today ? 'Today' : 
                dateStr === yesterday ? 'Yesterday' : 
                date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  return groups;
}

function formatTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts);
  const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function injectThreadStyles() {
  if (document.getElementById('thread-styles')) return;
  const styles = document.createElement('style');
  styles.id = 'thread-styles';
  styles.textContent = `
    .thread-page { max-width: 800px; }
    .thread-date-group { margin-bottom: var(--space-6); }
    .thread-date-header { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); }
    .thread-date-label { font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--text-muted); white-space: nowrap; }
    .thread-date-line { flex: 1; height: 1px; background: var(--border); }
    .thread-items .activity-item { display: flex; gap: var(--space-3); padding: var(--space-4); background: var(--bg-card); border-radius: var(--radius-lg); margin-bottom: var(--space-3); transition: all var(--transition-fast); }
    .thread-items .activity-item:hover { background: var(--bg-hover); }
    .thread-items .activity-item.compact { padding: var(--space-3); margin-bottom: var(--space-2); }
    .activity-icon { flex-shrink: 0; font-size: var(--text-lg); line-height: 1; }
    .activity-content { flex: 1; min-width: 0; }
    .activity-main { margin-bottom: var(--space-2); }
    .activity-text { color: var(--text-secondary); }
    .activity-meta { display: flex; flex-wrap: wrap; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); align-items: center; }
    .activity-type { font-size: 10px; padding: 2px 6px; }
    
    /* Undo button styles */
    .activity-undo-btn {
      opacity: 0;
      margin-left: auto;
      padding: 2px 8px;
      font-size: 11px;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .activity-item:hover .activity-undo-btn {
      opacity: 1;
    }
    .activity-undo-btn:hover {
      color: var(--text-primary);
      border-color: var(--text-muted);
      background: var(--bg-hover);
    }
    .activity-undo-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(styles);
}
