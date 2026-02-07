/**
 * FlowForge Webhook Service
 * Incoming webhook management and processing
 */

import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';
import type {
  Webhook,
  WebhookEvent,
} from '../../types/integrations';

// ============================================================================
// In-Memory Storage
// ============================================================================

const webhooks = new Map<string, Webhook>();
const webhookEvents = new Map<string, WebhookEvent[]>();

// ============================================================================
// Webhook Service
// ============================================================================

export class WebhookService {

  // ============================================================================
  // Webhook CRUD
  // ============================================================================

  async createWebhook(input: {
    name: string;
    description?: string;
    method?: 'GET' | 'POST' | 'PUT';
    authType?: Webhook['authType'];
    secret?: string;
    targetType: Webhook['targetType'];
    targetId: string;
    inputMapping?: Record<string, string>;
    createdBy: string;
  }): Promise<Webhook> {
    const id = randomUUID();
    const now = new Date();

    const webhook: Webhook = {
      id,
      name: input.name,
      description: input.description,
      path: `/webhooks/${id}`,
      method: input.method || 'POST',
      secret: input.secret || randomUUID(),
      authType: input.authType || 'secret',
      targetType: input.targetType,
      targetId: input.targetId,
      inputMapping: input.inputMapping,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      callCount: 0,
    };

    webhooks.set(id, webhook);
    webhookEvents.set(id, []);
    return webhook;
  }

  async getWebhook(id: string): Promise<Webhook | null> {
    return webhooks.get(id) || null;
  }

  async getWebhookByPath(path: string): Promise<Webhook | null> {
    for (const webhook of webhooks.values()) {
      if (webhook.path === path) return webhook;
    }
    return null;
  }

  async listWebhooks(options: {
    targetType?: Webhook['targetType'];
    enabled?: boolean;
  } = {}): Promise<{ webhooks: Webhook[]; total: number }> {
    let items = Array.from(webhooks.values());

    if (options.targetType) {
      items = items.filter(w => w.targetType === options.targetType);
    }
    if (options.enabled !== undefined) {
      items = items.filter(w => w.enabled === options.enabled);
    }

    return { webhooks: items, total: items.length };
  }

  async updateWebhook(
    id: string,
    input: Partial<Pick<Webhook, 'name' | 'description' | 'method' | 'authType' | 'secret' | 'targetId' | 'inputMapping' | 'enabled'>>
  ): Promise<Webhook | null> {
    const webhook = webhooks.get(id);
    if (!webhook) return null;

    Object.assign(webhook, input);
    webhook.updatedAt = new Date();
    webhooks.set(id, webhook);
    return webhook;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    webhookEvents.delete(id);
    return webhooks.delete(id);
  }

  async enableWebhook(id: string): Promise<Webhook | null> {
    return this.updateWebhook(id, { enabled: true });
  }

  async disableWebhook(id: string): Promise<Webhook | null> {
    return this.updateWebhook(id, { enabled: false });
  }

  async regenerateSecret(id: string): Promise<{ secret: string } | null> {
    const webhook = webhooks.get(id);
    if (!webhook) return null;

    webhook.secret = randomUUID();
    webhook.updatedAt = new Date();
    webhooks.set(id, webhook);
    return { secret: webhook.secret };
  }

  // ============================================================================
  // Webhook Processing
  // ============================================================================

  async processWebhook(
    webhookId: string,
    request: {
      method: string;
      headers: Record<string, string>;
      query: Record<string, string>;
      body: unknown;
    }
  ): Promise<WebhookEvent> {
    const webhook = webhooks.get(webhookId);
    if (!webhook) throw new Error('Webhook not found');
    if (!webhook.enabled) throw new Error('Webhook is disabled');

    const event: WebhookEvent = {
      id: randomUUID(),
      webhookId,
      method: request.method,
      path: webhook.path,
      headers: request.headers,
      query: request.query,
      body: request.body,
      status: 'received',
      receivedAt: new Date(),
    };

    try {
      // Validate authentication
      this.validateAuth(webhook, request);

      // Validate payload schema if configured
      if (webhook.validatePayload && webhook.payloadSchema) {
        this.validatePayload(request.body, webhook.payloadSchema);
      }

      event.status = 'processing';

      // Apply input mapping
      const mappedInput = this.applyInputMapping(request.body, webhook.inputMapping);

      // Trigger target
      await this.triggerTarget(webhook, mappedInput);

      event.status = 'completed';
      event.responseCode = 200;
      event.responseBody = { success: true, eventId: event.id };

    } catch (error) {
      event.status = 'failed';
      event.error = error instanceof Error ? error.message : 'Unknown error';
      event.responseCode = 400;
      event.responseBody = { success: false, error: event.error };
    }

    event.processedAt = new Date();
    event.duration = event.processedAt.getTime() - event.receivedAt.getTime();

    // Update webhook stats
    webhook.callCount++;
    webhook.lastCalledAt = new Date();
    if (event.status === 'failed') {
      webhook.lastError = event.error;
    }
    webhooks.set(webhookId, webhook);

    // Store event
    const events = webhookEvents.get(webhookId) || [];
    events.push(event);
    if (events.length > 100) events.shift();
    webhookEvents.set(webhookId, events);

    return event;
  }

  private validateAuth(webhook: Webhook, request: { headers: Record<string, string>; body: unknown }): void {
    switch (webhook.authType) {
      case 'none':
        break;

      case 'secret': {
        const providedSecret = request.headers['x-webhook-secret'] || request.headers['authorization'];
        if (providedSecret !== webhook.secret && providedSecret !== `Bearer ${webhook.secret}`) {
          throw new Error('Invalid webhook secret');
        }
        break;
      }

      case 'signature': {
        const signature = request.headers[webhook.signatureHeader || 'x-signature'];
        if (!signature) throw new Error('Missing signature');

        const expectedSignature = this.computeSignature(
          JSON.stringify(request.body),
          webhook.secret!,
          webhook.signatureAlgorithm || 'sha256'
        );

        if (signature !== expectedSignature) {
          throw new Error('Invalid signature');
        }
        break;
      }

      case 'basic': {
        const auth = request.headers['authorization'];
        if (!auth?.startsWith('Basic ')) throw new Error('Missing basic auth');
        // Validate against authConfig.username and authConfig.password
        break;
      }

      case 'bearer': {
        const auth = request.headers['authorization'];
        if (!auth?.startsWith('Bearer ')) throw new Error('Missing bearer token');
        // Validate against authConfig.token
        break;
      }
    }
  }

  private computeSignature(payload: string, secret: string, algorithm: string): string {
    return createHmac(algorithm, secret).update(payload).digest('hex');
  }

  private validatePayload(body: unknown, schema: Record<string, unknown>): void {
    // Simplified validation - in production use JSON Schema validator
    if (typeof body !== 'object' || body === null) {
      throw new Error('Payload must be an object');
    }
  }

  private applyInputMapping(
    body: unknown,
    mapping?: Record<string, string>
  ): Record<string, unknown> {
    if (!mapping || typeof body !== 'object' || body === null) {
      return body as Record<string, unknown>;
    }

    const result: Record<string, unknown> = {};
    for (const [target, source] of Object.entries(mapping)) {
      result[target] = this.getNestedValue(body as Record<string, unknown>, source);
    }
    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((o, k) => (o as any)?.[k], obj);
  }

  private async triggerTarget(webhook: Webhook, input: Record<string, unknown>): Promise<void> {
    // In production, trigger the actual workflow/connector/script
    switch (webhook.targetType) {
      case 'workflow':
        // workflowService.startExecution(webhook.targetId, input)
        break;
      case 'connector':
        // connectorService.executeOperation(...)
        break;
      case 'script':
        // scriptService.execute(webhook.targetId, input)
        break;
    }
  }

  // ============================================================================
  // Event History
  // ============================================================================

  async getEvents(webhookId: string, limit = 50): Promise<WebhookEvent[]> {
    const events = webhookEvents.get(webhookId) || [];
    return events.slice(-limit).reverse();
  }

  async getEvent(webhookId: string, eventId: string): Promise<WebhookEvent | null> {
    const events = webhookEvents.get(webhookId) || [];
    return events.find(e => e.id === eventId) || null;
  }

  async replayEvent(webhookId: string, eventId: string): Promise<WebhookEvent> {
    const originalEvent = await this.getEvent(webhookId, eventId);
    if (!originalEvent) throw new Error('Event not found');

    return this.processWebhook(webhookId, {
      method: originalEvent.method,
      headers: originalEvent.headers,
      query: originalEvent.query,
      body: originalEvent.body,
    });
  }
}

export const webhookService = new WebhookService();
