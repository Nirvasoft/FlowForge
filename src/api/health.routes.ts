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
   * Debug endpoint - inspect container state
   * GET /health/debug
   */
  fastify.get('/debug', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = await import('path');
    const fs = await import('fs');
    const cwd = process.cwd();
    const clientDir = path.default.join(cwd, 'client', 'dist');
    const clientDirAlt = path.default.join(cwd, 'client');

    let rootFiles: string[] = [];
    let clientFiles: string[] = [];
    let clientDistFiles: string[] = [];
    try { rootFiles = fs.default.readdirSync(cwd); } catch (e: any) { rootFiles = [`ERROR: ${e.message}`]; }
    try { clientFiles = fs.default.readdirSync(clientDirAlt); } catch (e: any) { clientFiles = [`ERROR: ${e.message}`]; }
    try { clientDistFiles = fs.default.readdirSync(clientDir); } catch (e: any) { clientDistFiles = [`ERROR: ${e.message}`]; }

    reply.send({
      cwd,
      nodeEnv: process.env.NODE_ENV,
      clientDir,
      clientDirExists: fs.default.existsSync(clientDir),
      rootFiles,
      clientFiles,
      clientDistFiles,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
        JWT_SECRET: process.env.JWT_SECRET ? `[SET, length=${process.env.JWT_SECRET.length}]` : '[NOT SET]',
      },
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
