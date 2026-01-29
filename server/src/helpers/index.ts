/**
 * Helper Functions
 * Shared utilities used across tools
 */

import type { Env } from '../types.js';

// ==================
// ID GENERATION
// ==================

/**
 * Generate a short unique ID
 */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID().slice(0, 8);
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Generate a task ID
 */
export function generateTaskId(): string {
  return generateId('task');
}

/**
 * Generate a handoff task ID
 */
export function generateHandoffId(): string {
  return `TASK-${crypto.randomUUID().slice(0, 10)}`;
}

// ==================
// DATE UTILITIES
// ==================

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a date string to Date object
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(d);
}

// ==================
// STRING UTILITIES
// ==================

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Slugify a string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Escape markdown special characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[*_`\[\]]/g, '\\$&');
}

// ==================
// ARRAY UTILITIES
// ==================

/**
 * Group array items by a key
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Sort by multiple fields
 */
export function sortBy<T>(items: T[], ...compareFns: ((a: T, b: T) => number)[]): T[] {
  return [...items].sort((a, b) => {
    for (const fn of compareFns) {
      const result = fn(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

// ==================
// JSON UTILITIES
// ==================

/**
 * Safely parse JSON, returning null on error
 */
export function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Stringify with pretty formatting
 */
export function prettyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

// ==================
// DATABASE HELPERS
// ==================

/**
 * Execute a database query and return results
 */
export async function dbQuery<T>(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...bindings).all();
  return (result.results || []) as T[];
}

/**
 * Execute a database query and return first result
 */
export async function dbQueryFirst<T>(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...bindings).first<T>();
  return result || null;
}

/**
 * Execute a database write operation
 */
export async function dbRun(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<void> {
  await db.prepare(sql).bind(...bindings).run();
}

// ==================
// RESPONSE HELPERS
// ==================

/**
 * Create a tool response with text content
 */
export function toolResponse(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  };
}

/**
 * Create an error tool response
 */
export function toolError(message: string) {
  return {
    content: [{ type: 'text' as const, text: `❌ ${message}` }],
    isError: true,
  };
}
