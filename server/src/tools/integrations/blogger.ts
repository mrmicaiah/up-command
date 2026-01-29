/**
 * Blogger Integration Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { getValidToken, BLOGGER_API_URL } from '../../oauth/index.js';

export function registerBloggerTools(server: McpServer, ctx: ToolContext): void {
  const { env, getCurrentUser } = ctx;

  server.tool('list_blogs', {
    account: z.enum(['personal', 'company']).optional().default('company')
  }, async ({ account }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected. Run: connect_service ${provider}` }] };
    
    const resp = await fetch(`${BLOGGER_API_URL}/users/self/blogs`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error fetching blogs' }] };
    
    const data: any = await resp.json();
    if (!data.items?.length) return { content: [{ type: 'text', text: '📭 No blogs found' }] };
    
    let out = `📝 **Your Blogs (${account})**\n\n`;
    data.items.forEach((blog: any) => {
      out += `• **${blog.name}**\n  ID: ${blog.id}\n  URL: ${blog.url}\n  Posts: ${blog.posts?.totalItems || 0}\n\n`;
    });
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('list_blog_posts', {
    blog_id: z.string().describe('Blog ID'),
    account: z.enum(['personal', 'company']).optional().default('company'),
    status: z.enum(['live', 'draft', 'scheduled']).optional().default('live'),
    max_results: z.number().optional().default(10)
  }, async ({ blog_id, account, status, max_results }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    let url = `${BLOGGER_API_URL}/blogs/${blog_id}/posts?maxResults=${max_results}`;
    if (status === 'draft') url += '&status=draft';
    else if (status === 'scheduled') url += '&status=scheduled';
    
    const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error fetching posts' }] };
    
    const data: any = await resp.json();
    if (!data.items?.length) return { content: [{ type: 'text', text: `📭 No ${status} posts found` }] };
    
    let out = `📄 **${status.charAt(0).toUpperCase() + status.slice(1)} Posts** (${data.items.length})\n\n`;
    data.items.forEach((post: any) => {
      out += `• **${post.title}**\n  ID: ${post.id}\n  ${post.url || '(draft)'}\n  ${new Date(post.published || post.updated).toLocaleDateString()}\n\n`;
    });
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('get_blog_post', {
    blog_id: z.string(),
    post_id: z.string(),
    account: z.enum(['personal', 'company']).optional().default('company')
  }, async ({ blog_id, post_id, account }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    const resp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}/posts/${post_id}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Post not found' }] };
    
    const post: any = await resp.json();
    let out = `📄 **${post.title}**\n\n`;
    out += `ID: ${post.id}\n`;
    out += `Status: ${post.status || 'live'}\n`;
    out += `URL: ${post.url || '(draft)'}\n`;
    out += `Published: ${post.published ? new Date(post.published).toLocaleString() : 'Not published'}\n`;
    if (post.labels?.length) out += `Labels: ${post.labels.join(', ')}\n`;
    out += `\n---\n\n${post.content?.slice(0, 2000) || '(no content)'}`;
    if (post.content?.length > 2000) out += '\n\n... (truncated)';
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('create_blog_post', {
    blog_id: z.string().describe('Blog ID'),
    title: z.string(),
    content: z.string().describe('HTML content'),
    labels: z.array(z.string()).optional().describe('Tags/categories'),
    is_draft: z.boolean().optional().default(true),
    account: z.enum(['personal', 'company']).optional().default('company')
  }, async ({ blog_id, title, content, labels, is_draft, account }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    const post: any = { title, content };
    if (labels?.length) post.labels = labels;
    
    const url = `${BLOGGER_API_URL}/blogs/${blog_id}/posts${is_draft ? '?isDraft=true' : ''}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error creating post' }] };
    
    const created: any = await resp.json();
    return { content: [{ type: 'text', text: `✅ Created ${is_draft ? 'draft' : 'published'} post: "${created.title}"\n\nID: ${created.id}\n${created.url || '(draft - no URL yet)'}` }] };
  });

  server.tool('update_blog_post', {
    blog_id: z.string(),
    post_id: z.string(),
    title: z.string().optional(),
    content: z.string().optional().describe('HTML content'),
    labels: z.array(z.string()).optional(),
    account: z.enum(['personal', 'company']).optional().default('company')
  }, async ({ blog_id, post_id, title, content, labels, account }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    // Get existing post first
    const getResp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}/posts/${post_id}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!getResp.ok) return { content: [{ type: 'text', text: '⛔ Post not found' }] };
    
    const existing: any = await getResp.json();
    const updated: any = {
      title: title || existing.title,
      content: content || existing.content,
    };
    if (labels) updated.labels = labels;
    
    const resp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}/posts/${post_id}`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error updating post' }] };
    
    const result: any = await resp.json();
    return { content: [{ type: 'text', text: `✅ Updated: "${result.title}"\n\n${result.url || '(draft)'}` }] };
  });

  server.tool('delete_blog_post', {
    blog_id: z.string(),
    post_id: z.string(),
    account: z.enum(['personal', 'company']).optional().default('company')
  }, async ({ blog_id, post_id, account }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    const resp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}/posts/${post_id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error deleting post' }] };
    
    return { content: [{ type: 'text', text: `🗑️ Post deleted` }] };
  });

  server.tool('publish_blog_post', {
    blog_id: z.string(),
    post_id: z.string(),
    account: z.enum(['personal', 'company']).optional().default('company')
  }, async ({ blog_id, post_id, account }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    const resp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}/posts/${post_id}/publish`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error publishing post' }] };
    
    const post: any = await resp.json();
    return { content: [{ type: 'text', text: `✅ Published: "${post.title}"\n\n🌐 ${post.url}` }] };
  });

  server.tool('get_blog_stats', {
    blog_id: z.string(),
    account: z.enum(['personal', 'company']).optional().default('company'),
    range: z.enum(['7DAYS', '30DAYS', 'ALL']).optional().default('30DAYS')
  }, async ({ blog_id, account, range }) => {
    const provider = account === 'personal' ? 'blogger_personal' : 'blogger_company';
    const token = await getValidToken(env, getCurrentUser(), provider);
    if (!token) return { content: [{ type: 'text', text: `⛔ ${account} Blogger not connected` }] };
    
    // Get blog info
    const blogResp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!blogResp.ok) return { content: [{ type: 'text', text: '⛔ Blog not found' }] };
    
    const blog: any = await blogResp.json();
    
    // Get page views (if available)
    const statsResp = await fetch(`${BLOGGER_API_URL}/blogs/${blog_id}/pageviews?range=${range}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    
    let out = `📊 **${blog.name} Stats**\n\n`;
    out += `Posts: ${blog.posts?.totalItems || 0}\n`;
    out += `Pages: ${blog.pages?.totalItems || 0}\n`;
    
    if (statsResp.ok) {
      const stats: any = await statsResp.json();
      if (stats.counts?.length) {
        const total = stats.counts.reduce((sum: number, c: any) => sum + parseInt(c.count || 0), 0);
        out += `\n**Page Views (${range})**\n`;
        out += `Total: ${total.toLocaleString()}\n`;
      }
    }
    
    return { content: [{ type: 'text', text: out }] };
  });
}
