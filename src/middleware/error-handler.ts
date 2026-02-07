import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, isAppError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { ZodError } from 'zod';

const logger = createLogger('error-handler');

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log the error
  logger.error(
    {
      err: error,
      requestId: request.id,
      method: request.method,
      url: request.url,
      userId: request.user?.id,
      accountId: request.accountId,
    },
    'Request error'
  );

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    reply.status(422).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
      },
    });
    return;
  }

  // Handle custom application errors
  if (isAppError(error)) {
    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          issues: error.validation,
        },
      },
    });
    return;
  }

  // Handle JWT errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is missing',
      },
    });
    return;
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    reply.status(401).send({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired',
      },
    });
    return;
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
      },
    });
    return;
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as unknown as { code: string; meta?: Record<string, unknown> };
    
    switch (prismaError.code) {
      case 'P2002':
        reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'A record with this value already exists',
            details: prismaError.meta,
          },
        });
        return;
      case 'P2025':
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
            details: prismaError.meta,
          },
        });
        return;
      default:
        // Fall through to generic error
        break;
    }
  }

  // Generic error response
  const statusCode = error.statusCode ?? 500;
  const message = config.isProduction
    ? 'An unexpected error occurred'
    : error.message;

  reply.status(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(config.isDevelopment && { stack: error.stack }),
    },
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
}
