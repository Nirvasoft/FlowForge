/**
 * Integrations API Client
 * Connectors, Connections, Webhooks
 */

import { get, post, patch, del } from './client';
import type { Connector, ConnectorTemplate, ConnectorOperation, Connection, Webhook, WebhookEvent } from '../types';

// ============================================================================
// Connector Templates
// ============================================================================

export async function listTemplates(): Promise<{ templates: ConnectorTemplate[] }> {
    return get('/api/connectors/templates');
}

export async function getTemplate(templateId: string): Promise<ConnectorTemplate> {
    return get(`/api/connectors/templates/${templateId}`);
}

// ============================================================================
// Connectors
// ============================================================================

export async function listConnectors(options?: { type?: string; provider?: string }): Promise<{ connectors: Connector[] }> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.provider) params.set('provider', options.provider);
    const query = params.toString();
    return get(`/api/connectors${query ? `?${query}` : ''}`);
}

export async function getConnector(id: string): Promise<Connector> {
    return get(`/api/connectors/${id}`);
}

export async function createConnector(data: Partial<Connector>): Promise<Connector> {
    return post('/api/connectors', data);
}

export async function updateConnector(id: string, data: Partial<Connector>): Promise<Connector> {
    return patch(`/api/connectors/${id}`, data);
}

export async function deleteConnector(id: string): Promise<{ success: boolean }> {
    return del(`/api/connectors/${id}`);
}

export async function testConnector(id: string): Promise<{ success: boolean; message: string }> {
    return post(`/api/connectors/${id}/test`, {});
}

// Connector Operations
export async function addOperation(connectorId: string, data: Partial<ConnectorOperation>): Promise<ConnectorOperation> {
    return post(`/api/connectors/${connectorId}/operations`, data);
}

export async function updateOperation(connectorId: string, operationId: string, data: Partial<ConnectorOperation>): Promise<ConnectorOperation> {
    return patch(`/api/connectors/${connectorId}/operations/${operationId}`, data);
}

export async function deleteOperation(connectorId: string, operationId: string): Promise<{ success: boolean }> {
    return del(`/api/connectors/${connectorId}/operations/${operationId}`);
}

export async function getExecutions(connectorId: string, limit = 50): Promise<{ executions: unknown[] }> {
    return get(`/api/connectors/${connectorId}/executions?limit=${limit}`);
}

// ============================================================================
// Connections
// ============================================================================

export async function listConnections(connectorId?: string): Promise<{ connections: Connection[] }> {
    const query = connectorId ? `?connectorId=${connectorId}` : '';
    return get(`/api/connections${query}`);
}

export async function getConnection(id: string): Promise<Connection> {
    return get(`/api/connections/${id}`);
}

export async function createConnection(data: Partial<Connection>): Promise<Connection> {
    return post('/api/connections', data);
}

export async function updateConnection(id: string, data: Partial<Connection>): Promise<Connection> {
    return patch(`/api/connections/${id}`, data);
}

export async function deleteConnection(id: string): Promise<{ success: boolean }> {
    return del(`/api/connections/${id}`);
}

export async function testConnection(id: string): Promise<{ success: boolean; message: string }> {
    return post(`/api/connections/${id}/test`, {});
}

// OAuth
export async function getOAuthUrl(connectionId: string, redirectUri: string): Promise<{ authorizationUrl: string }> {
    return get(`/api/connections/${connectionId}/oauth/authorize?redirectUri=${encodeURIComponent(redirectUri)}`);
}

export async function exchangeOAuthCode(connectionId: string, code: string, redirectUri: string): Promise<{ success: boolean; expiresAt: string }> {
    return post(`/api/connections/${connectionId}/oauth/callback`, { code, redirectUri });
}

export async function refreshOAuthToken(connectionId: string): Promise<{ success: boolean; expiresAt: string }> {
    return post(`/api/connections/${connectionId}/oauth/refresh`, {});
}

// Execute
export async function executeOperation(
    connectorId: string,
    connectionId: string,
    parameters?: Record<string, unknown>,
    body?: unknown
): Promise<unknown> {
    return post(`/api/connections/${connectorId}/execute/${connectionId}`, { parameters, body });
}

// ============================================================================
// Webhooks
// ============================================================================

export async function listWebhooks(options?: { targetType?: string; enabled?: boolean }): Promise<{ webhooks: Webhook[] }> {
    const params = new URLSearchParams();
    if (options?.targetType) params.set('targetType', options.targetType);
    if (options?.enabled !== undefined) params.set('enabled', String(options.enabled));
    const query = params.toString();
    return get(`/api/webhooks${query ? `?${query}` : ''}`);
}

export async function getWebhook(id: string): Promise<Webhook> {
    return get(`/api/webhooks/${id}`);
}

export async function createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    return post('/api/webhooks', data);
}

export async function updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook> {
    return patch(`/api/webhooks/${id}`, data);
}

export async function deleteWebhook(id: string): Promise<{ success: boolean }> {
    return del(`/api/webhooks/${id}`);
}

export async function enableWebhook(id: string): Promise<Webhook> {
    return post(`/api/webhooks/${id}/enable`, {});
}

export async function disableWebhook(id: string): Promise<Webhook> {
    return post(`/api/webhooks/${id}/disable`, {});
}

export async function regenerateSecret(id: string): Promise<{ secret: string }> {
    return post(`/api/webhooks/${id}/regenerate-secret`, {});
}

// Webhook Events
export async function getWebhookEvents(webhookId: string, limit = 50): Promise<{ events: WebhookEvent[] }> {
    return get(`/api/webhooks/${webhookId}/events?limit=${limit}`);
}

export async function getWebhookEvent(webhookId: string, eventId: string): Promise<WebhookEvent> {
    return get(`/api/webhooks/${webhookId}/events/${eventId}`);
}

export async function replayWebhookEvent(webhookId: string, eventId: string): Promise<WebhookEvent> {
    return post(`/api/webhooks/${webhookId}/events/${eventId}/replay`, {});
}
