/**
 * FlowForge Integrations Tests
 */

import { ConnectorService } from '../src/services/integrations/connector.service';
import { WebhookService } from '../src/services/integrations/webhook.service';
import { listTemplates, getTemplate } from '../src/services/integrations/connector-templates';

describe('Connector Service', () => {
  let service: ConnectorService;

  beforeEach(() => {
    service = new ConnectorService();
  });

  describe('Connector CRUD', () => {
    test('creates a connector', async () => {
      const connector = await service.createConnector({
        name: 'My API',
        description: 'Test connector',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: { type: 'api_key', credentials: { type: 'api_key', key: 'test-key' } },
        createdBy: 'user-1',
      });

      expect(connector.id).toBeDefined();
      expect(connector.name).toBe('My API');
      expect(connector.status).toBe('inactive');
    });

    test('adds operations to connector', async () => {
      const connector = await service.createConnector({
        name: 'Test',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: { type: 'none', credentials: { type: 'none' } },
        createdBy: 'user-1',
      });

      const operation = await service.addOperation(connector.id, {
        name: 'Get Users',
        description: 'Fetch all users',
        method: 'GET',
        path: '/users',
        parameters: [
          { name: 'limit', in: 'query', type: 'number', required: false, default: 10 },
        ],
      });

      expect(operation?.name).toBe('Get Users');

      const updated = await service.getConnector(connector.id);
      expect(updated?.operations).toHaveLength(1);
    });

    test('tests connector', async () => {
      const connector = await service.createConnector({
        name: 'Test',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: { type: 'none', credentials: { type: 'none' } },
        createdBy: 'user-1',
      });

      const result = await service.testConnector(connector.id);
      expect(result.success).toBe(true);

      const updated = await service.getConnector(connector.id);
      expect(updated?.status).toBe('active');
    });
  });

  describe('Connection Management', () => {
    test('creates a connection', async () => {
      const connector = await service.createConnector({
        name: 'API',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: { type: 'api_key', credentials: { type: 'api_key', key: 'default' } },
        createdBy: 'user-1',
      });

      const connection = await service.createConnection({
        name: 'Production',
        connectorId: connector.id,
        auth: { type: 'api_key', credentials: { type: 'api_key', key: 'prod-key' } },
        createdBy: 'user-1',
      });

      expect(connection.id).toBeDefined();
      expect(connection.status).toBe('pending');
    });

    test('lists connections for connector', async () => {
      const connector = await service.createConnector({
        name: 'API',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: { type: 'none', credentials: { type: 'none' } },
        createdBy: 'user-1',
      });

      await service.createConnection({
        name: 'Dev',
        connectorId: connector.id,
        auth: { type: 'none', credentials: { type: 'none' } },
        createdBy: 'user-1',
      });

      await service.createConnection({
        name: 'Prod',
        connectorId: connector.id,
        auth: { type: 'none', credentials: { type: 'none' } },
        createdBy: 'user-1',
      });

      const connections = await service.listConnections(connector.id);
      expect(connections).toHaveLength(2);
    });
  });

  describe('OAuth Flow', () => {
    test('generates authorization URL', async () => {
      const connector = await service.createConnector({
        name: 'OAuth API',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: {
          type: 'oauth2',
          credentials: { type: 'oauth2', clientId: 'client-123', clientSecret: 'secret' },
          oauth: {
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: ['read', 'write'],
            redirectUri: 'https://app.example.com/callback',
          },
        },
        createdBy: 'user-1',
      });

      const url = await service.getOAuthAuthorizationUrl(connector.id, 'https://callback.example.com');
      expect(url).toContain('https://auth.example.com/authorize');
      expect(url).toContain('client_id=client-123');
      expect(url).toContain('scope=read+write');
    });

    test('exchanges code for token', async () => {
      const connector = await service.createConnector({
        name: 'OAuth API',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: {
          type: 'oauth2',
          credentials: { type: 'oauth2', clientId: 'client', clientSecret: 'secret' },
          oauth: {
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: ['read'],
            redirectUri: 'https://app.example.com/callback',
          },
        },
        createdBy: 'user-1',
      });

      const connection = await service.createConnection({
        name: 'Test',
        connectorId: connector.id,
        auth: { type: 'oauth2', credentials: { type: 'oauth2', clientId: 'client', clientSecret: 'secret' } },
        createdBy: 'user-1',
      });

      const token = await service.exchangeOAuthCode(connection.id, 'auth-code', 'https://callback.example.com');
      expect(token.accessToken).toBeDefined();
      expect(token.refreshToken).toBeDefined();

      const updated = await service.getConnection(connection.id);
      expect(updated?.status).toBe('connected');
    });
  });

  describe('Operation Execution', () => {
    test('executes operation', async () => {
      const connector = await service.createConnector({
        name: 'API',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
        auth: { type: 'bearer', credentials: { type: 'bearer', token: 'test-token' } },
        createdBy: 'user-1',
      });

      await service.addOperation(connector.id, {
        name: 'Get User',
        method: 'GET',
        path: '/users/{id}',
        parameters: [{ name: 'id', in: 'path', type: 'string', required: true }],
      });

      const connection = await service.createConnection({
        name: 'Test',
        connectorId: connector.id,
        auth: { type: 'bearer', credentials: { type: 'bearer', token: 'my-token' } },
        createdBy: 'user-1',
      });

      const operation = (await service.getConnector(connector.id))?.operations[0];
      const execution = await service.executeOperation(connection.id, operation!.id, { id: '123' });

      expect(execution.success).toBe(true);
      expect(execution.request.url).toBe('https://api.example.com/users/123');
    });
  });
});

describe('Webhook Service', () => {
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService();
  });

  describe('Webhook CRUD', () => {
    test('creates a webhook', async () => {
      const webhook = await service.createWebhook({
        name: 'Order Webhook',
        description: 'Receives order notifications',
        targetType: 'workflow',
        targetId: 'wf-123',
        createdBy: 'user-1',
      });

      expect(webhook.id).toBeDefined();
      expect(webhook.path).toContain('/webhooks/');
      expect(webhook.secret).toBeDefined();
      expect(webhook.enabled).toBe(true);
    });

    test('regenerates secret', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      const originalSecret = webhook.secret;
      const result = await service.regenerateSecret(webhook.id);

      expect(result?.secret).toBeDefined();
      expect(result?.secret).not.toBe(originalSecret);
    });

    test('enables and disables webhook', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      await service.disableWebhook(webhook.id);
      let updated = await service.getWebhook(webhook.id);
      expect(updated?.enabled).toBe(false);

      await service.enableWebhook(webhook.id);
      updated = await service.getWebhook(webhook.id);
      expect(updated?.enabled).toBe(true);
    });
  });

  describe('Webhook Processing', () => {
    test('processes webhook request', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        authType: 'secret',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      const event = await service.processWebhook(webhook.id, {
        method: 'POST',
        headers: { 'x-webhook-secret': webhook.secret! },
        query: {},
        body: { order_id: '12345', status: 'completed' },
      });

      expect(event.status).toBe('completed');
      expect(event.responseCode).toBe(200);
    });

    test('rejects invalid secret', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        authType: 'secret',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      const event = await service.processWebhook(webhook.id, {
        method: 'POST',
        headers: { 'x-webhook-secret': 'wrong-secret' },
        query: {},
        body: {},
      });

      expect(event.status).toBe('failed');
      expect(event.error).toContain('Invalid webhook secret');
    });

    test('rejects disabled webhook', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      await service.disableWebhook(webhook.id);

      await expect(
        service.processWebhook(webhook.id, {
          method: 'POST',
          headers: {},
          query: {},
          body: {},
        })
      ).rejects.toThrow('Webhook is disabled');
    });

    test('applies input mapping', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        authType: 'none',
        targetType: 'workflow',
        targetId: 'wf-1',
        inputMapping: {
          orderId: 'data.order.id',
          customerName: 'data.customer.name',
        },
        createdBy: 'user-1',
      });

      const event = await service.processWebhook(webhook.id, {
        method: 'POST',
        headers: {},
        query: {},
        body: {
          data: {
            order: { id: 'ORD-123' },
            customer: { name: 'John Doe' },
          },
        },
      });

      expect(event.status).toBe('completed');
    });

    test('tracks webhook stats', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        authType: 'none',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      await service.processWebhook(webhook.id, { method: 'POST', headers: {}, query: {}, body: {} });
      await service.processWebhook(webhook.id, { method: 'POST', headers: {}, query: {}, body: {} });

      const updated = await service.getWebhook(webhook.id);
      expect(updated?.callCount).toBe(2);
      expect(updated?.lastCalledAt).toBeDefined();
    });

    test('replays event', async () => {
      const webhook = await service.createWebhook({
        name: 'Test',
        authType: 'none',
        targetType: 'workflow',
        targetId: 'wf-1',
        createdBy: 'user-1',
      });

      const originalEvent = await service.processWebhook(webhook.id, {
        method: 'POST',
        headers: {},
        query: {},
        body: { test: 'data' },
      });

      const replayedEvent = await service.replayEvent(webhook.id, originalEvent.id);
      expect(replayedEvent.id).not.toBe(originalEvent.id);
      expect(replayedEvent.body).toEqual({ test: 'data' });
    });
  });
});

describe('Connector Templates', () => {
  test('lists all templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.some(t => t.provider === 'salesforce')).toBe(true);
    expect(templates.some(t => t.provider === 'google')).toBe(true);
    expect(templates.some(t => t.provider === 'microsoft')).toBe(true);
    expect(templates.some(t => t.provider === 'slack')).toBe(true);
  });

  test('gets template by id', () => {
    const salesforce = getTemplate('salesforce');
    expect(salesforce).toBeDefined();
    expect(salesforce?.name).toBe('Salesforce');
    expect(salesforce?.operations.length).toBeGreaterThan(0);
  });

  test('salesforce template has expected operations', () => {
    const salesforce = getTemplate('salesforce');
    expect(salesforce?.operations.some(o => o.name === 'Query Records')).toBe(true);
    expect(salesforce?.operations.some(o => o.name === 'Create Record')).toBe(true);
    expect(salesforce?.operations.some(o => o.name === 'Update Record')).toBe(true);
  });

  test('slack template has expected operations', () => {
    const slack = getTemplate('slack');
    expect(slack?.operations.some(o => o.name === 'Post Message')).toBe(true);
    expect(slack?.operations.some(o => o.name === 'List Channels')).toBe(true);
  });

  test('templates have required fields', () => {
    const templates = listTemplates();
    for (const template of templates) {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.provider).toBeDefined();
      expect(template.authType).toBeDefined();
      expect(template.defaultConfig).toBeDefined();
    }
  });
});
