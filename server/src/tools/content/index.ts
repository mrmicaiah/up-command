/**
 * Content Tools - Email, Blogs, Media
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerContentTools(server: McpServer, ctx: ToolContext): void {
  // Courier (Email Marketing)
  // courier_list_lists
  // courier_create_list
  // courier_get_list
  // courier_update_list
  // courier_delete_list
  // courier_list_subscribers
  // courier_delete_subscriber
  // courier_list_campaigns
  // courier_create_campaign
  // courier_get_campaign
  // courier_update_campaign
  // courier_delete_campaign
  // courier_duplicate_campaign
  // courier_preview_campaign
  // courier_send_test
  // courier_send_now
  // courier_schedule_campaign
  // courier_cancel_schedule
  // courier_campaign_stats
  // courier_stats
  // courier_list_sequences
  // courier_create_sequence
  // courier_get_sequence
  // courier_update_sequence
  // courier_delete_sequence
  // courier_add_sequence_step
  // courier_update_sequence_step
  // courier_delete_sequence_step
  // courier_reorder_sequence_steps
  // courier_enroll_in_sequence
  // courier_sequence_enrollments
  // courier_list_templates
  // courier_add_template
  // courier_get_template
  // courier_delete_template
  
  // Blogger
  // list_blogs
  // list_blog_posts
  // get_blog_post
  // create_blog_post
  // update_blog_post
  // delete_blog_post
  // publish_blog_post
  // get_blog_stats
  
  // MB Blog
  // mb_list_posts
  // mb_get_post
  // mb_create_post
  // mb_update_post
  // mb_delete_post
  // mb_publish_post
  // mb_unpublish_post
  // mb_schedule_post
  
  // Cloudinary
  // cloudinary_upload
  // cloudinary_list
  // cloudinary_url
  // cloudinary_delete
  // cloudinary_folders
  // cloudinary_status
  
  // Launch tracking
  // create_launch
  // launch_status
  // launch_overview
  // launch_health
  // log_post
  // log_content_batch
  // posting_streak
}