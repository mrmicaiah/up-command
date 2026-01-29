/**
 * Helm Tools - Task and Project Management
 * 
 * Organized into submodules:
 * - tasks/     Task CRUD, activation, subtasks
 * - sprints/   Sprint management and objectives
 * - workday/   Daily routines and focus
 * - reporting/ Stats and summaries
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../../types.js';

// Task tools
import {
  registerListTask,
  registerAddTask,
  registerCompleteTask,
  registerUpdateTask,
  registerDeleteTask,
  registerSnoozeTask,
  registerClaimTask,
  registerBreakdownTask,
} from './tasks/index.js';

// Sprint tools
import {
  registerSprintCrud,
  registerSprintObjectives,
  registerTaskActivation,
} from './sprints/index.js';

// Workday tools
import {
  registerGoodMorning,
  registerGoodNight,
  registerCheckpoint,
  registerSetFocus,
  registerWorkHistory,
} from './workday/index.js';

// Reporting tools
import {
  registerDailyReporting,
  registerWeeklyReporting,
  registerStatsReporting,
} from './reporting/index.js';

export function registerHelmTools(server: McpServer, ctx: ToolContext): void {
  // Tasks
  registerListTask(server, ctx);
  registerAddTask(server, ctx);
  registerCompleteTask(server, ctx);
  registerUpdateTask(server, ctx);
  registerDeleteTask(server, ctx);
  registerSnoozeTask(server, ctx);
  registerClaimTask(server, ctx);
  registerBreakdownTask(server, ctx);

  // Sprints
  registerSprintCrud(server, ctx);
  registerSprintObjectives(server, ctx);
  registerTaskActivation(server, ctx);

  // Workday
  registerGoodMorning(server, ctx);
  registerGoodNight(server, ctx);
  registerCheckpoint(server, ctx);
  registerSetFocus(server, ctx);
  registerWorkHistory(server, ctx);

  // Reporting
  registerDailyReporting(server, ctx);
  registerWeeklyReporting(server, ctx);
  registerStatsReporting(server, ctx);

  console.log('[Helm] All tools registered');
}
