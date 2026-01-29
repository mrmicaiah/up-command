/**
 * Content Tools - Blog, Authors, Email Marketing, Media
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';
import { registerBlogTools } from './blog.js';
import { registerAuthorTools } from './authors.js';

export function registerContentTools(server: McpServer, ctx: ToolContext): void {
  // Blog tools (MB blog)
  registerBlogTools(server, ctx);
  
  // Author management
  registerAuthorTools(server, ctx);
  
  // Future: Courier (Email Marketing) tools
  // courier_list_lists, courier_create_list, etc.
  
  // Future: Cloudinary tools
  // cloudinary_upload, cloudinary_list, etc.
  
  // Future: Launch tracking
  // create_launch, launch_status, etc.
}
