/**
 * FlowForge Directory Sync API Routes
 * Manage sync configurations and trigger syncs
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DirectorySyncService, directorySyncService } from '../../services/scim/directory-sync.service';
import type { DirectorySyncConfig, AttributeMapping } from '../../types/scim';

interface IdParams {
  id: string;
}

interface CreateConfigBody {
  name: string;
  provider: DirectorySyncConfig['provider'];
  baseUrl: string;
  bearerToken: string;
  syncInterval?: number;
}

interface UpdateConfigBody {
  name?: string;
  enabled?: boolean;
  syncInterval?: number;
  userMapping?: AttributeMapping[];
  groupMapping?: AttributeMapping[];
  syncUsers?: boolean;
  syncGroups?: boolean;
  provisionUsers?: boolean;
  deprovisionUsers?: boolean;
  provisionGroups?: boolean;
  deprovisionGroups?: boolean;
  userFilter?: string;
  groupFilter?: string;
}

export async function directorySyncRoutes(fastify: FastifyInstance) {
  const service = directorySyncService;

  // List sync configurations
  fastify.get('/', {
    schema: {
      description: 'List all directory sync configurations',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const configs = await service.listConfigs();
    // Mask bearer tokens
    const safeConfigs = configs.map(c => ({
      ...c,
      bearerToken: '***masked***',
    }));
    return { configs: safeConfigs };
  });

  // Create sync configuration
  fastify.post<{ Body: CreateConfigBody }>('/', {
    schema: {
      description: 'Create a new directory sync configuration',
      tags: ['Directory Sync'],
      body: {
        type: 'object',
        required: ['name', 'provider', 'baseUrl', 'bearerToken'],
        properties: {
          name: { type: 'string' },
          provider: { type: 'string', enum: ['azure_ad', 'okta', 'google', 'onelogin', 'custom'] },
          baseUrl: { type: 'string' },
          bearerToken: { type: 'string' },
          syncInterval: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = 'user-1'; // TODO: Get from auth
    const config = await service.createConfig({
      ...request.body,
      userId,
    });
    
    reply.status(201);
    return {
      ...config,
      bearerToken: '***masked***',
    };
  });

  // Get sync configuration
  fastify.get<{ Params: IdParams }>('/:id', {
    schema: {
      description: 'Get a directory sync configuration',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const config = await service.getConfig(request.params.id);
    if (!config) {
      return reply.status(404).send({ error: 'Configuration not found' });
    }
    return {
      ...config,
      bearerToken: '***masked***',
    };
  });

  // Update sync configuration
  fastify.patch<{ Params: IdParams; Body: UpdateConfigBody }>('/:id', {
    schema: {
      description: 'Update a directory sync configuration',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const config = await service.updateConfig(request.params.id, request.body);
    if (!config) {
      return reply.status(404).send({ error: 'Configuration not found' });
    }
    return {
      ...config,
      bearerToken: '***masked***',
    };
  });

  // Delete sync configuration
  fastify.delete<{ Params: IdParams }>('/:id', {
    schema: {
      description: 'Delete a directory sync configuration',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const deleted = await service.deleteConfig(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Configuration not found' });
    }
    return { success: true };
  });

  // Enable sync configuration
  fastify.post<{ Params: IdParams }>('/:id/enable', {
    schema: {
      description: 'Enable a directory sync configuration',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const config = await service.enableConfig(request.params.id);
    if (!config) {
      return reply.status(404).send({ error: 'Configuration not found' });
    }
    return { success: true, enabled: true };
  });

  // Disable sync configuration
  fastify.post<{ Params: IdParams }>('/:id/disable', {
    schema: {
      description: 'Disable a directory sync configuration',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const config = await service.disableConfig(request.params.id);
    if (!config) {
      return reply.status(404).send({ error: 'Configuration not found' });
    }
    return { success: true, enabled: false };
  });

  // Test connection
  fastify.post<{ Params: IdParams }>('/:id/test', {
    schema: {
      description: 'Test connection to identity provider',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const config = await service.getConfig(request.params.id);
    if (!config) {
      return reply.status(404).send({ error: 'Configuration not found' });
    }
    
    const result = await service.testConnection(config);
    return result;
  });

  // Trigger full sync
  fastify.post<{ Params: IdParams }>('/:id/sync', {
    schema: {
      description: 'Trigger a full directory sync',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    try {
      const event = await service.runFullSync(request.params.id);
      return event;
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  });

  // Trigger incremental sync
  fastify.post<{ Params: IdParams; Body: { since?: string } }>('/:id/sync/incremental', {
    schema: {
      description: 'Trigger an incremental directory sync',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    try {
      const config = await service.getConfig(request.params.id);
      if (!config) {
        return reply.status(404).send({ error: 'Configuration not found' });
      }

      const since = request.body.since 
        ? new Date(request.body.since)
        : config.lastSyncAt || new Date(0);

      const event = await service.runIncrementalSync(request.params.id, since);
      return event;
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  });

  // Get sync history
  fastify.get<{ Params: IdParams; Querystring: { limit?: number; offset?: number } }>(
    '/:id/history',
    {
      schema: {
        description: 'Get sync history for a configuration',
        tags: ['Directory Sync'],
      },
    },
    async (request, reply) => {
      const result = await service.getSyncHistory(request.params.id, {
        limit: request.query.limit,
        offset: request.query.offset,
      });
      return result;
    }
  );

  // Get last sync event
  fastify.get<{ Params: IdParams }>('/:id/history/latest', {
    schema: {
      description: 'Get the most recent sync event',
      tags: ['Directory Sync'],
    },
  }, async (request, reply) => {
    const event = await service.getLastSyncEvent(request.params.id);
    if (!event) {
      return reply.status(404).send({ error: 'No sync history found' });
    }
    return event;
  });
}
