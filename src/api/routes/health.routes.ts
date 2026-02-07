import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkDatabaseConnection } from '../../utils/prisma.js';

/**
 * Health check routes
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /health
   * Basic health check
   */
  fastify.get('/', {
    schema: {
      description: 'Basic health check',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/ready
   * Readiness check (includes database)
   */
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check including database connectivity',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const dbHealthy = await checkDatabaseConnection();

    const response = {
      status: dbHealthy ? 'ready' : 'not ready',
      checks: {
        database: dbHealthy,
      },
      timestamp: new Date().toISOString(),
    };

    if (!dbHealthy) {
      return reply.status(503).send(response);
    }

    return reply.send(response);
  });

  /**
   * GET /health/live
   * Liveness check (basic)
   */
  fastify.get('/live', {
    schema: {
      description: 'Liveness check',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });
}
