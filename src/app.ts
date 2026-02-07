import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRoutes } from './api/routes/auth.routes.js';
import { healthRoutes } from './api/routes/health.routes.js';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // We use our own logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: true,
  });

  // Register plugins
  await registerPlugins(app);

  // Register routes
  await registerRoutes(app);

  // Set error handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Request logging
  app.addHook('onRequest', async (request) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
    }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  return app;
}

/**
 * Register Fastify plugins
 */
async function registerPlugins(app: FastifyInstance): Promise<void> {
  // CORS
  await app.register(cors, {
    origin: config.isDevelopment ? true : config.frontend.url,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: config.isProduction ? undefined : false,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    }),
  });

  // JWT
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      algorithm: 'HS256',
    },
  });

  // Swagger documentation
  await app.register(swagger, {
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
        { name: 'Groups', description: 'Group management endpoints' },
        { name: 'Roles', description: 'Role management endpoints' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

/**
 * Register application routes
 */
async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health check routes (no prefix)
  await app.register(healthRoutes, { prefix: '/health' });

  // API routes with version prefix
  await app.register(async (api) => {
    await api.register(authRoutes, { prefix: '/auth' });
    // Future routes will be added here:
    // await api.register(userRoutes, { prefix: '/users' });
    // await api.register(groupRoutes, { prefix: '/groups' });
    // await api.register(roleRoutes, { prefix: '/roles' });
    // await api.register(processRoutes, { prefix: '/processes' });
    // await api.register(formRoutes, { prefix: '/forms' });
    // await api.register(datasetRoutes, { prefix: '/datasets' });
  }, { prefix: config.server.apiPrefix });
}
