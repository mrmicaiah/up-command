/**
 * Mini Thread Component
 * Shows recent activity in a compact format
 * Can be embedded in other pages
 */

/**
 * Render mini thread widget
 * @param {string} containerId - ID of container element
 * @param {object} options - Configuration options
 */
async function renderMiniThread(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const {
    limit = 5,
    showHeader = true,
    compact = true
  } = options;
  
  container.innerHTML = `
    <div class="card" style="padding: ${compact ? '1rem' : '1.5rem'};">
      ${showHeader ? `
        <div class="flex justify-between items-center mb-2">
          <h3 style="font-size: 1rem;">💬 Recent Activity</h3>
          <a href="/pages/thread/" class="text-gold" style="font-size: 0.75rem;">View All →</a>
        </div>
      ` : ''}
      
      <div id="thread-items" class="thread-list">
        <div class="flex items-center gap-2" style="color: var(--text-muted);">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    </div>
  `;
  
  try {
    // Fetch recent check-ins
    const response = await apiGet(`/api/checkins?limit=${limit}`);
    const items = response.data || [];
    
    const itemsContainer = document.getElementById('thread-items');
    
    if (items.length === 0) {
      itemsContainer.innerHTML = `
        <p class="text-muted" style="font-size: 0.875rem;">No recent activity</p>
      `;
      return;
    }
    
    itemsContainer.innerHTML = items.map(item => `
      <div class="thread-item" style="
        padding: ${compact ? '0.5rem 0' : '0.75rem 0'};
        border-bottom: 1px solid var(--border-color);
      ">
        <p style="font-size: ${compact ? '0.8125rem' : '0.875rem'}; margin-bottom: 0.25rem;">
          ${item.thread_summary}
        </p>
        <div class="flex gap-2 text-muted" style="font-size: 0.75rem;">
          ${item.project_name ? `<span class="text-gold">${item.project_name}</span>` : ''}
          <span>${formatRelativeTime(item.created_at)}</span>
        </div>
      </div>
    `).join('');
    
    // Remove last border
    const lastItem = itemsContainer.querySelector('.thread-item:last-child');
    if (lastItem) lastItem.style.borderBottom = 'none';
    
  } catch (err) {
    document.getElementById('thread-items').innerHTML = `
      <p class="text-error" style="font-size: 0.875rem;">Failed to load activity</p>
    `;
  }
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}