/**
 * OAuth Helper Functions
 * Token management, refresh logic, and service configuration
 */

import type { Env, OAuthProvider, GoogleService } from '../types.js';

// ==================
// API URLS
// ==================
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

// Google API URLs
export const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
export const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1';
export const BLOGGER_API_URL = 'https://www.googleapis.com/blogger/v3';
export const PEOPLE_API_URL = 'https://people.googleapis.com/v1';
export const ANALYTICS_DATA_API_URL = 'https://analyticsdata.googleapis.com/v1beta';
export const ANALYTICS_ADMIN_API_URL = 'https://analyticsadmin.googleapis.com/v1beta';

// GitHub API URL
export const GITHUB_API_URL = 'https://api.github.com';

export const SERVICE_NAMES: Record<string, string> = {
  google_drive: 'Google Drive',
  gmail_personal: 'Gmail (Personal)',
  gmail_company: 'Gmail (Company)',
  blogger_personal: 'Blogger (Personal)',
  blogger_company: 'Blogger (Company)',
  google_contacts_personal: 'Google Contacts (Personal)',
  google_contacts_company: 'Google Contacts (Company)',
  google_analytics: 'Google Analytics',
  github: 'GitHub',
};

export const GOOGLE_SCOPES: Record<GoogleService, string[]> = {
  google_drive: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  gmail_personal: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  gmail_company: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  blogger_personal: [
    'https://www.googleapis.com/auth/blogger',
  ],
  blogger_company: [
    'https://www.googleapis.com/auth/blogger',
  ],
  google_contacts_personal: [
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  google_contacts_company: [
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  google_analytics: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https