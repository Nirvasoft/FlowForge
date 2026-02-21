import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { userService } from '../services/user.service.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import type { UserStatus } from '@prisma/client';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
  avatar: z.string().url().optional(),
  preferences: z.record(z.unknown()).optional(),
  notificationPrefs: z.record(z.unknown()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

const groupsSchema = z.object({
  groupIds: z.array(z.string().uuid()),
});

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  search: z.string().optional(),
});

/**
 * User management routes
 */
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  /**
   * List users
   * GET /users
   */
  fastify.get('/', {
    onRequest: [requirePermission('users:read')],
    schema: {
      description: 'List users in the account',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '20' },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          search: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listQuerySchema.parse(request.query);
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    // Build the account filter: include demo account users for dev purposes
    const accountIds = [request.accountId!];
    const demoAccount = await prisma.account.findUnique({ where: { slug: 'demo' } });
    if (demoAccount && demoAccount.id !== request.accountId) {
      accountIds.push(demoAccount.id);
    }

    // Build where clause for combined query
    const where: any = {
      accountId: { in: accountIds },
      ...(query.status && { status: query.status as UserStatus }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // Single paginated query across both accounts
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    reply.send({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  });

  /**
   * Get user by ID
   * GET /users/:id
   */
  fastify.get('/:id', {
    onRequest: [requirePermission('users:read')],
    schema: {
      description: 'Get user by ID',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await userService.getUserById(request.accountId!, id);

    reply.send({
      success: true,
      data: user,
    });
  });

  /**
   * Create user
   * POST /users
   */
  fastify.post('/', {
    onRequest: [requirePermission('users:create')],
    schema: {
      description: 'Create a new user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: 'string', maxLength: 50 },
          timezone: { type: 'string', maxLength: 50 },
          locale: { type: 'string', maxLength: 10 },
          roleIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          groupIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createUserSchema.parse(request.body);
    const user = await userService.createUser(request.accountId!, input, request.user!.id);

    reply.status(201).send({
      success: true,
      data: user,
    });
  });

  /**
   * Update user
   * PATCH /users/:id
   */
  fastify.patch('/:id', {
    onRequest: [requirePermission('users:update')],
    schema: {
      description: 'Update user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          displayName: { type: 'string', maxLength: 200 },
          phone: { type: 'string', maxLength: 50 },
          timezone: { type: 'string', maxLength: 50 },
          locale: { type: 'string', maxLength: 10 },
          avatar: { type: 'string', format: 'uri' },
          preferences: { type: 'object' },
          notificationPrefs: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateUserSchema.parse(request.body);
    const user = await userService.updateUser(request.accountId!, id, input);

    reply.send({
      success: true,
      data: user,
    });
  });

  /**
   * Update user status
   * PATCH /users/:id/status
   */
  fastify.patch('/:id/status', {
    onRequest: [requirePermission('users:update')],
    schema: {
      description: 'Update user status',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = updateStatusSchema.parse(request.body);
    const user = await userService.updateUserStatus(request.accountId!, id, status);

    reply.send({
      success: true,
      data: user,
    });
  });

  /**
   * Delete user
   * DELETE /users/:id
   */
  fastify.delete('/:id', {
    onRequest: [requirePermission('users:delete')],
    schema: {
      description: 'Delete user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await userService.deleteUser(request.accountId!, id);

    reply.send({
      success: true,
      message: 'User deleted successfully',
    });
  });

  /**
   * Assign roles to user
   * PUT /users/:id/roles
   */
  fastify.put('/:id/roles', {
    onRequest: [requirePermission('users:update')],
    schema: {
      description: 'Assign roles to user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['roleIds'],
        properties: {
          roleIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { roleIds } = assignRolesSchema.parse(request.body);
    await userService.assignRoles(request.accountId!, id, roleIds, request.user!.id);

    reply.send({
      success: true,
      message: 'Roles assigned successfully',
    });
  });

  /**
   * Add user to groups
   * POST /users/:id/groups
   */
  fastify.post('/:id/groups', {
    onRequest: [requirePermission('users:update')],
    schema: {
      description: 'Add user to groups',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['groupIds'],
        properties: {
          groupIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { groupIds } = groupsSchema.parse(request.body);
    await userService.addToGroups(request.accountId!, id, groupIds, request.user!.id);

    reply.send({
      success: true,
      message: 'User added to groups',
    });
  });

  /**
   * Remove user from groups
   * DELETE /users/:id/groups
   */
  fastify.delete('/:id/groups', {
    onRequest: [requirePermission('users:update')],
    schema: {
      description: 'Remove user from groups',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['groupIds'],
        properties: {
          groupIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { groupIds } = groupsSchema.parse(request.body);
    await userService.removeFromGroups(request.accountId!, id, groupIds);

    reply.send({
      success: true,
      message: 'User removed from groups',
    });
  });
}
