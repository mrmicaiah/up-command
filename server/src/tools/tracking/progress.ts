/**
 * Progress Tracking - Checkpoints, patterns, and recaps
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

export function registerProgressTools(server: McpServer, ctx: ToolContext): void {
  
  // checkpoint
  server.tool(
    'checkpoint',
    'Record a checkpoint during work',
    {
      summary: z.string().describe('1-2 sentence summary'),
      discoveries: z.string().optional().describe('Anything learned or discovered'),
      topics: z.array(z.string()).optional().describe('Topics touched on'),
      task_ids: z.array(z.string()).optional().describe('Related task IDs'),
      trigger: z.enum(['task_added', 'task_completed', 'topic_shift', 'manual', 'auto']).default('auto'),
    },
    async ({ summary, discoveries, topics, task_ids, trigger }) => {
      const userId = ctx.getCurrentUser();
      const id = `checkpoint_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO checkpoints (id, user_id, summary, discoveries, topics, task_ids, trigger, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, 
        userId, 
        summary, 
        discoveries || null, 
        topics ? JSON.stringify(topics) : null,
        task_ids ? JSON.stringify(task_ids) : null,
        trigger
      ).run();
      
      return {
        content: [{
          type: 'text',
          text: `📍 **Checkpoint saved**\n\n> ${summary}`
        }]
      };
    }
  );
  
  // log_progress
  server.tool(
    'log_progress',
    'Log progress on a task',
    {
      task_id: z.string().optional().describe('Task ID (optional)'),
      description: z.string().describe('What progress was made'),
      minutes_spent: z.number().optional().describe('Time spent in minutes'),
    },
    async ({ task_id, description, minutes_spent }) => {
      const userId = ctx.getCurrentUser();
      const id = `progress_${Date.now().toString(36)}`;
      
      await ctx.env.DB.prepare(`
        INSERT INTO progress_logs (id, user_id, task_id, description, minutes_spent, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, userId, task_id || null, description, minutes_spent || null).run();
      
      let output = `📝 **Progress logged**\n\n${description}`;
      if (minutes_spent) output += `\n\n⏱️ ${minutes_spent} minutes`;
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // analyze_patterns
  server.tool(
    'analyze_patterns',
    'Analyze work patterns from recent activity',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      
      // Get recent tasks completed
      const tasksResult = await ctx.env.DB.prepare(`
        SELECT * FROM tasks 
        WHERE user_id = ? AND status = 'done'
          AND completed_at > datetime('now', '-7 days')
        ORDER BY completed_at DESC
      `).bind(userId).all();
      
      const tasks = tasksResult.results || [];
      
      // Get recent check-ins
      const checkinsResult = await ctx.env.DB.prepare(`
        SELECT * FROM check_ins 
        WHERE user_id = ?
          AND created_at > datetime('now', '-7 days')
        ORDER BY created_at DESC
      `).bind(userId).all();
      
      const checkins = checkinsResult.results || [];
      
      // Analyze categories
      const categories: Record<string, number> = {};
      tasks.forEach((t: any) => {
        if (t.category) {
          categories[t.category] = (categories[t.category] || 0) + 1;
        }
      });
      
      // Analyze projects
      const projects: Record<string, number> = {};
      checkins.forEach((c: any) => {
        if (c.project_name) {
          projects[c.project_name] = (projects[c.project_name] || 0) + 1;
        }
      });
      
      let output = `📊 **Work Patterns** (Last 7 days)\n\n`;
      output += `**Tasks completed:** ${tasks.length}\n`;
      output += `**Check-ins:** ${checkins.length}\n\n`;
      
      if (Object.keys(categories).length > 0) {
        output += `**Top categories:**\n`;
        Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([cat, count]) => {
            output += `- ${cat}: ${count}\n`;
          });
        output += '\n';
      }
      
      if (Object.keys(projects).length > 0) {
        output += `**Active projects:**\n`;
        Object.entries(projects)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([proj, count]) => {
            output += `- ${proj}: ${count} check-ins\n`;
          });
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // get_insights
  server.tool(
    'get_insights',
    'Get productivity insights and suggestions',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      
      // Get recent data
      const [tasks, journal, checkins] = await Promise.all([
        ctx.env.DB.prepare(`
          SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
            AND completed_at > datetime('now', '-7 days')
        `).bind(userId).all(),
        ctx.env.DB.prepare(`
          SELECT * FROM journal_entries WHERE user_id = ?
            AND created_at > datetime('now', '-7 days')
        `).bind(userId).all(),
        ctx.env.DB.prepare(`
          SELECT * FROM check_ins WHERE user_id = ?
            AND created_at > datetime('now', '-7 days')
        `).bind(userId).all(),
      ]);
      
      const taskCount = (tasks.results || []).length;
      const journalCount = (journal.results || []).length;
      const checkinCount = (checkins.results || []).length;
      
      let output = `💡 **Insights** (Last 7 days)\n\n`;
      
      // Task insights
      if (taskCount > 10) {
        output += `🔥 **High productivity!** ${taskCount} tasks completed.\n\n`;
      } else if (taskCount < 3) {
        output += `📋 Only ${taskCount} tasks completed. Consider breaking down larger tasks.\n\n`;
      }
      
      // Journal insights
      if (journalCount === 0) {
        output += `📓 No journal entries this week. Journaling helps track mood and insights.\n\n`;
      } else if (journalCount >= 5) {
        output += `📓 Great journaling habit! ${journalCount} entries this week.\n\n`;
      }
      
      // Check-in insights
      if (checkinCount > 5) {
        output += `✅ Excellent documentation! ${checkinCount} check-ins recorded.\n\n`;
      } else if (checkinCount === 0) {
        output += `📝 No check-ins this week. Consider documenting your work sessions.\n\n`;
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // weekly_recap
  server.tool(
    'weekly_recap',
    'Generate a weekly recap of work',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      
      // Get all data from past week
      const [tasks, checkins, workLogs] = await Promise.all([
        ctx.env.DB.prepare(`
          SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
            AND completed_at > datetime('now', '-7 days')
          ORDER BY completed_at DESC
        `).bind(userId).all(),
        ctx.env.DB.prepare(`
          SELECT * FROM check_ins WHERE user_id = ?
            AND created_at > datetime('now', '-7 days')
          ORDER BY created_at DESC
        `).bind(userId).all(),
        ctx.env.DB.prepare(`
          SELECT * FROM work_logs WHERE user_id = ?
            AND created_at > datetime('now', '-7 days')
          ORDER BY created_at DESC
        `).bind(userId).all(),
      ]);
      
      const completedTasks = tasks.results || [];
      const weekCheckins = checkins.results || [];
      const logs = workLogs.results || [];
      
      // Count shipped items
      let totalShipped = 0;
      logs.forEach((l: any) => {
        const shipped = l.shipped ? JSON.parse(l.shipped) : [];
        totalShipped += shipped.length;
      });
      
      let output = `📅 **Weekly Recap**\n\n`;
      output += `**Tasks completed:** ${completedTasks.length}\n`;
      output += `**Check-ins:** ${weekCheckins.length}\n`;
      output += `**Items shipped:** ${totalShipped}\n\n`;
      
      // List notable completions
      if (completedTasks.length > 0) {
        output += `**Completed:**\n`;
        completedTasks.slice(0, 10).forEach((t: any) => {
          output += `- ${t.text}\n`;
        });
        if (completedTasks.length > 10) {
          output += `- _...and ${completedTasks.length - 10} more_\n`;
        }
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
  
  // end_of_day_recap
  server.tool(
    'end_of_day_recap',
    'Generate an end-of-day summary',
    {},
    async () => {
      const userId = ctx.getCurrentUser();
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's data
      const [tasks, checkins] = await Promise.all([
        ctx.env.DB.prepare(`
          SELECT * FROM tasks WHERE user_id = ? AND status = 'done'
            AND DATE(completed_at) = ?
          ORDER BY completed_at DESC
        `).bind(userId, today).all(),
        ctx.env.DB.prepare(`
          SELECT * FROM check_ins WHERE user_id = ?
            AND DATE(created_at) = ?
          ORDER BY created_at DESC
        `).bind(userId, today).all(),
      ]);
      
      const todayTasks = tasks.results || [];
      const todayCheckins = checkins.results || [];
      
      let output = `🌙 **End of Day Recap**\n\n`;
      output += `**Tasks completed:** ${todayTasks.length}\n`;
      output += `**Check-ins:** ${todayCheckins.length}\n\n`;
      
      if (todayTasks.length > 0) {
        output += `**Done today:**\n`;
        todayTasks.forEach((t: any) => {
          output += `✓ ${t.text}\n`;
        });
        output += '\n';
      }
      
      if (todayCheckins.length > 0) {
        output += `**Session highlights:**\n`;
        todayCheckins.forEach((c: any) => {
          output += `> ${c.thread_summary}\n\n`;
        });
      }
      
      if (todayTasks.length === 0 && todayCheckins.length === 0) {
        output += `No recorded activity today. Rest is important too! 😴`;
      }
      
      return { content: [{ type: 'text', text: output }] };
    }
  );
}
