/**
 * Google Analytics Integration Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { getValidToken, ANALYTICS_DATA_API_URL } from '../../oauth/index.js';

export function registerAnalyticsTools(server: McpServer, ctx: ToolContext): void {
  const { env, getCurrentUser } = ctx;

  // Helper to get user's analytics properties from DB
  async function getProperties() {
    const result = await env.DB.prepare(
      'SELECT * FROM analytics_properties WHERE user_id = ?'
    ).bind(getCurrentUser()).all();
    return result.results || [];
  }

  server.tool('analytics_properties', {}, async () => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected. Run: connect_service google_analytics' }] };
    
    const properties = await getProperties() as any[];
    if (!properties.length) {
      return { content: [{ type: 'text', text: '📊 **No Analytics Properties Configured**\n\nUse `analytics_add_property` to add a GA4 property ID.\n\nExample: `analytics_add_property 123456789 "My Website"`' }] };
    }
    
    let out = '📊 **Your Analytics Properties**\n\n';
    properties.forEach((p: any) => {
      out += `• **${p.name}**\n  Property ID: ${p.property_id}\n`;
      if (p.blog_id) out += `  Blog ID: ${p.blog_id}\n`;
      out += '\n';
    });
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('analytics_add_property', {
    property_id: z.string().describe('GA4 property ID (numbers only)'),
    name: z.string().describe('Friendly name'),
    blog_id: z.string().optional().describe('Associated blog ID')
  }, async ({ property_id, name, blog_id }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected' }] };
    
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO analytics_properties (id, user_id, property_id, name, blog_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, getCurrentUser(), property_id, name, blog_id || null, new Date().toISOString()).run();
    
    return { content: [{ type: 'text', text: `✅ Added property: ${name} (${property_id})` }] };
  });

  server.tool('analytics_remove_property', {
    property_id: z.string().describe('GA4 property ID to remove')
  }, async ({ property_id }) => {
    await env.DB.prepare(
      'DELETE FROM analytics_properties WHERE user_id = ? AND property_id = ?'
    ).bind(getCurrentUser(), property_id).run();
    
    return { content: [{ type: 'text', text: `🗑️ Removed property: ${property_id}` }] };
  });

  server.tool('analytics_report', {
    property_id: z.string().optional().describe('Property ID (uses first if not specified)'),
    days: z.number().optional().default(7).describe('Number of days to report')
  }, async ({ property_id, days }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected' }] };
    
    let propId = property_id;
    if (!propId) {
      const props = await getProperties() as any[];
      if (!props.length) return { content: [{ type: 'text', text: '⛔ No properties configured. Use analytics_add_property first.' }] };
      propId = props[0].property_id;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const body = {
      dateRanges: [{ startDate: startDate.toISOString().split('T')[0], endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    };
    
    const resp = await fetch(`${ANALYTICS_DATA_API_URL}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!resp.ok) {
      const error = await resp.text();
      return { content: [{ type: 'text', text: `⛔ Error: ${error}` }] };
    }
    
    const data: any = await resp.json();
    
    // Calculate totals
    let totalUsers = 0, totalSessions = 0, totalViews = 0;
    (data.rows || []).forEach((row: any) => {
      totalUsers += parseInt(row.metricValues?.[0]?.value || 0);
      totalSessions += parseInt(row.metricValues?.[1]?.value || 0);
      totalViews += parseInt(row.metricValues?.[2]?.value || 0);
    });
    
    let out = `📊 **Analytics Report** (Last ${days} days)\n`;
    out += `Property: ${propId}\n\n`;
    out += `👥 Users: ${totalUsers.toLocaleString()}\n`;
    out += `📊 Sessions: ${totalSessions.toLocaleString()}\n`;
    out += `📄 Page Views: ${totalViews.toLocaleString()}\n`;
    
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('analytics_realtime', {
    property_id: z.string().optional()
  }, async ({ property_id }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected' }] };
    
    let propId = property_id;
    if (!propId) {
      const props = await getProperties() as any[];
      if (!props.length) return { content: [{ type: 'text', text: '⛔ No properties configured' }] };
      propId = props[0].property_id;
    }
    
    const body = {
      metrics: [{ name: 'activeUsers' }],
      dimensions: [{ name: 'country' }, { name: 'deviceCategory' }]
    };
    
    const resp = await fetch(`${ANALYTICS_DATA_API_URL}/properties/${propId}:runRealtimeReport`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!resp.ok) {
      const error = await resp.text();
      return { content: [{ type: 'text', text: `⛔ Error: ${error}` }] };
    }
    
    const data: any = await resp.json();
    
    let totalActive = 0;
    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    
    (data.rows || []).forEach((row: any) => {
      const users = parseInt(row.metricValues?.[0]?.value || 0);
      const country = row.dimensionValues?.[0]?.value || 'Unknown';
      const device = row.dimensionValues?.[1]?.value || 'Unknown';
      totalActive += users;
      byCountry[country] = (byCountry[country] || 0) + users;
      byDevice[device] = (byDevice[device] || 0) + users;
    });
    
    let out = `⚡ **Real-time Analytics**\n\n`;
    out += `👥 **Active Users:** ${totalActive}\n\n`;
    
    if (Object.keys(byCountry).length) {
      out += '**By Country:**\n';
      Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([c, n]) => {
        out += `• ${c}: ${n}\n`;
      });
      out += '\n';
    }
    
    if (Object.keys(byDevice).length) {
      out += '**By Device:**\n';
      Object.entries(byDevice).forEach(([d, n]) => {
        out += `• ${d}: ${n}\n`;
      });
    }
    
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('analytics_top_content', {
    property_id: z.string().optional(),
    days: z.number().optional().default(30),
    limit: z.number().optional().default(10)
  }, async ({ property_id, days, limit }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected' }] };
    
    let propId = property_id;
    if (!propId) {
      const props = await getProperties() as any[];
      if (!props.length) return { content: [{ type: 'text', text: '⛔ No properties configured' }] };
      propId = props[0].property_id;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const body = {
      dateRanges: [{ startDate: startDate.toISOString().split('T')[0], endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit
    };
    
    const resp = await fetch(`${ANALYTICS_DATA_API_URL}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error fetching data' }] };
    
    const data: any = await resp.json();
    
    let out = `📄 **Top Content** (Last ${days} days)\n\n`;
    (data.rows || []).forEach((row: any, i: number) => {
      const path = row.dimensionValues?.[0]?.value || '/';
      const title = row.dimensionValues?.[1]?.value || '(no title)';
      const views = parseInt(row.metricValues?.[0]?.value || 0);
      out += `${i + 1}. **${title}**\n   ${path} • ${views.toLocaleString()} views\n\n`;
    });
    
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('analytics_sources', {
    property_id: z.string().optional(),
    days: z.number().optional().default(30)
  }, async ({ property_id, days }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected' }] };
    
    let propId = property_id;
    if (!propId) {
      const props = await getProperties() as any[];
      if (!props.length) return { content: [{ type: 'text', text: '⛔ No properties configured' }] };
      propId = props[0].property_id;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const body = {
      dateRanges: [{ startDate: startDate.toISOString().split('T')[0], endDate: 'today' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    };
    
    const resp = await fetch(`${ANALYTICS_DATA_API_URL}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error fetching data' }] };
    
    const data: any = await resp.json();
    
    let out = `📊 **Traffic Sources** (Last ${days} days)\n\n`;
    (data.rows || []).forEach((row: any) => {
      const channel = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || 0);
      const users = parseInt(row.metricValues?.[1]?.value || 0);
      out += `• **${channel}**\n  Sessions: ${sessions.toLocaleString()} | Users: ${users.toLocaleString()}\n\n`;
    });
    
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('analytics_geography', {
    property_id: z.string().optional(),
    days: z.number().optional().default(30)
  }, async ({ property_id, days }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_analytics');
    if (!token) return { content: [{ type: 'text', text: '⛔ Google Analytics not connected' }] };
    
    let propId = property_id;
    if (!propId) {
      const props = await getProperties() as any[];
      if (!props.length) return { content: [{ type: 'text', text: '⛔ No properties configured' }] };
      propId = props[0].property_id;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const body = {
      dateRanges: [{ startDate: startDate.toISOString().split('T')[0], endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      dimensions: [{ name: 'country' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 15
    };
    
    const resp = await fetch(`${ANALYTICS_DATA_API_URL}/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error fetching data' }] };
    
    const data: any = await resp.json();
    
    let out = `🌍 **Geographic Distribution** (Last ${days} days)\n\n`;
    (data.rows || []).forEach((row: any) => {
      const country = row.dimensionValues?.[0]?.value || 'Unknown';
      const users = parseInt(row.metricValues?.[0]?.value || 0);
      const sessions = parseInt(row.metricValues?.[1]?.value || 0);
      out += `• **${country}**: ${users.toLocaleString()} users, ${sessions.toLocaleString()} sessions\n`;
    });
    
    return { content: [{ type: 'text', text: out }] };
  });
}
