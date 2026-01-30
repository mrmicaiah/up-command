/**
 * Navigation Component
 * Provides the global layout with sidebar navigation, top bar, and thread sidebar
 */

// Navigation configuration
const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠', href: '/pages/home/' },
  { id: 'thread', label: 'Thread', icon: '💬', href: '/pages/thread/' },
  { 
    id: 'helm', 
    label: 'Helm', 
    icon: '⚓', 
    children: [
      { id: 'helm-tasks', label: 'Tasks', href: '/pages/helm/' },
      { id: 'helm-sprint', label: 'Sprint', href: '/pages/helm/sprint.html' },
      { id: 'helm-backlog', label: 'Backlog', href: '/pages/helm/backlog.html' },
      { id: 'helm-routines', label: 'Routines', href: '/pages/helm/routines.html' }
    ]
  },
  { id: 'handoff', label: 'Handoff', icon: '🔄', href: '/pages/handoff/' },
  { id: 'courier', label: 'Courier', icon: '📧', href: '/pages/courier/' },
  { id: 'analytics', label: 'Analytics', icon: '📊', href: '/pages/analytics/' },
  { type: 'divider' },
  { id: 'integrations', label: 'Integrations', icon: '🔌', href: '/pages/integrations/' },
  { id: 'protected', label: 'Protected', icon: '🔒', href: '/pages/protected/' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/pages/settings/' }
];

// Global state
let threadSidebarOpen = true;
let expandedMenus = new Set();
let unreadNotifications = 0;

/**
 * Initialize the global layout
 * Call this at the top of every page
 * @param {string} pageId - Current page identifier for nav highlighting
 * @param {object} options - Configuration options
 */
function initLayout(pageId, options = {}) {
  const {
    showThread = true,
    pageTitle = 'UP Command'
  } = options;
  
  // Create the layout structure
  document.body.innerHTML = `
    ${renderTopBar(pageTitle)}
    <div class="layout-container">
      ${renderSidebar(pageId)}
      <main class="main-content" id="main-content">
        <!-- Page content will be injected here -->
      </main>
      ${showThread ? renderThreadSidebar() : ''}
    </div>
  `;
  
  // Inject layout styles
  injectLayoutStyles();
  
  // Initialize event handlers
  initNavEvents();
  
  // Load thread if showing
  if (showThread) {
    loadThreadSidebar();
  }
  
  // Load notifications
  loadNotifications();
  
  // Return main content container for page to use
  return document.getElementById('main-content');
}

/**
 * Render the top bar
 */
function renderTopBar(title) {
  const user = getCurrentUser();
  
  return `
    <header class="top-bar">
      <div class="top-bar-left">
        <button class="btn btn-ghost btn-icon mobile-menu-toggle" onclick="toggleMobileMenu()">
          <span class="icon">☰</span>
        </button>
        <a href="/pages/home/" class="top-bar-brand">
          <span class="brand-icon">⌘</span>
          <span class="brand-text">UP Command</span>
        </a>
      </div>
      
      <div class="top-bar-right">
        <button class="btn btn-ghost btn-icon notification-btn" onclick="showNotifications()">
          <span class="icon">🔔</span>
          <span class="notification-badge" id="notification-count" style="display: none;">0</span>
        </button>
        
        <div class="user-dropdown">
          <button class="user-dropdown-trigger" onclick="toggleUserDropdown()">
            <div class="avatar avatar-sm">
              ${user.initial}
            </div>
            <span class="user-name">${user.name}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          
          <div class="user-dropdown-menu" id="user-dropdown-menu">
            <div class="dropdown-header">
              <div class="avatar">${user.initial}</div>
              <div>
                <div class="font-medium">${user.name}</div>
                <div class="text-sm text-muted">${user.id}</div>
              </div>
            </div>
            <div class="divider"></div>
            <a href="/pages/settings/" class="dropdown-item">⚙️ Settings</a>
            <a href="/pages/integrations/" class="dropdown-item">🔌 Integrations</a>
            <div class="divider"></div>
            <button class="dropdown-item text-danger" onclick="switchUser()">
              🔄 Switch User
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

/**
 * Render the sidebar navigation
 */
function renderSidebar(activePageId) {
  return `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-content">
        <ul class="nav-list">
          ${NAV_ITEMS.map(item => renderNavItem(item, activePageId)).join('')}
        </ul>
        
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="avatar">${getCurrentUser().initial}</div>
            <div class="user-info">
              <div class="user-name">${getCurrentUser().name}</div>
              <div class="user-status">
                <span class="status-dot"></span>
                Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Render a single nav item
 */
function renderNavItem(item, activePageId) {
  if (item.type === 'divider') {
    return '<li class="nav-divider"></li>';
  }
  
  const isActive = item.id === activePageId || 
    (item.children && item.children.some(c => c.id === activePageId));
  const isExpanded = expandedMenus.has(item.id) || isActive;
  
  if (item.children) {
    return `
      <li class="nav-item has-children ${isExpanded ? 'expanded' : ''}">
        <button class="nav-link ${isActive ? 'active' : ''}" onclick="toggleNavMenu('${item.id}')">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          <span class="nav-arrow">${isExpanded ? '▼' : '▶'}</span>
        </button>
        <ul class="nav-submenu" ${isExpanded ? '' : 'style="display: none;"'}>
          ${item.children.map(child => `
            <li class="nav-subitem">
              <a href="${child.href}" class="nav-sublink ${child.id === activePageId ? 'active' : ''}">
                ${child.label}
              </a>
            </li>
          `).join('')}
        </ul>
      </li>
    `;
  }
  
  return `
    <li class="nav-item">
      <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>
    </li>
  `;
}

/**
 * Render the thread sidebar
 */
function renderThreadSidebar() {
  return `
    <aside class="thread-sidebar ${threadSidebarOpen ? '' : 'collapsed'}" id="thread-sidebar">
      <div class="thread-sidebar-header">
        <h3 class="thread-sidebar-title">💬 Activity</h3>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleThreadSidebar()">
          <span class="icon">${threadSidebarOpen ? '→' : '←'}</span>
        </button>
      </div>
      
      <div class="thread-sidebar-content" id="thread-content">
        <div class="flex items-center justify-center gap-2 p-4 text-muted">
          <div class="spinner spinner-sm"></div>
          <span>Loading...</span>
        </div>
      </div>
      
      <div class="thread-sidebar-footer">
        <a href="/pages/thread/" class="btn btn-ghost btn-sm w-full">
          View Full Thread →
        </a>
      </div>
    </aside>
  `;
}

/**
 * Load thread sidebar content
 */
async function loadThreadSidebar() {
  const container = document.getElementById('thread-content');
  if (!container) return;
  
  try {
    // Fetch unified activity feed
    const response = await apiGet('/api/activity?limit=15');
    const items = response.data || [];
    
    if (items.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4 text-muted text-sm">
          No recent activity
        </div>
      `;
      return;
    }
    
    container.innerHTML = items.map(item => renderActivityItem(item)).join('');
    
  } catch (err) {
    container.innerHTML = `
      <div class="text-center p-4 text-danger text-sm">
        Failed to load activity
      </div>
    `;
  }
}

/**
 * Render an activity item
 */
function renderActivityItem(item) {
  const typeConfig = {
    'checkin': { icon: '📝', color: 'var(--accent)' },
    'task_complete': { icon: '✅', color: 'var(--success)' },
    'message': { icon: '💬', color: 'var(--info)' },
    'handoff_created': { icon: '📤', color: 'var(--warning)' },
    'handoff_complete': { icon: '📥', color: 'var(--success)' },
    'handoff_blocked': { icon: '🚫', color: 'var(--danger)' }
  };
  
  const config = typeConfig[item.type] || { icon: '•', color: 'var(--text-muted)' };
  
  return `
    <div class="activity-item">
      <div class="activity-icon" style="color: ${config.color}">
        ${config.icon}
      </div>
      <div class="activity-content">
        <p class="activity-text">${item.summary}</p>
        <div class="activity-meta">
          ${item.project ? `<span class="text-accent">${item.project}</span>` : ''}
          <span>${formatRelativeTime(item.created_at)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get current user info
 */
function getCurrentUser() {
  const userId = localStorage.getItem('up_user_id') || 'micaiah';
  const users = {
    micaiah: { id: 'micaiah', name: 'Micaiah', initial: 'M' },
    irene: { id: 'irene', name: 'Irene', initial: 'I' }
  };
  return users[userId] || users.micaiah;
}

/**
 * Load notifications count
 */
async function loadNotifications() {
  try {
    const response = await apiGet('/api/notifications/unread');
    const count = response.count || 0;
    
    const badge = document.getElementById('notification-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    // Silently fail - notifications are non-critical
  }
}

/**
 * Initialize nav event handlers
 */
function initNavEvents() {
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown-menu');
    const trigger = e.target.closest('.user-dropdown-trigger');
    
    if (!trigger && dropdown) {
      dropdown.classList.remove('open');
    }
  });
  
  // Handle keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown) dropdown.classList.remove('open');
    }
  });
}

/**
 * Toggle expandable nav menu
 */
function toggleNavMenu(menuId) {
  if (expandedMenus.has(menuId)) {
    expandedMenus.delete(menuId);
  } else {
    expandedMenus.add(menuId);
  }
  
  // Re-render sidebar
  const sidebar = document.getElementById('sidebar');
  const activePageId = sidebar.querySelector('.nav-link.active')?.closest('.nav-item')?.dataset?.id;
  
  // Find and toggle the submenu
  const navItem = document.querySelector(`.nav-item.has-children button[onclick*="${menuId}"]`)?.closest('.nav-item');
  if (navItem) {
    const submenu = navItem.querySelector('.nav-submenu');
    const arrow = navItem.querySelector('.nav-arrow');
    const isExpanded = expandedMenus.has(menuId);
    
    navItem.classList.toggle('expanded', isExpanded);
    submenu.style.display = isExpanded ? '' : 'none';
    arrow.textContent = isExpanded ? '▼' : '▶';
  }
}

/**
 * Toggle user dropdown
 */
function toggleUserDropdown() {
  const dropdown = document.getElementById('user-dropdown-menu');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}

/**
 * Toggle thread sidebar
 */
function toggleThreadSidebar() {
  threadSidebarOpen = !threadSidebarOpen;
  const sidebar = document.getElementById('thread-sidebar');
  const icon = sidebar?.querySelector('.thread-sidebar-header .icon');
  
  if (sidebar) {
    sidebar.classList.toggle('collapsed', !threadSidebarOpen);
  }
  if (icon) {
    icon.textContent = threadSidebarOpen ? '→' : '←';
  }
  
  // Save preference
  localStorage.setItem('thread_sidebar_open', threadSidebarOpen);
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-open');
  }
}

/**
 * Show notifications panel
 */
function showNotifications() {
  // TODO: Implement notifications panel
  console.log('Show notifications');
}

/**
 * Switch user
 */
function switchUser() {
  localStorage.removeItem('up_user_id');
  localStorage.removeItem('up_session');
  window.location.href = '/pages/login/';
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
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

/**
 * Inject layout-specific styles
 */
function injectLayoutStyles() {
  if (document.getElementById('layout-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'layout-styles';
  styles.textContent = `
    /* ===== LAYOUT STRUCTURE ===== */
    .layout-container {
      display: flex;
      min-height: calc(100vh - var(--header-height));
      margin-top: var(--header-height);
    }
    
    /* ===== TOP BAR ===== */
    .top-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: var(--header-height);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-4);
      z-index: var(--z-sticky);
    }
    
    .top-bar-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    
    .top-bar-brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
    }
    
    .brand-icon {
      font-size: var(--text-2xl);
    }
    
    .mobile-menu-toggle {
      display: none;
    }
    
    .top-bar-right {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    
    .notification-btn {
      position: relative;
    }
    
    .notification-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: var(--danger);
      color: white;
      font-size: 10px;
      font-weight: var(--font-bold);
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* ===== USER DROPDOWN ===== */
    .user-dropdown {
      position: relative;
    }
    
    .user-dropdown-trigger {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    
    .user-dropdown-trigger:hover {
      background: var(--bg-hover);
    }
    
    .user-name {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    
    .dropdown-arrow {
      font-size: 10px;
      color: var(--text-muted);
    }
    
    .user-dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: var(--space-2);
      min-width: 200px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all var(--transition-fast);
      z-index: var(--z-dropdown);
    }
    
    .user-dropdown-menu.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    
    .dropdown-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
    }
    
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: var(--text-sm);
      text-align: left;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .dropdown-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    /* ===== SIDEBAR ===== */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    
    .sidebar-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
    }
    
    .nav-list {
      padding: var(--space-4);
      flex: 1;
    }
    
    .nav-item {
      margin-bottom: var(--space-1);
    }
    
    .nav-divider {
      height: 1px;
      background: var(--border);
      margin: var(--space-4) 0;
    }
    
    .nav-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      text-align: left;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .nav-link:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    .nav-link.active {
      background: var(--accent-muted);
      color: var(--accent);
    }
    
    .nav-icon {
      font-size: var(--text-lg);
    }
    
    .nav-label {
      flex: 1;
    }
    
    .nav-arrow {
      font-size: 10px;
      color: var(--text-muted);
    }
    
    .nav-submenu {
      margin-top: var(--space-1);
      padding-left: var(--space-10);
    }
    
    .nav-sublink {
      display: block;
      padding: var(--space-2) var(--space-3);
      color: var(--text-muted);
      font-size: var(--text-sm);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
    }
    
    .nav-sublink:hover {
      color: var(--text-secondary);
      background: var(--bg-hover);
    }
    
    .nav-sublink.active {
      color: var(--accent);
      background: var(--accent-muted);
    }
    
    .sidebar-footer {
      padding: var(--space-4);
      border-top: 1px solid var(--border);
    }
    
    .user-card {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      background: var(--bg-card);
      border-radius: var(--radius-md);
    }
    
    .user-info {
      flex: 1;
      min-width: 0;
    }
    
    .user-card .user-name {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    
    .user-status {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
    }
    
    /* ===== MAIN CONTENT ===== */
    .main-content {
      flex: 1;
      min-width: 0;
      padding: var(--space-6);
      overflow-y: auto;
    }
    
    /* ===== THREAD SIDEBAR ===== */
    .thread-sidebar {
      width: 320px;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width var(--transition-normal);
    }
    
    .thread-sidebar.collapsed {
      width: 48px;
    }
    
    .thread-sidebar.collapsed .thread-sidebar-content,
    .thread-sidebar.collapsed .thread-sidebar-footer,
    .thread-sidebar.collapsed .thread-sidebar-title {
      display: none;
    }
    
    .thread-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      border-bottom: 1px solid var(--border);
    }
    
    .thread-sidebar.collapsed .thread-sidebar-header {
      justify-content: center;
    }
    
    .thread-sidebar-title {
      font-family: var(--font-display);
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
    }
    
    .thread-sidebar-content {
      flex: 1;
      overflow-y: auto;
    }
    
    .thread-sidebar-footer {
      padding: var(--space-3);
      border-top: 1px solid var(--border);
    }
    
    /* ===== ACTIVITY ITEMS ===== */
    .activity-item {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border);
      transition: background var(--transition-fast);
    }
    
    .activity-item:hover {
      background: var(--bg-hover);
    }
    
    .activity-item:last-child {
      border-bottom: none;
    }
    
    .activity-icon {
      flex-shrink: 0;
      font-size: var(--text-base);
    }
    
    .activity-content {
      flex: 1;
      min-width: 0;
    }
    
    .activity-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: 1.4;
      margin-bottom: var(--space-1);
    }
    
    .activity-meta {
      display: flex;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    
    /* ===== RESPONSIVE ===== */
    @media (max-width: 1024px) {
      .thread-sidebar {
        display: none;
      }
    }
    
    @media (max-width: 768px) {
      .mobile-menu-toggle {
        display: flex;
      }
      
      .brand-text {
        display: none;
      }
      
      .user-name {
        display: none;
      }
      
      .sidebar {
        position: fixed;
        top: var(--header-height);
        left: 0;
        bottom: 0;
        transform: translateX(-100%);
        transition: transform var(--transition-normal);
        z-index: var(--z-modal);
      }
      
      .sidebar.mobile-open {
        transform: translateX(0);
      }
      
      .main-content {
        padding: var(--space-4);
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// Load saved thread sidebar preference
if (typeof localStorage !== 'undefined') {
  const savedPref = localStorage.getItem('thread_sidebar_open');
  if (savedPref !== null) {
    threadSidebarOpen = savedPref === 'true';
  }
}