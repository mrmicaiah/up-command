/**
 * UP Command MCP Server
 * Main entry point
 */

import { McpAgent } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';
import type { Env } from './types.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        name: 'UP Command',
        version: '1.0.0',
        user: env.USER_ID
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // OAuth callbacks
    if (url.pathname.startsWith('/oauth/')) {
      // TODO: Implement OAuth handlers
      return new Response('OAuth handler', { status: 200 });
    }
    
    // MCP endpoint
    if (url.pathname === '/mcp' || url.pathname === '/sse') {
      // TODO: Implement MCP handler
      return new Response('MCP endpoint', { status: 200 });
    }
    
    // API endpoints for dashboard
    if (url.pathname.startsWith('/api/')) {
      // TODO: Implement API routes
      return new Response('API endpoint', { status: 200 });
    }
    
    return new Response('Not found', { status: 404 });
  }
};