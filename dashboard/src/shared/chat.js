/**
 * Chat Widget
 * Persistent chat in bottom-right corner for quick messaging between teammates
 */

let chatOpen = true;
let chatPollInterval = null;
let lastMessageId = null;

/**
 * Initialize the chat widget - call this from initLayout
 */
function initChatWidget() {
  const currentUser = getCurrentUser();
  const teammate = currentUser.id === 'micaiah' ? 'Irene' : 'Micaiah';
  
  // Create chat container
  const chatWidget = document.createElement('div');
  chatWidget.id = 'chat-widget';
  chatWidget.className = 'chat-widget';
  chatWidget.innerHTML = `
    <div class="chat-header" onclick="toggleChat()">
      <span class="chat-title">💬 ${teammate}</span>
      <span class="chat-toggle">${chatOpen ? '−' : '+'}</span>
    </div>
    <div class="chat-body" id="chat-body">
      <div class="chat-messages" id="chat-messages">
        <div class="chat-loading">Loading...</div>
      </div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Message ${teammate}..." onkeydown="handleChatKeydown(event)">
        <button class="chat-send-btn" onclick="sendChatMessage()">➤</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatWidget);
  injectChatStyles();
  
  // Load initial state
  const savedState = localStorage.getItem('chat_open');
  if (savedState !== null) {
    chatOpen = savedState === 'true';
    updateChatState();
  }
  
  // Load messages and start polling
  loadChatMessages();
  startChatPolling();
}

/**
 * Toggle chat open/closed
 */
function toggleChat() {
  chatOpen = !chatOpen;
  localStorage.setItem('chat_open', chatOpen);
  updateChatState();
}

function updateChatState() {
  const widget = document.getElementById('chat-widget');
  const toggle = widget?.querySelector('.chat-toggle');
  const body = document.getElementById('chat-body');
  
  if (widget) {
    widget.classList.toggle('collapsed', !chatOpen);
  }
  if (toggle) {
    toggle.textContent = chatOpen ? '−' : '+';
  }
  if (body) {
    body.style.display = chatOpen ? 'flex' : 'none';
  }
}

/**
 * Load chat messages
 */
async function loadChatMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const currentUser = getCurrentUser();
  const teammateId = currentUser.id === 'micaiah' ? 'irene' : 'micaiah';
  
  try {
    const response = await apiGet(`/api/messages?with=${teammateId}&limit=50`);
    const messages = response.messages || [];
    
    if (messages.length === 0) {
      container.innerHTML = '<div class="chat-empty">No messages yet</div>';
      return;
    }
    
    // Sort by date ascending (oldest first)
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Track last message for polling
    if (messages.length > 0) {
      lastMessageId = messages[messages.length - 1].id;
    }
    
    container.innerHTML = messages.map(msg => renderChatMessage(msg, currentUser.id)).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    container.innerHTML = '<div class="chat-error">Failed to load messages</div>';
  }
}

/**
 * Render a single chat message
 */
function renderChatMessage(msg, currentUserId) {
  const isMe = msg.from_user === currentUserId;
  const time = new Date(msg.created_at).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  
  return `
    <div class="chat-message ${isMe ? 'chat-message-me' : 'chat-message-them'}">
      <div class="chat-bubble">
        ${escapeHtml(msg.content)}
      </div>
      <div class="chat-time">${time}</div>
    </div>
  `;
}

/**
 * Send a message
 */
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input?.value?.trim();
  
  if (!message) return;
  
  const currentUser = getCurrentUser();
  const teammateId = currentUser.id === 'micaiah' ? 'irene' : 'micaiah';
  
  // Clear input immediately
  input.value = '';
  
  // Optimistically add message to UI
  const container = document.getElementById('chat-messages');
  const tempId = 'temp-' + Date.now();
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  container.innerHTML += `
    <div class="chat-message chat-message-me" id="${tempId}">
      <div class="chat-bubble">${escapeHtml(message)}</div>
      <div class="chat-time">${time}</div>
    </div>
  `;
  container.scrollTop = container.scrollHeight;
  
  try {
    await apiPost('/api/messages', { to: teammateId, content: message });
  } catch (err) {
    // Mark message as failed
    const tempMsg = document.getElementById(tempId);
    if (tempMsg) {
      tempMsg.querySelector('.chat-bubble').style.opacity = '0.5';
    }
  }
}

/**
 * Handle enter key to send
 */
function handleChatKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

/**
 * Poll for new messages
 */
function startChatPolling() {
  if (chatPollInterval) return;
  chatPollInterval = setInterval(checkNewMessages, 5000); // Every 5 seconds
}

async function checkNewMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const currentUser = getCurrentUser();
  const teammateId = currentUser.id === 'micaiah' ? 'irene' : 'micaiah';
  
  try {
    const response = await apiGet(`/api/messages?with=${teammateId}&limit=10`);
    const messages = response.messages || [];
    
    if (messages.length === 0) return;
    
    // Sort ascending
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    const newestId = messages[messages.length - 1].id;
    
    // If there are new messages, reload
    if (newestId !== lastMessageId) {
      await loadChatMessages();
    }
  } catch (err) {
    // Silently fail
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Inject chat styles
 */
function injectChatStyles() {
  if (document.getElementById('chat-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'chat-styles';
  styles.textContent = `
    .chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .chat-widget.collapsed {
      height: auto;
    }
    
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      user-select: none;
    }
    
    .chat-header:hover {
      background: var(--bg-hover);
    }
    
    .chat-title {
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
    }
    
    .chat-toggle {
      font-size: 18px;
      color: var(--text-muted);
      line-height: 1;
    }
    
    .chat-body {
      display: flex;
      flex-direction: column;
      height: 280px;
    }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .chat-loading,
    .chat-empty,
    .chat-error {
      text-align: center;
      color: var(--text-muted);
      font-size: var(--text-sm);
      padding: 20px;
    }
    
    .chat-error {
      color: var(--danger);
    }
    
    .chat-message {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }
    
    .chat-message-me {
      align-self: flex-end;
      align-items: flex-end;
    }
    
    .chat-message-them {
      align-self: flex-start;
      align-items: flex-start;
    }
    
    .chat-bubble {
      padding: 8px 12px;
      border-radius: 12px;
      font-size: var(--text-sm);
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .chat-message-me .chat-bubble {
      background: var(--accent);
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .chat-message-them .chat-bubble {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-bottom-left-radius: 4px;
    }
    
    .chat-time {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
      padding: 0 4px;
    }
    
    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid var(--border);
      background: var(--bg-secondary);
    }
    
    #chat-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: var(--text-sm);
    }
    
    #chat-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    #chat-input::placeholder {
      color: var(--text-muted);
    }
    
    .chat-send-btn {
      padding: 8px 12px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 14px;
      transition: background var(--transition-fast);
    }
    
    .chat-send-btn:hover {
      background: var(--accent-hover, var(--accent));
      filter: brightness(1.1);
    }
    
    @media (max-width: 480px) {
      .chat-widget {
        width: calc(100% - 40px);
        right: 20px;
        left: 20px;
      }
    }
  `;
  
  document.head.appendChild(styles);
}
