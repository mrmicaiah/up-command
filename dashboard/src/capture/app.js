/**
 * Capture PWA - Photo Upload Application
 * Mobile-first photo capture and upload for service business clients
 */

// ===== CONFIGURATION =====
const API_BASE = 'https://up-command.micaiah-tasks.workers.dev';
const DB_NAME = 'capture-pwa';
const DB_VERSION = 1;
const STORE_NAME = 'upload-queue';

// ===== STATE =====
let state = {
  slug: null,
  portalId: null,
  portalName: null,
  cloudinaryFolder: null,
  isOnline: navigator.onLine,
  uploadQueue: [],
  db: null
};

// ===== DOM ELEMENTS =====
const elements = {};

function initElements() {
  elements.loginScreen = document.getElementById('login-screen');
  elements.mainScreen = document.getElementById('main-screen');
  elements.portalName = document.getElementById('portal-name');
  elements.headerTitle = document.getElementById('header-title');
  elements.pinInput = document.getElementById('pin-input');
  elements.loginBtn = document.getElementById('login-btn');
  elements.loginError = document.getElementById('login-error');
  elements.cameraInput = document.getElementById('camera-input');
  elements.uploadProgress = document.getElementById('upload-progress');
  elements.progressFill = document.getElementById('progress-fill');
  elements.uploadSuccess = document.getElementById('upload-success');
  elements.offlineBanner = document.getElementById('offline-banner');
  elements.queueCount = document.getElementById('queue-count');
  elements.recentGrid = document.getElementById('recent-grid');
  elements.uploadCount = document.getElementById('upload-count');
  elements.installPrompt = document.getElementById('install-prompt');
  elements.installBtn = document.getElementById('install-btn');
  elements.dismissInstall = document.getElementById('dismiss-install');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  initElements();
  extractSlugFromUrl();
  await initIndexedDB();
  await checkExistingSession();
  setupEventListeners();
  setupServiceWorker();
  setupOnlineStatus();
  setupInstallPrompt();
});

function extractSlugFromUrl() {
  // Try query parameter first: /capture/?c=client-slug
  const params = new URLSearchParams(window.location.search);
  if (params.get('c')) {
    state.slug = params.get('c');
    return;
  }
  
  // Try hash: /capture/#client-slug
  if (window.location.hash && window.location.hash.length > 1) {
    state.slug = window.location.hash.slice(1);
    return;
  }
  
  // Try path: /capture/client-slug
  const path = window.location.pathname;
  const match = path.match(/\/capture\/([^/]+)/);
  if (match && match[1] !== 'index.html') {
    state.slug = match[1];
  }
}

async function checkExistingSession() {
  if (!state.slug) {
    showError('Invalid URL. Please use your assigned capture link.');
    return;
  }

  const sessionKey = `capture_session_${state.slug}`;
  const session = localStorage.getItem(sessionKey);
  
  if (session) {
    try {
      const data = JSON.parse(session);
      state.portalId = data.portal_id;
      state.portalName = data.portal_name;
      state.cloudinaryFolder = data.cloudinary_folder;
      showMainScreen();
      loadRecentUploads();
      loadStats();
      processOfflineQueue();
    } catch (e) {
      localStorage.removeItem(sessionKey);
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

// ===== INDEXEDDB FOR OFFLINE QUEUE =====
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      state.db = request.result;
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function addToQueue(imageData) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add({
      imageData,
      portalId: state.portalId,
      timestamp: Date.now()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQueuedItems() {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromQueue(id) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // PIN input
  elements.pinInput.addEventListener('input', (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = value;
    elements.loginBtn.disabled = value.length !== 4;
    hideError();
  });

  elements.pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !elements.loginBtn.disabled) {
      handleLogin();
    }
  });

  elements.loginBtn.addEventListener('click', handleLogin);

  // Camera input
  elements.cameraInput.addEventListener('change', handlePhotoCapture);

  // Install prompt
  elements.installBtn.addEventListener('click', handleInstall);
  elements.dismissInstall.addEventListener('click', dismissInstallPrompt);
}

// ===== LOGIN =====
async function handleLogin() {
  const pin = elements.pinInput.value;
  if (pin.length !== 4) return;

  elements.loginBtn.disabled = true;
  elements.loginBtn.textContent = 'Verifying...';

  try {
    const response = await fetch(`${API_BASE}/api/capture/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: state.slug, pin })
    });

    const data = await response.json();

    if (data.success) {
      // Save session
      state.portalId = data.portal_id;
      state.portalName = data.portal_name;
      state.cloudinaryFolder = data.cloudinary_folder;
      
      const sessionKey = `capture_session_${state.slug}`;
      localStorage.setItem(sessionKey, JSON.stringify(data));
      
      showMainScreen();
      loadRecentUploads();
      loadStats();
      processOfflineQueue();
    } else {
      showError(data.error || 'Invalid PIN');
    }
  } catch (err) {
    showError('Connection failed. Please try again.');
  } finally {
    elements.loginBtn.disabled = false;
    elements.loginBtn.textContent = 'Unlock';
  }
}

// ===== PHOTO CAPTURE & UPLOAD =====
async function handlePhotoCapture(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Reset input for next capture
  e.target.value = '';

  if (state.isOnline) {
    await uploadPhoto(file);
  } else {
    await queuePhotoForLater(file);
  }
}

async function uploadPhoto(file) {
  showProgress();

  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('portal_id', state.portalId);

    const response = await fetch(`${API_BASE}/api/capture/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      showSuccess();
      loadRecentUploads();
      loadStats();
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (err) {
    console.error('Upload error:', err);
    // Queue for later if upload fails
    await queuePhotoForLater(file);
  }
}

async function queuePhotoForLater(file) {
  try {
    const reader = new FileReader();
    reader.onload = async () => {
      await addToQueue(reader.result);
      updateQueueDisplay();
      showOfflineBanner();
    };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error('Queue error:', err);
  }
}

async function processOfflineQueue() {
  if (!state.isOnline) return;

  const items = await getQueuedItems();
  if (items.length === 0) {
    hideOfflineBanner();
    return;
  }

  for (const item of items) {
    try {
      // Convert base64 back to blob
      const response = await fetch(item.imageData);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('portal_id', item.portalId);

      const uploadResponse = await fetch(`${API_BASE}/api/capture/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await uploadResponse.json();
      if (data.success) {
        await removeFromQueue(item.id);
      }
    } catch (err) {
      console.error('Queue processing error:', err);
      break; // Stop if we hit an error
    }
  }

  updateQueueDisplay();
  loadRecentUploads();
  loadStats();
}

// ===== LOAD DATA =====
async function loadRecentUploads() {
  try {
    const response = await fetch(
      `${API_BASE}/api/capture/recent?portal_id=${state.portalId}&limit=9`
    );
    const data = await response.json();

    if (data.uploads && data.uploads.length > 0) {
      elements.recentGrid.innerHTML = data.uploads.map(upload => `
        <div class="recent-thumb">
          <img src="${upload.thumbnail_url}" alt="Upload" loading="lazy">
        </div>
      `).join('');
    } else {
      elements.recentGrid.innerHTML = '<p class="empty-state">No photos yet</p>';
    }
  } catch (err) {
    console.error('Failed to load recent uploads:', err);
  }
}

async function loadStats() {
  try {
    const response = await fetch(
      `${API_BASE}/api/capture/stats?portal_id=${state.portalId}`
    );
    const data = await response.json();
    elements.uploadCount.textContent = data.total_uploads || 0;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ===== UI HELPERS =====
function showLoginScreen() {
  elements.loginScreen.classList.remove('hidden');
  elements.mainScreen.classList.add('hidden');
  if (state.slug) {
    // Could fetch portal name for display, but keep it simple
    elements.portalName.textContent = 'Photo Capture';
  }
  elements.pinInput.focus();
}

function showMainScreen() {
  elements.loginScreen.classList.add('hidden');
  elements.mainScreen.classList.remove('hidden');
  elements.headerTitle.textContent = state.portalName || 'Photo Capture';
}

function showProgress() {
  elements.uploadProgress.classList.remove('hidden');
  elements.uploadSuccess.classList.add('hidden');
  
  // Animate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress >= 90) {
      clearInterval(interval);
      progress = 90;
    }
    elements.progressFill.style.width = `${progress}%`;
  }, 200);
}

function showSuccess() {
  elements.progressFill.style.width = '100%';
  setTimeout(() => {
    elements.uploadProgress.classList.add('hidden');
    elements.uploadSuccess.classList.remove('hidden');
    elements.progressFill.style.width = '0%';
    
    // Hide success after 2 seconds
    setTimeout(() => {
      elements.uploadSuccess.classList.add('hidden');
    }, 2000);
  }, 300);
}

function showError(message) {
  elements.loginError.textContent = message;
  elements.loginError.classList.remove('hidden');
}

function hideError() {
  elements.loginError.classList.add('hidden');
}

function showOfflineBanner() {
  elements.offlineBanner.classList.remove('hidden');
}

function hideOfflineBanner() {
  elements.offlineBanner.classList.add('hidden');
}

async function updateQueueDisplay() {
  const items = await getQueuedItems();
  elements.queueCount.textContent = items.length;
  if (items.length === 0) {
    hideOfflineBanner();
  } else {
    showOfflineBanner();
  }
}

// ===== ONLINE/OFFLINE STATUS =====
function setupOnlineStatus() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
  });
}

// ===== SERVICE WORKER =====
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/capture/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'PROCESS_QUEUE') {
        processOfflineQueue();
      }
    });
  }
}

// ===== INSTALL PROMPT =====
let deferredPrompt = null;

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Check if user has dismissed before
    if (!localStorage.getItem('capture_install_dismissed')) {
      elements.installPrompt.classList.remove('hidden');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    elements.installPrompt.classList.add('hidden');
  });
}

async function handleInstall() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    deferredPrompt = null;
  }
  elements.installPrompt.classList.add('hidden');
}

function dismissInstallPrompt() {
  elements.installPrompt.classList.add('hidden');
  localStorage.setItem('capture_install_dismissed', 'true');
}
