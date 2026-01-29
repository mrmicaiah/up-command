/**
 * OAuth Helpers and Token Management
 */

import type { Env, OAuthToken } from '../types.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Get OAuth token for a service
 */
export async function getToken(
  db: D1Database,
  userId: string,
  service: string
): Promise<OAuthToken | null> {
  const result = await db
    .prepare('SELECT * FROM oauth_tokens WHERE user_id = ? AND service = ?')
    .bind(userId, service)
    .first<OAuthToken>();
  
  return result || null;
}

/**
 * Save or update OAuth token
 */
export async function saveToken(
  db: D1Database,
  token: OAuthToken
): Promise<void> {
  await db
    .prepare(`
      INSERT OR REPLACE INTO oauth_tokens 
      (user_id, service, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      token.user_id,
      token.service,
      token.access_token,
      token.refresh_token || null,
      token.expires_at || null
    )
    .run();
}

/**
 * Delete OAuth token
 */
export async function deleteToken(
  db: D1Database,
  userId: string,
  service: string
): Promise<void> {
  await db
    .prepare('DELETE FROM oauth_tokens WHERE user_id = ? AND service = ?')
    .bind(userId, service)
    .run();
}

/**
 * Refresh Google token if expired
 */
export async function refreshGoogleToken(
  db: D1Database,
  env: Env,
  userId: string,
  service: string
): Promise<string | null> {
  const token = await getToken(db, userId, service);
  if (!token) return null;
  
  // Check if token is expired (with 5 minute buffer)
  if (token.expires_at && token.expires_at > Date.now() + 300000) {
    return token.access_token;
  }
  
  // Need to refresh
  if (!token.refresh_token || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) return null;
  
  const data = await response.json() as {
    access_token: string;
    expires_in: number;
  };
  
  // Save updated token
  await saveToken(db, {
    ...token,
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000)
  });
  
  return data.access_token;
}

/**
 * Build Google OAuth URL
 */
export function buildGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Build GitHub OAuth URL
 */
export function buildGitHubAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state: state
  });
  
  return `https://github.com/login/oauth/authorize?${params}`;
}