/**
 * FlowForge Connector Templates
 * Pre-built templates for popular services
 */

import type { ConnectorTemplate, ConnectorOperation } from '../../types/integrations';

// ============================================================================
// Salesforce Connector
// ============================================================================

export const salesforceTemplate: ConnectorTemplate = {
  id: 'salesforce',
  provider: 'salesforce',
  name: 'Salesforce',
  description: 'Connect to Salesforce CRM to manage leads, contacts, accounts, and opportunities',
  icon: 'salesforce',
  defaultConfig: {
    baseUrl: 'https://login.salesforce.com',
    timeout: 30000,
    retryEnabled: true,
    maxRetries: 3,
  },
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token', 'offline_access'],
  },
  requiredCredentials: ['clientId', 'clientSecret'],
  operations: [
    {
      id: 'sf-query',
      name: 'Query Records',
      description: 'Execute a SOQL query',
      method: 'GET',
      path: '/services/data/v58.0/query',
      parameters: [
        { name: 'q', in: 'query', type: 'string', required: true, description: 'SOQL query string' },
      ],
      responseMapping: { dataPath: 'records' },
    },
    {
      id: 'sf-get-record',
      name: 'Get Record',
      description: 'Get a record by ID',
      method: 'GET',
      path: '/services/data/v58.0/sobjects/{sobject}/{id}',
      parameters: [
        { name: 'sobject', in: 'path', type: 'string', required: true },
        { name: 'id', in: 'path', type: 'string', required: true },
      ],
    },
    {
      id: 'sf-create-record',
      name: 'Create Record',
      description: 'Create a new record',
      method: 'POST',
      path: '/services/data/v58.0/sobjects/{sobject}',
      parameters: [
        { name: 'sobject', in: 'path', type: 'string', required: true },
      ],
      requestBody: { contentType: 'json' },
    },
    {
      id: 'sf-update-record',
      name: 'Update Record',
      description: 'Update an existing record',
      method: 'PATCH',
      path: '/services/data/v58.0/sobjects/{sobject}/{id}',
      parameters: [
        { name: 'sobject', in: 'path', type: 'string', required: true },
        { name: 'id', in: 'path', type: 'string', required: true },
      ],
      requestBody: { contentType: 'json' },
    },
    {
      id: 'sf-delete-record',
      name: 'Delete Record',
      description: 'Delete a record',
      method: 'DELETE',
      path: '/services/data/v58.0/sobjects/{sobject}/{id}',
      parameters: [
        { name: 'sobject', in: 'path', type: 'string', required: true },
        { name: 'id', in: 'path', type: 'string', required: true },
      ],
    },
  ],
  setupGuide: 'Create a Connected App in Salesforce Setup',
  documentationUrl: 'https://developer.salesforce.com/docs/apis',
};

// ============================================================================
// Google Workspace Connector
// ============================================================================

export const googleTemplate: ConnectorTemplate = {
  id: 'google',
  provider: 'google',
  name: 'Google Workspace',
  description: 'Connect to Google Drive, Sheets, Calendar, and Gmail',
  icon: 'google',
  defaultConfig: {
    baseUrl: 'https://www.googleapis.com',
    timeout: 30000,
  },
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
  },
  requiredCredentials: ['clientId', 'clientSecret'],
  operations: [
    {
      id: 'google-drive-list',
      name: 'List Drive Files',
      description: 'List files in Google Drive',
      method: 'GET',
      path: '/drive/v3/files',
      parameters: [
        { name: 'q', in: 'query', type: 'string', required: false, description: 'Search query' },
        { name: 'pageSize', in: 'query', type: 'number', required: false, default: 100 },
      ],
      responseMapping: { dataPath: 'files' },
      pagination: { type: 'cursor', cursorParam: 'pageToken', cursorPath: 'nextPageToken' },
    },
    {
      id: 'google-sheets-get',
      name: 'Get Spreadsheet',
      description: 'Get spreadsheet data',
      method: 'GET',
      path: '/v4/spreadsheets/{spreadsheetId}/values/{range}',
      parameters: [
        { name: 'spreadsheetId', in: 'path', type: 'string', required: true },
        { name: 'range', in: 'path', type: 'string', required: true },
      ],
      responseMapping: { dataPath: 'values' },
    },
    {
      id: 'google-sheets-update',
      name: 'Update Spreadsheet',
      description: 'Update spreadsheet values',
      method: 'PUT',
      path: '/v4/spreadsheets/{spreadsheetId}/values/{range}',
      parameters: [
        { name: 'spreadsheetId', in: 'path', type: 'string', required: true },
        { name: 'range', in: 'path', type: 'string', required: true },
        { name: 'valueInputOption', in: 'query', type: 'string', required: true, default: 'USER_ENTERED' },
      ],
      requestBody: { contentType: 'json' },
    },
    {
      id: 'google-calendar-events',
      name: 'List Calendar Events',
      description: 'List events from a calendar',
      method: 'GET',
      path: '/calendar/v3/calendars/{calendarId}/events',
      parameters: [
        { name: 'calendarId', in: 'path', type: 'string', required: true, default: 'primary' },
        { name: 'timeMin', in: 'query', type: 'string', required: false },
        { name: 'timeMax', in: 'query', type: 'string', required: false },
      ],
      responseMapping: { dataPath: 'items' },
    },
    {
      id: 'google-calendar-create',
      name: 'Create Calendar Event',
      description: 'Create a new calendar event',
      method: 'POST',
      path: '/calendar/v3/calendars/{calendarId}/events',
      parameters: [
        { name: 'calendarId', in: 'path', type: 'string', required: true, default: 'primary' },
      ],
      requestBody: { contentType: 'json' },
    },
  ],
  setupGuide: 'Create OAuth credentials in Google Cloud Console',
  documentationUrl: 'https://developers.google.com/workspace',
};

// ============================================================================
// Microsoft 365 Connector
// ============================================================================

export const microsoftTemplate: ConnectorTemplate = {
  id: 'microsoft',
  provider: 'microsoft',
  name: 'Microsoft 365',
  description: 'Connect to Microsoft Graph API for Outlook, OneDrive, Teams, and more',
  icon: 'microsoft',
  defaultConfig: {
    baseUrl: 'https://graph.microsoft.com/v1.0',
    timeout: 30000,
  },
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'User.Read',
      'Mail.Read',
      'Calendars.ReadWrite',
      'Files.ReadWrite',
    ],
  },
  requiredCredentials: ['clientId', 'clientSecret'],
  operations: [
    {
      id: 'ms-me',
      name: 'Get Current User',
      description: 'Get the current user profile',
      method: 'GET',
      path: '/me',
      parameters: [],
    },
    {
      id: 'ms-users',
      name: 'List Users',
      description: 'List users in the organization',
      method: 'GET',
      path: '/users',
      parameters: [
        { name: '$top', in: 'query', type: 'number', required: false },
        { name: '$filter', in: 'query', type: 'string', required: false },
      ],
      responseMapping: { dataPath: 'value' },
    },
    {
      id: 'ms-mail-list',
      name: 'List Emails',
      description: 'List emails from inbox',
      method: 'GET',
      path: '/me/messages',
      parameters: [
        { name: '$top', in: 'query', type: 'number', required: false, default: 10 },
        { name: '$filter', in: 'query', type: 'string', required: false },
      ],
      responseMapping: { dataPath: 'value' },
    },
    {
      id: 'ms-mail-send',
      name: 'Send Email',
      description: 'Send an email',
      method: 'POST',
      path: '/me/sendMail',
      parameters: [],
      requestBody: { contentType: 'json' },
    },
    {
      id: 'ms-events-list',
      name: 'List Calendar Events',
      description: 'List calendar events',
      method: 'GET',
      path: '/me/events',
      parameters: [
        { name: '$top', in: 'query', type: 'number', required: false },
        { name: '$filter', in: 'query', type: 'string', required: false },
      ],
      responseMapping: { dataPath: 'value' },
    },
    {
      id: 'ms-files-list',
      name: 'List OneDrive Files',
      description: 'List files in OneDrive',
      method: 'GET',
      path: '/me/drive/root/children',
      parameters: [],
      responseMapping: { dataPath: 'value' },
    },
  ],
  setupGuide: 'Register an application in Azure AD',
  documentationUrl: 'https://docs.microsoft.com/en-us/graph/',
};

// ============================================================================
// Slack Connector
// ============================================================================

export const slackTemplate: ConnectorTemplate = {
  id: 'slack',
  provider: 'slack',
  name: 'Slack',
  description: 'Send messages, manage channels, and interact with Slack workspaces',
  icon: 'slack',
  defaultConfig: {
    baseUrl: 'https://slack.com/api',
    timeout: 30000,
  },
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read', 'files:write'],
  },
  requiredCredentials: ['clientId', 'clientSecret'],
  operations: [
    {
      id: 'slack-post-message',
      name: 'Post Message',
      description: 'Post a message to a channel',
      method: 'POST',
      path: '/chat.postMessage',
      parameters: [],
      requestBody: { contentType: 'json', schema: { channel: 'string', text: 'string' } },
    },
    {
      id: 'slack-channels-list',
      name: 'List Channels',
      description: 'List channels in workspace',
      method: 'GET',
      path: '/conversations.list',
      parameters: [
        { name: 'types', in: 'query', type: 'string', required: false, default: 'public_channel,private_channel' },
        { name: 'limit', in: 'query', type: 'number', required: false, default: 100 },
      ],
      responseMapping: { dataPath: 'channels' },
    },
    {
      id: 'slack-users-list',
      name: 'List Users',
      description: 'List users in workspace',
      method: 'GET',
      path: '/users.list',
      parameters: [
        { name: 'limit', in: 'query', type: 'number', required: false, default: 100 },
      ],
      responseMapping: { dataPath: 'members' },
    },
    {
      id: 'slack-file-upload',
      name: 'Upload File',
      description: 'Upload a file to Slack',
      method: 'POST',
      path: '/files.upload',
      parameters: [],
      requestBody: { contentType: 'multipart' },
    },
    {
      id: 'slack-reaction-add',
      name: 'Add Reaction',
      description: 'Add an emoji reaction to a message',
      method: 'POST',
      path: '/reactions.add',
      parameters: [],
      requestBody: { contentType: 'json', schema: { channel: 'string', timestamp: 'string', name: 'string' } },
    },
  ],
  setupGuide: 'Create a Slack App at api.slack.com',
  documentationUrl: 'https://api.slack.com/docs',
};

// ============================================================================
// Generic REST Connector
// ============================================================================

export const restTemplate: ConnectorTemplate = {
  id: 'rest',
  provider: 'custom',
  name: 'REST API',
  description: 'Connect to any REST API with custom configuration',
  icon: 'globe',
  defaultConfig: {
    baseUrl: '',
    timeout: 30000,
    retryEnabled: true,
    maxRetries: 3,
  },
  authType: 'api_key',
  requiredCredentials: [],
  operations: [],
  setupGuide: 'Configure the base URL and authentication for your API',
};

// ============================================================================
// Template Registry
// ============================================================================

export const connectorTemplates: ConnectorTemplate[] = [
  salesforceTemplate,
  googleTemplate,
  microsoftTemplate,
  slackTemplate,
  restTemplate,
];

export function getTemplate(providerId: string): ConnectorTemplate | undefined {
  return connectorTemplates.find(t => t.id === providerId);
}

export function listTemplates(): ConnectorTemplate[] {
  return connectorTemplates;
}
