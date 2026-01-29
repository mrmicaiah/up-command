/**
 * Blog Tools - MicaiahBussey.com and UP Blogs
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

// API endpoints
const MB_BLOG_API_URL = 'https://email-bot-server.micaiah-tasks.workers.dev';
const MB_DEFAULT_SITE = 'micaiah-bussey';
const UP_BLOGS_API_URL = 'https://up-blogs-1.micaiah-tasks.workers.dev';

// Helper for MB Blog requests
async function mbBlogRequest(env: any, path: string, method: string = 'GET', body?: any) {
  const apiKey = env.COURIER_API_KEY;
  if (!apiKey) throw new Error('COURIER_API_KEY not configured');
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  
  const resp = await fetch(`${MB_BLOG_API_URL}${path}`, options);
  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Blog API error: ${resp.status} - ${error}`);
  }
  return resp.json();
}

// Helper for UP Blogs requests
async function upBlogsRequest(env: any, blogId: string | null, path: string, method: string = 'GET', body?: any, apiKey?: string) {
  const fullPath = blogId ? `/${blogId}${path}` : path;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (apiKey) (options.headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`;
  if (body) options.body = JSON.stringify(body);
  
  const resp = await fetch(`${UP_BLOGS_API_URL}${fullPath}`, options);
  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`UP Blogs API error: ${resp.status} - ${error}`);
  }
  return resp.json();
}

// Get blog API key from D1 or env
async function getBlogApiKey(env: any, blogId: string): Promise<string | null> {
  try {
    const result = await env.DB.prepare('SELECT api_key FROM blog_api_keys WHERE blog_id = ?').bind(blogId).first();
    if (result?.api_key) return result.api_key;
  } catch (e) {
    console.log('D1 lookup failed, falling back to env vars');
  }
  const specificKey = env[`BLOG_API_KEY_${blogId.toUpperCase().replace(/-/g, '_')}`];
  if (specificKey) return specificKey;
  return env.UP_BLOGS_API_KEY || null;
}

// Store blog API key in D1
async function storeBlogApiKey(env: any, blogId: string, apiKey: string): Promise<void> {
  await env.DB.prepare('INSERT OR REPLACE INTO blog_api_keys (blog_id, api_key, created_at) VALUES (?, ?, datetime("now"))').bind(blogId, apiKey).run();
}

export function registerBlogTools(server: McpServer, ctx: ToolContext): void {
  const { env } = ctx;

  // ========================================
  // MICAIAHBUSSEY.COM BLOG TOOLS
  // ========================================

  server.tool('mb_list_posts', {
    status: z.enum(['draft', 'scheduled', 'published', 'all']).optional().describe('Filter by status'),
    limit: z.number().optional().default(20).describe('Number of posts to return'),
  }, async ({ status, limit }) => {
    try {
      let path = `/api/blog/admin/posts?site=${MB_DEFAULT_SITE}`;
      if (status && status !== 'all') path += `&status=${status}`;
      if (limit) path += `&limit=${limit}`;
      const result: any = await mbBlogRequest(env, path);
      if (!result.posts?.length) return { content: [{ type: 'text', text: '📭 No blog posts found' }] };
      
      let out = `📝 **MicaiahBussey.com Blog Posts** (${result.posts.length})\n\n`;
      if (result.counts) out += `Drafts: ${result.counts.draft || 0} | Scheduled: ${result.counts.scheduled || 0} | Published: ${result.counts.published || 0}\n\n`;
      for (const p of result.posts) {
        const statusIcon = p.status === 'published' ? '✅' : p.status === 'scheduled' ? '⏰' : '📝';
        out += `${statusIcon} **${p.title}**\n`;
        out += `   Slug: ${p.slug} | Status: ${p.status}`;
        if (p.published_at) out += ` | Published: ${p.published_at.split('T')[0]}`;
        out += `\n   ID: ${p.id}\n\n`;
      }
      return { content: [{ type: 'text', text: out }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_get_post', {
    post_id: z.string().describe('Post ID'),
  }, async ({ post_id }) => {
    try {
      const result: any = await mbBlogRequest(env, `/api/blog/admin/posts/${post_id}`);
      const p = result.post;
      const statusIcon = p.status === 'published' ? '✅' : p.status === 'scheduled' ? '⏰' : '📝';
      let out = `${statusIcon} **${p.title}**\n\n`;
      out += `**ID:** ${p.id}\n**Slug:** ${p.slug}\n**Status:** ${p.status}\n`;
      out += `**Category:** ${p.category || '(none)'}\n**Author:** ${p.author || 'Micaiah Bussey'}\n`;
      if (p.excerpt) out += `**Excerpt:** ${p.excerpt}\n`;
      if (p.featured_image) out += `**Image:** ${p.featured_image}\n`;
      out += `\n---\n\n**Content:**\n\`\`\`markdown\n${p.content_md?.slice(0, 2000)}${p.content_md?.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\``;
      return { content: [{ type: 'text', text: out }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_create_post', {
    title: z.string().describe('Post title'),
    content_md: z.string().describe('Post content in Markdown'),
    slug: z.string().optional().describe('URL slug'),
    excerpt: z.string().optional().describe('Short excerpt'),
    category: z.string().optional().describe('Post category'),
    tags: z.array(z.string()).optional().describe('Array of tags'),
    featured_image: z.string().optional().describe('Featured image URL'),
    author: z.string().optional().default('Micaiah Bussey').describe('Author name'),
    status: z.enum(['draft', 'published']).optional().default('draft').describe('Initial status'),
  }, async ({ title, content_md, slug, excerpt, category, tags, featured_image, author, status }) => {
    try {
      const result: any = await mbBlogRequest(env, '/api/blog/admin/posts', 'POST', {
        title, content_md, slug, excerpt, category, tags, featured_image, author, status, site: MB_DEFAULT_SITE,
      });
      let out = `✅ Post created: **${title}**\n\nID: ${result.id}\nSlug: ${result.slug}\nStatus: ${result.status}`;
      return { content: [{ type: 'text', text: out }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_update_post', {
    post_id: z.string().describe('Post ID to update'),
    title: z.string().optional().describe('New title'),
    content_md: z.string().optional().describe('New content'),
    slug: z.string().optional().describe('New slug'),
    excerpt: z.string().optional().describe('New excerpt'),
    category: z.string().optional().describe('New category'),
    tags: z.array(z.string()).optional().describe('New tags'),
    featured_image: z.string().optional().describe('New image URL'),
    author: z.string().optional().describe('New author'),
  }, async ({ post_id, title, content_md, slug, excerpt, category, tags, featured_image, author }) => {
    try {
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (content_md !== undefined) updates.content_md = content_md;
      if (slug !== undefined) updates.slug = slug;
      if (excerpt !== undefined) updates.excerpt = excerpt;
      if (category !== undefined) updates.category = category;
      if (tags !== undefined) updates.tags = tags;
      if (featured_image !== undefined) updates.featured_image = featured_image;
      if (author !== undefined) updates.author = author;
      await mbBlogRequest(env, `/api/blog/admin/posts/${post_id}`, 'PUT', updates);
      return { content: [{ type: 'text', text: '✅ Post updated' }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_delete_post', {
    post_id: z.string().describe('Post ID to delete'),
  }, async ({ post_id }) => {
    try {
      await mbBlogRequest(env, `/api/blog/admin/posts/${post_id}`, 'DELETE');
      return { content: [{ type: 'text', text: '✅ Post deleted' }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_publish_post', {
    post_id: z.string().describe('Post ID to publish'),
  }, async ({ post_id }) => {
    try {
      const result: any = await mbBlogRequest(env, `/api/blog/admin/posts/${post_id}/publish`, 'POST');
      return { content: [{ type: 'text', text: `✅ Post published!\n\nPublished at: ${result.published_at}` }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_unpublish_post', {
    post_id: z.string().describe('Post ID to unpublish'),
  }, async ({ post_id }) => {
    try {
      await mbBlogRequest(env, `/api/blog/admin/posts/${post_id}/unpublish`, 'POST');
      return { content: [{ type: 'text', text: '✅ Post reverted to draft' }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });

  server.tool('mb_schedule_post', {
    post_id: z.string().describe('Post ID to schedule'),
    scheduled_at: z.string().describe('ISO 8601 datetime'),
  }, async ({ post_id, scheduled_at }) => {
    try {
      await mbBlogRequest(env, `/api/blog/admin/posts/${post_id}/schedule`, 'POST', { scheduled_at });
      const date = new Date(scheduled_at);
      const formatted = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return { content: [{ type: 'text', text: `⏰ Post scheduled for **${formatted}**` }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `⛔ ${e.message}` }] };
    }
  });
}
