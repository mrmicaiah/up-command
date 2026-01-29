/**
 * Google Drive Tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { getValidToken, buildGoogleAuthUrl, findOrCreateFolderPath, DRIVE_API_URL, DRIVE_UPLOAD_URL } from '../../oauth/index.js';

export function registerDriveTools(server: McpServer, ctx: ToolContext): void {
  const { env, getCurrentUser } = ctx;

  server.tool('drive_status', {}, async () => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) {
      const workerName = env.WORKER_NAME || 'up-command';
      const workerUrl = `https://${workerName}.micaiah-tasks.workers.dev`;
      const url = buildGoogleAuthUrl(env, getCurrentUser(), 'google_drive', workerUrl);
      return { content: [{ type: 'text', text: '🔗 Not connected. Click:\n' + url }] };
    }
    return { content: [{ type: 'text', text: '✅ Google Drive connected' }] };
  });

  server.tool('list_drive_folders', {
    parent_id: z.string().optional().describe('Parent folder ID (root if not specified)')
  }, async ({ parent_id }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) return { content: [{ type: 'text', text: '⛔ Not connected. Run: connect_service google_drive' }] };
    
    const q = parent_id ? `'${parent_id}' in parents` : "'root' in parents";
    const resp = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(q + " and mimeType = 'application/vnd.google-apps.folder' and trashed = false")}&fields=files(id,name)`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data: any = await resp.json();
    if (!data.files?.length) return { content: [{ type: 'text', text: 'No folders' }] };
    
    let out = '📁 Folders:\n';
    data.files.forEach((f: any) => { out += `• ${f.name} (ID: ${f.id})\n`; });
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('search_drive', {
    query: z.string().describe('Search query')
  }, async ({ query }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) return { content: [{ type: 'text', text: '⛔ Not connected. Run: connect_service google_drive' }] };
    
    const resp = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(`name contains '${query}' and trashed = false`)}&fields=files(id,name,webViewLink,parents)&pageSize=10`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data: any = await resp.json();
    if (!data.files?.length) return { content: [{ type: 'text', text: `No results for "${query}"` }] };
    
    let out = '🔍 Results:\n';
    data.files.forEach((f: any) => { out += `• ${f.name}\n  ${f.webViewLink}\n`; });
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('read_from_drive', {
    file_id: z.string().describe('File ID')
  }, async ({ file_id }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) return { content: [{ type: 'text', text: '⛔ Not connected' }] };
    
    const metaResp = await fetch(`${DRIVE_API_URL}/files/${file_id}?fields=id,name,mimeType,size`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!metaResp.ok) return { content: [{ type: 'text', text: '⛔ File not found' }] };
    
    const meta: any = await metaResp.json();
    const googleDocTypes: Record<string, string> = {
      'application/vnd.google-apps.document': 'text/plain',
      'application/vnd.google-apps.spreadsheet': 'text/csv',
      'application/vnd.google-apps.presentation': 'text/plain',
    };
    
    let content: string;
    if (googleDocTypes[meta.mimeType]) {
      const exportResp = await fetch(`${DRIVE_API_URL}/files/${file_id}/export?mimeType=${encodeURIComponent(googleDocTypes[meta.mimeType])}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!exportResp.ok) return { content: [{ type: 'text', text: '⛔ Error exporting' }] };
      content = await exportResp.text();
    } else {
      const downloadResp = await fetch(`${DRIVE_API_URL}/files/${file_id}?alt=media`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!downloadResp.ok) return { content: [{ type: 'text', text: '⛔ Error downloading' }] };
      content = await downloadResp.text();
    }
    
    const maxLength = 50000;
    const truncated = content.length > maxLength;
    if (truncated) content = content.slice(0, maxLength);
    
    let out = `📄 **${meta.name}**\nType: ${meta.mimeType}\n---\n\n${content}`;
    if (truncated) out += '\n\n... (truncated)';
    return { content: [{ type: 'text', text: out }] };
  });

  server.tool('save_to_drive', {
    filename: z.string(),
    content: z.string(),
    is_base64: z.boolean().optional().default(false).describe('True for binary files'),
    folder_id: z.string().optional().describe('Folder ID'),
    folder_path: z.string().optional().describe('Folder path (creates if needed)')
  }, async ({ filename, content, is_base64, folder_id, folder_path }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) return { content: [{ type: 'text', text: '⛔ Not connected' }] };
    
    let targetId = folder_id;
    let folderInfo = '';
    
    if (targetId) {
      folderInfo = ` (folder ID: ${targetId})`;
    } else if (folder_path) {
      const folder = await findOrCreateFolderPath(token, folder_path);
      if (folder) {
        targetId = folder.id;
        folderInfo = ` in "${folder_path}"`;
      } else {
        return { content: [{ type: 'text', text: `⛔ Could not find or create: ${folder_path}` }] };
      }
    }
    
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
    const textMimes: Record<string, string> = { txt: 'text/plain', md: 'text/markdown', html: 'text/html', json: 'application/json', ts: 'text/plain', js: 'text/javascript', css: 'text/css', py: 'text/x-python', csv: 'text/csv' };
    const binaryMimes: Record<string, string> = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
    
    const mime = is_base64 ? (binaryMimes[ext] || 'application/octet-stream') : (textMimes[ext] || 'text/plain');
    const meta: any = { name: filename, mimeType: mime };
    if (targetId) meta.parents = [targetId];
    
    if (is_base64) {
      const binaryStr = atob(content);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      
      const initResp = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=resumable`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': bytes.length.toString() },
        body: JSON.stringify(meta)
      });
      if (!initResp.ok) return { content: [{ type: 'text', text: '⛔ Error initiating upload' }] };
      
      const uploadUrl = initResp.headers.get('Location');
      if (!uploadUrl) return { content: [{ type: 'text', text: '⛔ No upload URL' }] };
      
      const uploadResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: bytes });
      if (!uploadResp.ok) return { content: [{ type: 'text', text: '⛔ Error uploading' }] };
      
      const file: any = await uploadResp.json();
      return { content: [{ type: 'text', text: `✅ Saved: ${file.name}${folderInfo}\nhttps://drive.google.com/file/d/${file.id}/view` }] };
    } else {
      const boundary = '---b' + Date.now();
      const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n${content}\r\n--${boundary}--`;
      
      const resp = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,webViewLink`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
      });
      if (!resp.ok) return { content: [{ type: 'text', text: '⛔ Error saving' }] };
      
      const file: any = await resp.json();
      return { content: [{ type: 'text', text: `✅ Saved: ${file.name}${folderInfo}\n${file.webViewLink}` }] };
    }
  });

  server.tool('update_drive_file', {
    file_id: z.string().describe('File ID to update'),
    content: z.string().describe('New content')
  }, async ({ file_id, content }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) return { content: [{ type: 'text', text: '⛔ Not connected' }] };
    
    const metaResp = await fetch(`${DRIVE_API_URL}/files/${file_id}?fields=id,name,mimeType`, { headers: { Authorization: 'Bearer ' + token } });
    if (!metaResp.ok) return { content: [{ type: 'text', text: '⛔ File not found' }] };
    
    const meta: any = await metaResp.json();
    if (meta.mimeType.startsWith('application/vnd.google-apps.')) {
      return { content: [{ type: 'text', text: '⛔ Cannot update Google Docs directly' }] };
    }
    
    const updateResp = await fetch(`${DRIVE_UPLOAD_URL}/files/${file_id}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': meta.mimeType || 'text/plain' },
      body: content
    });
    if (!updateResp.ok) return { content: [{ type: 'text', text: '⛔ Error updating' }] };
    
    const updated: any = await updateResp.json();
    return { content: [{ type: 'text', text: `✅ Updated: ${updated.name}` }] };
  });

  server.tool('get_folder_id', {
    folder_path: z.string().describe('Folder path like "Folder/Subfolder"')
  }, async ({ folder_path }) => {
    const token = await getValidToken(env, getCurrentUser(), 'google_drive');
    if (!token) return { content: [{ type: 'text', text: '⛔ Not connected' }] };
    
    const parts = folder_path.split('/').filter(p => p.trim());
    let parentId = 'root';
    let currentFolder = { id: 'root', name: 'My Drive' };
    const pathTraversed: string[] = [];
    
    for (const folderName of parts) {
      const query = `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const response = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!response.ok) return { content: [{ type: 'text', text: `⛔ Error at: ${pathTraversed.join('/')}/${folderName}` }] };
      
      const data: any = await response.json();
      if (data.files.length === 0) {
        return { content: [{ type: 'text', text: `⛔ Folder not found: "${folderName}" in ${pathTraversed.length > 0 ? pathTraversed.join('/') : 'root'}` }] };
      }
      
      currentFolder = data.files[0];
      parentId = currentFolder.id;
      pathTraversed.push(folderName);
    }
    
    return { content: [{ type: 'text', text: `📁 **${folder_path}**\n\nFolder ID: \`${currentFolder.id}\`` }] };
  });
}
