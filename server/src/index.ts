/**
 * UP Command MCP Server
 * Main entry point with MCP agent, OAuth, and API routing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import type { Env, ToolContext } from './types.js';
import { registerAllTools } from './tools/index.js';
import { GOOGLE_TOKEN_URL, GITHUB_TOKEN_URL, SERVICE_NAMES } from './oauth/index.js';

// ==================
// MCP AGENT
// ==================
export class UpCommandMCP extends McpAgent {
  server = new McpServer({ name: "UP Command", version: "1.0.0" });

  async init() {
    const env = this.env as Env;
    const userId = env.USER_ID || 'micaiah';

    const getTeammates = (): string[] => {
      const team = env.TEAM || 'micaiah,irene';
      return team.split(',').map((t: string) => t.trim()).filter((t: string) => t !== userId);
    };

    const ctx: ToolContext = {
      server: this.server,
      env,
      getCurrentUser: () => userId,
      getTeammates,
      getTeammate: () => getTeammates()[0] || 'unknown',
    };

    registerAllTools(ctx);
  }
}

// ==================
// REQUEST ROUTING
// ==================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const userId = env.USER_ID || 'micaiah';
    const workerName = env.WORKER_NAME || 'up-command';
    const workerUrl = `https://${workerName}.micaiah-tasks.workers.dev`;

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        name: 'UP Command',
        version: '1.0.0',
        user: userId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // REST API routes for dashboard
    if (url.pathname.startsWith('/api/')) {
      return handleApiRoutes(request, env, url);
    }

    // Google OAuth callback
    if (url.pathname === '/oauth/callback') {
      return handleGoogleOAuth(request, env, workerUrl);
    }

    // GitHub OAuth callback
    if (url.pathname === '/oauth/github/callback') {
      return handleGitHubOAuth(request, env, workerUrl);
    }

    // MCP SSE endpoint
    if (url.pathname.startsWith('/sse')) {
      return UpCommandMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },
};

// ==================
// OAUTH HANDLERS
// ==================
async function handleGoogleOAuth(request: Request, env: Env, workerUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing params', { status: 400 });
  }

  const [stateUserId, provider] = state.includes(':')
    ? state.split(':')
    : [state, 'google_drive'];

  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID || '',
      client_secret: env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: workerUrl + '/oauth/callback',
      grant_type: 'authorization_code'
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return new Response('Token failed: ' + err, { status: 500 });
  }

  const tokens: any = await tokenResp.json();
  const exp = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?) 
     ON CONFLICT(user_id, provider) DO UPDATE SET 
       access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?`
  ).bind(
    crypto.randomUUID(),
    stateUserId,
    provider,
    tokens.access_token,
    tokens.refresh_token,
    exp,
    new Date().toISOString(),
    tokens.access_token,
    tokens.refresh_token,
    exp
  ).run();

  const serviceName = SERVICE_NAMES[provider] || provider;
  return new Response(
    `<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0">
      <div style="text-align:center">
        <h1>✅ ${serviceName} Connected!</h1>
        <p>Close this window and return to Claude</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

async function handleGitHubOAuth(request: Request, env: Env, workerUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing params', { status: 400 });
  }

  const [stateUserId] = state.split(':');

  const tokenResp = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID || '',
      client_secret: env.GITHUB_CLIENT_SECRET || '',
      code: code,
      redirect_uri: workerUrl + '/oauth/github/callback',
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return new Response('GitHub token failed: ' + err, { status: 500 });
  }

  const tokens: any = await tokenResp.json();
  
  if (tokens.error) {
    return new Response('GitHub error: ' + tokens.error_description, { status: 500 });
  }

  await env.DB.prepare(
    `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?) 
     ON CONFLICT(user_id, provider) DO UPDATE SET 
       access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?`
  ).bind(
    crypto.randomUUID(),
    stateUserId,
    'github',
    tokens.access_token,
    null,
    null,
    new Date().toISOString(),
    tokens.access_token,
    null,
    null
  ).run();

  return new Response(
    `<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0">
      <div style="text-align:center">
        <h1>✅ GitHub Connected!</h1>
        <p>Close this window and return to Claude</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

// ==================
// API ROUTES (stub - will be expanded)
// ==================
async function handleApiRoutes(request: Request, env: Env, url: URL): Promise<Response> {
  // TODO: Implement full API routes
  // For now, return placeholder
  return new Response(JSON.stringify({ 
    error: 'API routes not yet implemented',
    path: url.pathname 
  }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}
