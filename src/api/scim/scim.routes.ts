/**
 * FlowForge SCIM 2.0 API Routes
 * RFC 7644 compliant endpoints for user and group provisioning
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SCIMService, scimService } from '../../services/scim/scim.service';
import type { SCIMUser, SCIMGroup, SCIMPatchRequest, SCIMError } from '../../types/scim';

interface ListQuery {
  filter?: string;
  startIndex?: number;
  count?: number;
  sortBy?: string;
  sortOrder?: 'ascending' | 'descending';
}

interface IdParams {
  id: string;
}

function sendSCIMError(reply: FastifyReply, error: SCIMError): void {
  reply.status(parseInt(error.status)).header('Content-Type', 'application/scim+json').send(error);
}

function addSCIMHeaders(reply: FastifyReply): void {
  reply.header('Content-Type', 'application/scim+json');
}

export async function scimRoutes(fastify: FastifyInstance) {
  const service = scimService;

  // Service Provider Config
  fastify.get('/ServiceProviderConfig', async (request, reply) => {
    addSCIMHeaders(reply);
    return service.getServiceProviderConfig();
  });

  // Resource Types
  fastify.get('/ResourceTypes', async (request, reply) => {
    addSCIMHeaders(reply);
    const types = service.getResourceTypes();
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: types.length,
      startIndex: 1,
      itemsPerPage: types.length,
      Resources: types,
    };
  });

  // List users
  fastify.get<{ Querystring: ListQuery }>('/Users', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      return await service.listUsers(request.query);
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Create user
  fastify.post<{ Body: Partial<SCIMUser> }>('/Users', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      const user = await service.createUser(request.body);
      reply.status(201);
      return user;
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Get user
  fastify.get<{ Params: IdParams }>('/Users/:id', async (request, reply) => {
    addSCIMHeaders(reply);
    const user = await service.getUser(request.params.id);
    if (!user) {
      sendSCIMError(reply, {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '404',
        detail: `User ${request.params.id} not found`,
      });
      return;
    }
    return user;
  });

  // Update user (PUT)
  fastify.put<{ Params: IdParams; Body: Partial<SCIMUser> }>('/Users/:id', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      return await service.updateUser(request.params.id, request.body);
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Patch user
  fastify.patch<{ Params: IdParams; Body: SCIMPatchRequest }>('/Users/:id', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      return await service.patchUser(request.params.id, request.body);
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Delete user
  fastify.delete<{ Params: IdParams }>('/Users/:id', async (request, reply) => {
    try {
      await service.deleteUser(request.params.id);
      reply.status(204).send();
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // List groups
  fastify.get<{ Querystring: ListQuery }>('/Groups', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      return await service.listGroups(request.query);
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Create group
  fastify.post<{ Body: Partial<SCIMGroup> }>('/Groups', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      const group = await service.createGroup(request.body);
      reply.status(201);
      return group;
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Get group
  fastify.get<{ Params: IdParams }>('/Groups/:id', async (request, reply) => {
    addSCIMHeaders(reply);
    const group = await service.getGroup(request.params.id);
    if (!group) {
      sendSCIMError(reply, {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '404',
        detail: `Group ${request.params.id} not found`,
      });
      return;
    }
    return group;
  });

  // Update group (PUT)
  fastify.put<{ Params: IdParams; Body: Partial<SCIMGroup> }>('/Groups/:id', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      return await service.updateGroup(request.params.id, request.body);
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Patch group
  fastify.patch<{ Params: IdParams; Body: SCIMPatchRequest }>('/Groups/:id', async (request, reply) => {
    addSCIMHeaders(reply);
    try {
      return await service.patchGroup(request.params.id, request.body);
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });

  // Delete group
  fastify.delete<{ Params: IdParams }>('/Groups/:id', async (request, reply) => {
    try {
      await service.deleteGroup(request.params.id);
      reply.status(204).send();
    } catch (error) {
      if ((error as SCIMError).schemas) {
        sendSCIMError(reply, error as SCIMError);
        return;
      }
      throw error;
    }
  });
}
