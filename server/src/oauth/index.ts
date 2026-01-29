/**
 * OAuth Helper Functions
 * Token management, refresh logic, and service configuration
 */

import type { Env, OAuthProvider, GoogleService } from '../types.js';

// ==================
// CONSTANTS
// ==================
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

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
 * Get a valid access token for a service, refreshing if needed
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
