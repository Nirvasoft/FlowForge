import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { disconnectPrisma } from './utils/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Routes
import { healthRoutes } from './api/health.routes.js';
import { authRoutes } from './api/auth.routes.js';
import { userRoutes } from './api/user.routes.js';
import { expressionRoutes } from './api/expressions/index.js';
import { datasetRoutes } from './api/datasets/index.js';
import { scimRoutes, directorySyncRoutes } from './api/scim/index.js';
import { workflowRoutes, executionRoutes, taskRoutes } from './api/workflow/index.js';
import { formRoutes } from './api/forms/index.js';
import { appRoutes, componentRoutes } from './api/apps/index.js';
import { dashboardRoutes, reportRoutes, processAnalyticsRoutes, queryRoutes } from './api/analytics/index.js';
import { decisionTableRoutes } from './api/decisions/decision-table.routes.js';
import { seedExpenseApprovalTable, seedPOApprovalMatrix, seedTicketRoutingSLA, seedOnboardingEquipmentAccess } from './services/decisions/decision-table.service.js';
/**
 * Build and configure Fastify server
 */
async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      ...(config.isDevelopment && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: config.isProduction,
  });

  // CORS
  await fastify.register(cors, {
    origin: config.isDevelopment ? true : config.frontend.url,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: (request) => {
      return (request as any).user?.id ?? request.ip;
    },
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      algorithm: 'HS256',
    },
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'FlowForge API',
        description: 'AI-Powered Workflow Management Platform API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.server.port}${config.server.apiPrefix}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Error handlers
  fastify.setErrorHandler(errorHandler);

  // Register routes
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(authRoutes, { prefix: `${config.server.apiPrefix}/auth` });
  await fastify.register(userRoutes, { prefix: `${config.server.apiPrefix}/users` });
  await fastify.register(expressionRoutes, { prefix: '/api/v1/expressions' });
  await fastify.register(datasetRoutes, { prefix: '/api/v1/datasets' });
  await fastify.register(scimRoutes, { prefix: '/scim/v2' });
  await fastify.register(directorySyncRoutes, { prefix: '/api/v1/directory-sync' });
  await fastify.register(workflowRoutes, { prefix: '/api/v1/workflows' });
  await fastify.register(executionRoutes, { prefix: '/api/v1/executions' });
  await fastify.register(taskRoutes, { prefix: '/api/v1/tasks' });
  await fastify.register(formRoutes, { prefix: '/api/v1/forms' });
  await fastify.register(appRoutes, { prefix: '/api/v1/apps' });
  await fastify.register(componentRoutes, { prefix: '/api/v1/components' });
  await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboards' });
  await fastify.register(reportRoutes, { prefix: '/api/v1/reports' });
  await fastify.register(processAnalyticsRoutes, { prefix: '/api/v1/analytics' });
  await fastify.register(queryRoutes, { prefix: '/api/v1/query' });
  await fastify.register(decisionTableRoutes, { prefix: '/api/v1/decision-tables' });

  // ---------- Serve React client in production ----------
  if (config.isProduction) {
    const clientDir = path.join(process.cwd(), 'client', 'dist');

    await fastify.register(fastifyStatic, {
      root: clientDir,
      prefix: '/',
      decorateReply: false,
    });

    // SPA fallback: serve index.html for any route not handled by API / health / docs
    fastify.setNotFoundHandler(async (request, reply) => {
      const url = request.url;
      // Let API, health, docs, and swagger return 404 normally
      if (url.startsWith('/api/') || url.startsWith('/health') || url.startsWith('/docs') || url.startsWith('/scim/')) {
        return reply.status(404).send({ error: 'Not Found' });
      }
      // Everything else → index.html (React Router handles it)
      return reply.sendFile('index.html');
    });
  } else {
    fastify.setNotFoundHandler(notFoundHandler);
  }

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  let server: Awaited<ReturnType<typeof buildServer>> | undefined;

  try {
    server = await buildServer();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down...');

      if (server) {
        await server.close();
      }
      await disconnectPrisma();

      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Start listening
    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(
      {
        port: config.server.port,
        env: config.env,
        docs: `http://localhost:${config.server.port}/docs`,
      },
      '🚀 FlowForge server started'
    );

    // Seed in-memory data (decision tables)
    try {
      console.log('\n📊 Seeding in-memory decision tables...');
      await seedExpenseApprovalTable();
      await seedPOApprovalMatrix();
      await seedTicketRoutingSLA();
      await seedOnboardingEquipmentAccess();
      console.log('✅ In-memory seeding complete\n');
    } catch (err) {
      logger.warn({ err }, 'Failed to seed decision tables (non-fatal)');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();
