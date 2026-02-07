/**
 * FlowForge Integrations API Routes
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { connectorService } from '../../services/integrations/connector.service';
import { webhookService } from '../../services/integrations/webhook.service';
import { listTemplates, getTemplate } from '../../services/integrations/connector-templates';

interface IdParams { id: string; }
interface OpParams extends IdParams { operationId: string; }
interface ConnParams extends IdParams { connectionId: string; }
interface EventParams extends IdParams { eventId: string; }

// ============================================================================
// Connector Routes
// ============================================================================

export async function connectorRoutes(fastify: FastifyInstance) {
  // Templates
  fastify.get('/templates', async () => {
    return { templates: listTemplates() };
  });

  fastify.get<{ Params: { templateId: string } }>('/templates/:templateId', async (request, reply) => {
    const template = getTemplate(request.params.templateId);
    if (!template) return reply.status(404).send({ error: 'Template not found' });
    return template;
  });

  // Connectors CRUD
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { type?: string; provider?: string } }>) => {
    return connectorService.listConnectors(request.query as any);
  });

  fastify.post<{ Body: any }>('/', async (request, reply) => {
    const connector = await connectorService.createConnector({ ...(request.body as any), createdBy: 'user-1' });
    return reply.status(201).send(connector);
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const connector = await connectorService.getConnector(request.params.id);
    if (!connector) return reply.status(404).send({ error: 'Connector not found' });
    return connector;
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const connector = await connectorService.updateConnector(request.params.id, request.body as any);
    if (!connector) return reply.status(404).send({ error: 'Connector not found' });
    return connector;
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await connectorService.deleteConnector(request.params.id)) {
      return reply.status(404).send({ error: 'Connector not found' });
    }
    return { success: true };
  });

  fastify.post<{ Params: IdParams }>('/:id/test', async (request, reply) => {
    try {
      return await connectorService.testConnector(request.params.id);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Operations
  fastify.post<{ Params: IdParams; Body: any }>('/:id/operations', async (request, reply) => {
    const operation = await connectorService.addOperation(request.params.id, request.body as any);
    if (!operation) return reply.status(404).send({ error: 'Connector not found' });
    return reply.status(201).send(operation);
  });

  fastify.patch<{ Params: OpParams; Body: any }>('/:id/operations/:operationId', async (request, reply) => {
    const operation = await connectorService.updateOperation(request.params.id, request.params.operationId, request.body as any);
    if (!operation) return reply.status(404).send({ error: 'Operation not found' });
    return operation;
  });

  fastify.delete<{ Params: OpParams }>('/:id/operations/:operationId', async (request, reply) => {
    if (!await connectorService.deleteOperation(request.params.id, request.params.operationId)) {
      return reply.status(404).send({ error: 'Operation not found' });
    }
    return { success: true };
  });

  // Execution history
  fastify.get<{ Params: IdParams; Querystring: { limit?: number } }>('/:id/executions', async (request) => {
    const executions = await connectorService.getExecutions(request.params.id, request.query.limit);
    return { executions };
  });
}

// ============================================================================
// Connection Routes
// ============================================================================

export async function connectionRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { connectorId?: string } }>) => {
    const connections = await connectorService.listConnections(request.query.connectorId);
    return { connections };
  });

  fastify.post<{ Body: any }>('/', async (request, reply) => {
    try {
      const connection = await connectorService.createConnection({ ...(request.body as any), createdBy: 'user-1' });
      return reply.status(201).send(connection);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const connection = await connectorService.getConnection(request.params.id);
    if (!connection) return reply.status(404).send({ error: 'Connection not found' });
    return connection;
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const connection = await connectorService.updateConnection(request.params.id, request.body as any);
    if (!connection) return reply.status(404).send({ error: 'Connection not found' });
    return connection;
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await connectorService.deleteConnection(request.params.id)) {
      return reply.status(404).send({ error: 'Connection not found' });
    }
    return { success: true };
  });

  fastify.post<{ Params: IdParams }>('/:id/test', async (request, reply) => {
    try {
      return await connectorService.testConnection(request.params.id);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // OAuth
  fastify.get<{ Params: IdParams; Querystring: { redirectUri: string } }>('/:id/oauth/authorize', async (request, reply) => {
    try {
      const connection = await connectorService.getConnection(request.params.id);
      if (!connection) return reply.status(404).send({ error: 'Connection not found' });

      const url = await connectorService.getOAuthAuthorizationUrl(connection.connectorId, request.query.redirectUri);
      return { authorizationUrl: url };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.post<{ Params: IdParams; Body: { code: string; redirectUri: string } }>('/:id/oauth/callback', async (request, reply) => {
    try {
      const token = await connectorService.exchangeOAuthCode(
        request.params.id,
        request.body.code,
        request.body.redirectUri
      );
      return { success: true, expiresAt: token.expiresAt };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.post<{ Params: IdParams }>('/:id/oauth/refresh', async (request, reply) => {
    try {
      const token = await connectorService.refreshOAuthToken(request.params.id);
      return { success: true, expiresAt: token.expiresAt };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Execute operation
  fastify.post<{ Params: ConnParams; Body: { parameters?: Record<string, unknown>; body?: unknown } }>(
    '/:id/execute/:connectionId',
    async (request, reply) => {
      try {
        const execution = await connectorService.executeOperation(
          request.params.id,
          request.params.connectionId,
          request.body.parameters,
          request.body.body
        );
        return execution;
      } catch (error) {
        return reply.status(400).send({ error: (error as Error).message });
      }
    }
  );
}

// ============================================================================
// Webhook Routes
// ============================================================================

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { targetType?: string; enabled?: boolean } }>) => {
    return webhookService.listWebhooks(request.query as any);
  });

  fastify.post<{ Body: any }>('/', async (request, reply) => {
    const webhook = await webhookService.createWebhook({ ...(request.body as any), createdBy: 'user-1' });
    return reply.status(201).send(webhook);
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const webhook = await webhookService.getWebhook(request.params.id);
    if (!webhook) return reply.status(404).send({ error: 'Webhook not found' });
    return webhook;
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const webhook = await webhookService.updateWebhook(request.params.id, request.body as any);
    if (!webhook) return reply.status(404).send({ error: 'Webhook not found' });
    return webhook;
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await webhookService.deleteWebhook(request.params.id)) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }
    return { success: true };
  });

  fastify.post<{ Params: IdParams }>('/:id/enable', async (request, reply) => {
    const webhook = await webhookService.enableWebhook(request.params.id);
    if (!webhook) return reply.status(404).send({ error: 'Webhook not found' });
    return webhook;
  });

  fastify.post<{ Params: IdParams }>('/:id/disable', async (request, reply) => {
    const webhook = await webhookService.disableWebhook(request.params.id);
    if (!webhook) return reply.status(404).send({ error: 'Webhook not found' });
    return webhook;
  });

  fastify.post<{ Params: IdParams }>('/:id/regenerate-secret', async (request, reply) => {
    const result = await webhookService.regenerateSecret(request.params.id);
    if (!result) return reply.status(404).send({ error: 'Webhook not found' });
    return result;
  });

  // Events
  fastify.get<{ Params: IdParams; Querystring: { limit?: number } }>('/:id/events', async (request) => {
    const events = await webhookService.getEvents(request.params.id, request.query.limit);
    return { events };
  });

  fastify.get<{ Params: EventParams }>('/:id/events/:eventId', async (request, reply) => {
    const event = await webhookService.getEvent(request.params.id, request.params.eventId);
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    return event;
  });

  fastify.post<{ Params: EventParams }>('/:id/events/:eventId/replay', async (request, reply) => {
    try {
      const event = await webhookService.replayEvent(request.params.id, request.params.eventId);
      return event;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });
}

// ============================================================================
// Webhook Receiver Route (Public)
// ============================================================================

export async function webhookReceiverRoutes(fastify: FastifyInstance) {
  // Handle incoming webhooks
  const handleWebhook = async (request: FastifyRequest<{ Params: { webhookId: string } }>, reply: any) => {
    try {
      const event = await webhookService.processWebhook(request.params.webhookId, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        query: request.query as Record<string, string>,
        body: request.body,
      });
      return reply.status(event.responseCode || 200).send(event.responseBody);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  };

  fastify.get('/:webhookId', handleWebhook);
  fastify.post('/:webhookId', handleWebhook);
  fastify.put('/:webhookId', handleWebhook);
}
