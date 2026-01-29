/**
 * Cloudinary Integration Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerCloudinaryTools(server: McpServer, ctx: ToolContext): void {
  const { env } = ctx;

  const getCloudinaryAuth = () => {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
  };

  server.tool('cloudinary_status', {}, async () => {
    const auth = getCloudinaryAuth();
    if (!auth) return { content: [{ type: 'text', text: '⛔ Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.' }] };
    
    try {
      const authHeader = 'Basic ' + btoa(`${auth.apiKey}:${auth.apiSecret}`);
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${auth.cloudName}/usage`, {
        headers: { Authorization: authHeader }
      });
      
      if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Failed to connect to Cloudinary' }] };
      
      const data: any = await resp.json();
      let out = '☁️ **Cloudinary Status**\n\n';
      out += `Cloud: ${auth.cloudName}\n`;
      out += `Storage: ${((data.storage?.usage || 0) / 1024 / 1024).toFixed(1)} MB / ${((data.storage?.limit || 0) / 1024 / 1024 / 1024).toFixed(1)} GB\n`;
      out += `Bandwidth: ${((data.bandwidth?.usage || 0) / 1024 / 1024 / 1024).toFixed(2)} GB / ${((data.bandwidth?.limit || 0) / 1024 / 1024 / 1024).toFixed(1)} GB\n`;
      out += `Transformations: ${data.transformations?.usage || 0} / ${data.transformations?.limit || 0}\n`;
      return { content: [{ type: 'text', text: out }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: '⛔ Error: ' + e.message }] };
    }
  });

  server.tool('cloudinary_list', {
    folder: z.string().optional().describe('Filter by folder path'),
    tag: z.string().optional().describe('Filter by tag'),
    max_results: z.number().optional().default(30)
  }, async ({ folder, tag, max_results }) => {
    const auth = getCloudinaryAuth();
    if (!auth) return { content: [{ type: 'text', text: '⛔ Cloudinary not configured' }] };
    
    try {
      const authHeader = 'Basic ' + btoa(`${auth.apiKey}:${auth.apiSecret}`);
      let url = `https://api.cloudinary.com/v1_1/${auth.cloudName}/resources/image?max_results=${max_results}`;
      if (folder) url += `&prefix=${encodeURIComponent(folder)}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      
      const resp = await fetch(url, { headers: { Authorization: authHeader } });
      if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error listing images' }] };
      
      const data: any = await resp.json();
      if (!data.resources?.length) return { content: [{ type: 'text', text: '📭 No images found' }] };
      
      let out = `🖼️ **Images** (${data.resources.length})\n\n`;
      data.resources.forEach((img: any) => {
        const size = img.bytes ? `${(img.bytes / 1024).toFixed(1)}KB` : '';
        out += `• ${img.public_id}\n  ${img.secure_url}\n  ${img.format} ${img.width}x${img.height} ${size}\n\n`;
      });
      return { content: [{ type: 'text', text: out }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: '⛔ Error: ' + e.message }] };
    }
  });

  server.tool('cloudinary_folders', {
    parent: z.string().optional().describe('Parent folder path')
  }, async ({ parent }) => {
    const auth = getCloudinaryAuth();
    if (!auth) return { content: [{ type: 'text', text: '⛔ Cloudinary not configured' }] };
    
    try {
      const authHeader = 'Basic ' + btoa(`${auth.apiKey}:${auth.apiSecret}`);
      let url = `https://api.cloudinary.com/v1_1/${auth.cloudName}/folders`;
      if (parent) url += `/${encodeURIComponent(parent)}`;
      
      const resp = await fetch(url, { headers: { Authorization: authHeader } });
      if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error listing folders' }] };
      
      const data: any = await resp.json();
      if (!data.folders?.length) return { content: [{ type: 'text', text: '📭 No folders found' }] };
      
      let out = `📁 **Folders**${parent ? ` in ${parent}` : ''}\n\n`;
      data.folders.forEach((f: any) => { out += `• ${f.name} (${f.path})\n`; });
      return { content: [{ type: 'text', text: out }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: '⛔ Error: ' + e.message }] };
    }
  });

  server.tool('cloudinary_upload', {
    image_base64: z.string().describe('Base64-encoded image data'),
    filename: z.string().optional().describe('Desired filename'),
    folder: z.string().optional().describe('Folder path'),
    tags: z.array(z.string()).optional().describe('Tags for organization'),
    overwrite: z.boolean().optional().default(false)
  }, async ({ image_base64, filename, folder, tags, overwrite }) => {
    const auth = getCloudinaryAuth();
    if (!auth) return { content: [{ type: 'text', text: '⛔ Cloudinary not configured' }] };
    
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const params: Record<string, string> = { timestamp: timestamp.toString() };
      if (filename) params.public_id = filename;
      if (folder) params.folder = folder;
      if (tags?.length) params.tags = tags.join(',');
      if (overwrite) params.overwrite = 'true';
      
      // Generate signature
      const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
      const encoder = new TextEncoder();
      const data = encoder.encode(sortedParams + auth.apiSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const formData = new FormData();
      formData.append('file', `data:image/png;base64,${image_base64}`);
      formData.append('api_key', auth.apiKey);
      formData.append('signature', signature);
      Object.entries(params).forEach(([k, v]) => formData.append(k, v));
      
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${auth.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        return { content: [{ type: 'text', text: `⛔ Upload failed: ${error}` }] };
      }
      
      const result: any = await resp.json();
      return { content: [{ type: 'text', text: `✅ Uploaded: ${result.public_id}\n\n🔗 ${result.secure_url}\n\nSize: ${(result.bytes / 1024).toFixed(1)}KB | ${result.width}x${result.height}` }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: '⛔ Error: ' + e.message }] };
    }
  });

  server.tool('cloudinary_url', {
    public_id: z.string().describe('Public ID of the image'),
    width: z.number().optional().describe('Resize width'),
    height: z.number().optional().describe('Resize height'),
    crop: z.enum(['fill', 'fit', 'scale', 'thumb', 'crop']).optional(),
    gravity: z.enum(['auto', 'face', 'center', 'north', 'south', 'east', 'west']).optional(),
    quality: z.enum(['auto', 'auto:low', 'auto:eco', 'auto:good', 'auto:best']).optional().default('auto'),
    format: z.enum(['auto', 'webp', 'avif', 'jpg', 'png']).optional().default('auto')
  }, async ({ public_id, width, height, crop, gravity, quality, format }) => {
    const auth = getCloudinaryAuth();
    if (!auth) return { content: [{ type: 'text', text: '⛔ Cloudinary not configured' }] };
    
    const transforms: string[] = [];
    if (width || height) {
      let t = '';
      if (width) t += `w_${width}`;
      if (height) t += (t ? ',' : '') + `h_${height}`;
      if (crop) t += `,c_${crop}`;
      if (gravity) t += `,g_${gravity}`;
      transforms.push(t);
    }
    if (quality) transforms.push(`q_${quality}`);
    if (format && format !== 'auto') transforms.push(`f_${format}`);
    else transforms.push('f_auto');
    
    const transformString = transforms.length ? transforms.join('/') + '/' : '';
    const url = `https://res.cloudinary.com/${auth.cloudName}/image/upload/${transformString}${public_id}`;
    
    return { content: [{ type: 'text', text: `🔗 **Optimized URL:**\n\n${url}` }] };
  });

  server.tool('cloudinary_delete', {
    public_id: z.string().describe('Public ID of the image to delete')
  }, async ({ public_id }) => {
    const auth = getCloudinaryAuth();
    if (!auth) return { content: [{ type: 'text', text: '⛔ Cloudinary not configured' }] };
    
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const params = `public_id=${public_id}&timestamp=${timestamp}`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(params + auth.apiSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const formData = new FormData();
      formData.append('public_id', public_id);
      formData.append('api_key', auth.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${auth.cloudName}/image/destroy`, {
        method: 'POST',
        body: formData
      });
      
      if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error deleting image' }] };
      
      const result: any = await resp.json();
      if (result.result === 'ok') {
        return { content: [{ type: 'text', text: `🗑️ Deleted: ${public_id}` }] };
      } else {
        return { content: [{ type: 'text', text: `⚠️ Delete result: ${result.result}` }] };
      }
    } catch (e: any) {
      return { content: [{ type: 'text', text: '⛔ Error: ' + e.message }] };
    }
  });
}
