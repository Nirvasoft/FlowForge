import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkDatabaseConnection } from '../utils/prisma.js';

/**
 * Health check routes
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Basic health check
   * GET /health
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
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed health check with dependencies
   * GET /health/ready
   */
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check with dependency status',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    latency: { type: 'number' },
                  },
                },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            checks: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Check database
    const dbStart = Date.now();
    const dbHealthy = await checkDatabaseConnection();
    checks.database = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      latency: Date.now() - dbStart,
    };

    // Overall status
    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    const response = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };

    reply.status(allHealthy ? 200 : 503).send(response);
  });

  /**
   * Liveness probe
   * GET /health/live
   */
  fastify.get('/live', {
    schema: {
      description: 'Liveness probe for Kubernetes',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ status: 'ok' });
  });
}
