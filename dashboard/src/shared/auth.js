/**
 * Authentication System
 * PIN-based authentication with session persistence
 */

// Configuration
const AUTH_CONFIG = {
  sessionKey: 'up_session',
  userIdKey: 'up_user_id',
  sessionDurationDays: 7,
  pins: {
    '1987': { id: 'micaiah', name: 'Micaiah', initial: 'M' },
    '1976': { id: 'irene', name: 'Irene', initial: 'I' }
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  const session = getSession();
  return session !== null && !isSessionExpired(session);
}

/**
 * Get current session
 * @returns {object|null}
 */
function getSession() {
  try {
    const sessionData = localStorage.getItem(AUTH_CONFIG.sessionKey);
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  } catch (err) {
    console.error('Failed to parse session:', err);
    return null;
  }
}

/**
 * Check if session is expired
 * @param {object} session
 * @returns {boolean}
 */
function isSessionExpired(session) {
  if (!session || !session.expiresAt) return true;
  return new Date(session.expiresAt) < new Date();
}

/**
 * Get current authenticated user
 * @returns {object|null}
 */
function getAuthUser() {
  const session = getSession();
  if (!session || isSessionExpired(session)) return null;
  return session.user;
}

/**
 * Verify PIN and create session
 * @param {string} pin
 * @returns {object} Result with success flag and user or error
 */
function verifyPin(pin) {
  const user = AUTH_CONFIG.pins[pin];
  
  if (!user) {
    return { success: false, error: 'Invalid PIN' };
  }
  
  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_CONFIG.sessionDurationDays);
  
  const session = {
    user,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString()
  };
  
  try {
    localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
    localStorage.setItem(AUTH_CONFIG.userIdKey, user.id);
    return { success: true, user };
  } catch (err) {
    console.error('Failed to save session:', err);
    return { success: false, error: 'Failed to save session' };
  }
}

/**
 * Clear session and log out
 */
function logout() {
  localStorage.removeItem(AUTH_CONFIG.sessionKey);
  localStorage.removeItem(AUTH_CONFIG.userIdKey);
  showLoginModal();
}

/**
 * Require authentication - call at page load
 * Shows login modal if not authenticated
 * @returns {object|null} User if authenticated
 */
function requireAuth() {
  if (isAuthenticated()) {
    return getAuthUser();
  }
  
  showLoginModal();
  return null;
}

/**
 * Show login modal overlay
 */
function showLoginModal() {
  // Inject styles if needed
  injectAuthStyles();
  
  // Remove existing modal if any
  const existing = document.getElementById('auth-modal');
  if (existing) existing.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'auth-modal-backdrop';
  modal.innerHTML = `
    <div class="auth-modal">
      <div class="auth-modal-header">
        <div class="auth-logo">⌘</div>
        <h2 class="auth-title">UP Command</h2>
        <p class="auth-subtitle">Enter your PIN to continue</p>
      </div>
      
      <form id="auth-form" class="auth-form" onsubmit="handleLogin(event)">
        <div class="pin-input-container">
          <input type="password" 
                 id="pin-input" 
                 class="pin-input" 
                 maxlength="4" 
                 pattern="[0-9]*" 
                 inputmode="numeric"
                 placeholder="••••"
                 autocomplete="off"
                 autofocus>
        </div>
        
        <div class="auth-error" id="auth-error" style="display: none;">
          Invalid PIN. Please try again.
        </div>
        
        <button type="submit" class="btn btn-primary btn-lg w-full" id="auth-submit">
          Sign In
        </button>
      </form>
      
      <div class="auth-footer">
        <p class="text-muted text-sm">Untitled Publishers</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus input
  setTimeout(() => {
    document.getElementById('pin-input')?.focus();
  }, 100);
}

/**
 * Handle login form submission
 * @param {Event} event
 */
function handleLogin(event) {
  event.preventDefault();
  
  const pinInput = document.getElementById('pin-input');
  const errorEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  
  const pin = pinInput.value.trim();
  
  if (pin.length !== 4) {
    showAuthError('PIN must be 4 digits');
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> Signing in...';
  
  // Simulate brief delay for UX
  setTimeout(() => {
    const result = verifyPin(pin);
    
    if (result.success) {
      // Success - reload page to initialize with auth
      window.location.reload();
    } else {
      // Error - show message
      showAuthError(result.error);
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In';
      pinInput.value = '';
      pinInput.focus();
    }
  }, 300);
}

/**
 * Show authentication error
 * @param {string} message
 */
function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Add shake animation
    const modal = document.querySelector('.auth-modal');
    modal?.classList.add('shake');
    setTimeout(() => modal?.classList.remove('shake'), 500);
  }
}

/**
 * Handle 401 responses from API
 * Call this in API error handler
 */
function handleAuthError() {
  logout();
}

/**
 * Inject auth-specific styles
 */
function injectAuthStyles() {
  if (document.getElementById('auth-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'auth-styles';
  styles.textContent = `
    .auth-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 14, 20, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: var(--space-4);
    }
    
    .auth-modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      width: 100%;
      max-width: 360px;
      text-align: center;
    }
    
    .auth-modal.shake {
      animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-10px); }
      40%, 80% { transform: translateX(10px); }
    }
    
    .auth-modal-header {
      margin-bottom: var(--space-8);
    }
    
    .auth-logo {
      font-size: 3rem;
      margin-bottom: var(--space-4);
    }
    
    .auth-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-2);
    }
    
    .auth-subtitle {
      color: var(--text-muted);
      font-size: var(--text-sm);
    }
    
    .auth-form {
      margin-bottom: var(--space-6);
    }
    
    .pin-input-container {
      margin-bottom: var(--space-4);
    }
    
    .pin-input {
      width: 100%;
      padding: var(--space-4);
      font-size: var(--text-2xl);
      font-family: var(--font-mono);
      text-align: center;
      letter-spacing: 0.5em;
      background: var(--bg-primary);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      color: var(--text-primary);
      transition: border-color var(--transition-fast);
    }
    
    .pin-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-muted);
    }
    
    .pin-input::placeholder {
      color: var(--text-muted);
      letter-spacing: 0.3em;
    }
    
    .auth-error {
      color: var(--danger);
      font-size: var(--text-sm);
      margin-bottom: var(--space-4);
      padding: var(--space-2) var(--space-3);
      background: var(--danger-muted);
      border-radius: var(--radius-md);
    }
    
    .auth-footer {
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }
  `;
  
  document.head.appendChild(styles);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.isAuthenticated = isAuthenticated;
  window.getAuthUser = getAuthUser;
  window.requireAuth = requireAuth;
  window.logout = logout;
  window.handleLogin = handleLogin;
  window.handleAuthError = handleAuthError;
}
