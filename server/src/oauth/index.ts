/**
 * OAuth Helper Functions
 * Token management, refresh logic, and service configuration
 */

import type { Env, OAuthProvider, GoogleService } from '../types.js';

// ==================
// API URLS
// ==================
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

// Google API URLs
export const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
export const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1';
export const BLOGGER_API_URL = 'https://www.googleapis.com/blogger/v3';
export const PEOPLE_API_URL = 'https://people.googleapis.com/v1';
export const ANALYTICS_DATA_API = 'https://analyticsdata.googleapis.com/v1beta';

// GitHub API URL
export const GITHUB_API_URL = 'https://api.github.com';

export const SERVICE_NAMES: Record<string, string> = {
  google_drive: 'Google Drive',
  gmail_personal: 'Gmail (Personal)',
  gmail_company: 'Gmail (Company)',
  blogger_personal: 'Blogger (Personal)',
  blogger_company: 'Blogger (Company)',
  google_contacts_personal: 'Google Contacts (Personal)',
  google_contacts_company: 'Google Contacts (Company)',
  google_analytics: 'Google Analytics',
  github: 'GitHub',
};

export const GOOGLE_SCOPES: Record<GoogleService, string[]> = {
  google_drive: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  gmail_personal: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  gmail_company: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  blogger_personal: [
    'https://www.googleapis.com/auth/blogger',
  ],
  blogger_company: [
    'https://www.googleapis.com/auth/blogger',
  ],
  google_contacts_personal: [
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  google_contacts_company: [
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  google_analytics: [
    'https://www.googleapis.com/auth/analytics.readonly',
  ],
};

export const GITHUB_SCOPES = ['repo', 'read:user'];

// ==================
// TOKEN MANAGEMENT
// ==================

/**
 * Get a valid access token for a Google service, refreshing if needed
 */
export async function getValidToken(
  env: Env,
  userId: string,
  provider: OAuthProvider
): Promise<string | null> {
  const result = await env.DB.prepare(
    'SELECT access_token, refresh_token, expires_at FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).bind(userId, provider).first<{
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
  }>();

  if (!result) return null;

  // Check if token is expired (with 5 minute buffer)
  if (result.expires_at) {
    const expiresAt = new Date(result.expires_at).getTime();
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt - buffer < now && result.refresh_token) {
      // Token expired or expiring soon, refresh it
      const newToken = await refreshGoogleToken(env, userId, provider, result.refresh_token);
      if (newToken) return newToken;
    }
  }

  return result.access_token;
}

/**
 * Get GitHub access token (no refresh needed - tokens don't expire)
 */
export async function getGitHubToken(
  env: Env,
  userId: string
): Promise<string | null> {
  const result = await env.DB.prepare(
    'SELECT access_token FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).bind(userId, 'github').first<{ access_token: string }>();
  return result?.access_token || null;
}

/**
 * Refresh a Google OAuth token
 */
async function refreshGoogleToken(
  env: Env,
  userId: string,
  provider: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) return null;

    const tokens: any = await response.json();
    const exp = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await env.DB.prepare(
      'UPDATE oauth_tokens SET access_token = ?, expires_at = ? WHERE user_id = ? AND provider = ?'
    ).bind(tokens.access_token, exp, userId, provider).run();

    return tokens.access_token;
  } catch {
    return null;
  }
}

/**
 * Build Google OAuth authorization URL
 */
export function buildGoogleAuthUrl(
  env: Env,
  userId: string,
  service: GoogleService,
  workerUrl: string
): string {
  const scopes = GOOGLE_SCOPES[service] || [];
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${workerUrl}/oauth/callback`,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: `${userId}:${service}`,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

/**
 * Build GitHub OAuth authorization URL
 */
export function buildGitHubAuthUrl(
  env: Env,
  userId: string,
  workerUrl: string
): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID || '',
    redirect_uri: `${workerUrl}/oauth/github/callback`,
    scope: GITHUB_SCOPES.join(' '),
    state: `${userId}:github`,
  });
  return `${GITHUB_AUTH_URL}?${params}`;
}

/**
 * Universal OAuth URL builder (for connect_service)
 */
export function buildOAuthUrl(
  env: Env,
  userId: string,
  service: OAuthProvider,
  workerUrl: string
): string {
  if (service === 'github') {
    return buildGitHubAuthUrl(env, userId, workerUrl);
  }
  return buildGoogleAuthUrl(env, userId, service as GoogleService, workerUrl);
}

/**
 * Check if a service is connected
 */
export async function isServiceConnected(
  env: Env,
  userId: string,
  provider: OAuthProvider
): Promise<boolean> {
  const result = await env.DB.prepare(
    'SELECT 1 FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).bind(userId, provider).first();
  return !!result;
}

/**
 * Disconnect a service
 */
export async function disconnectService(
  env: Env,
  userId: string,
  provider: OAuthProvider
): Promise<void> {
  await env.DB.prepare(
    'DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).bind(userId, provider).run();
}

/**
 * Get all connected services for a user
 */
export async function getConnectedServices(
  env: Env,
  userId: string
): Promise<OAuthProvider[]> {
  const result = await env.DB.prepare(
    'SELECT provider FROM oauth_tokens WHERE user_id = ?'
  ).bind(userId).all();
  return (result.results || []).map((r: any) => r.provider as OAuthProvider);
}

/**
 * Find or create a folder path in Google Drive
 */
export async function findOrCreateFolderPath(
  token: string,
  folderPath: string
): Promise<{ id: string; name: string } | null> {
  const parts = folderPath.split('/').filter(p => p.trim());
  let parentId = 'root';
  let currentFolder = { id: 'root', name: 'My Drive' };

  for (const folderName of parts) {
    // Search for existing folder
    const query = `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchResp = await fetch(
      `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      { headers: { Authorization: 'Bearer ' + token } }
    );

    if (!searchResp.ok) return null;

    const data: any = await searchResp.json();

    if (data.files && data.files.length > 0) {
      currentFolder = data.files[0];
      parentId = currentFolder.id;
    } else {
      // Create the folder
      const createResp = await fetch(`${DRIVE_API_URL}/files`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        }),
      });

      if (!createResp.ok) return null;

      currentFolder = await createResp.json();
      parentId = currentFolder.id;
    }
  }

  return currentFolder;
}
