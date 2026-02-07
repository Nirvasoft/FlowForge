import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';

// Validation schemas
const registerSchema = z.object({
  accountName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * Authentication routes
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService(fastify);

  /**
   * Register new account and user
   * POST /auth/register
   */
  fastify.post('/register', {
    schema: {
      description: 'Register a new account and user',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['accountName', 'email', 'password', 'firstName', 'lastName'],
        properties: {
          accountName: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
                account: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const input = registerSchema.parse(request.body);
    const result = await authService.register(input);
    
    reply.status(201).send({
      success: true,
      data: result,
    });
  });

  /**
   * Login with email and password
   * POST /auth/login
   */
  fastify.post('/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
    
    reply.send({
      success: true,
      data: result,
    });
  });

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  fastify.post('/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const tokens = await authService.refreshToken(refreshToken);
    
    reply.send({
      success: true,
      data: tokens,
    });
  });

  /**
   * Logout (invalidate current session)
   * POST /auth/logout
   */
  fastify.post('/logout', {
    onRequest: [authenticate],
    schema: {
      description: 'Logout and invalidate current session',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Get session ID from token
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = fastify.jwt.decode<{ sessionId?: string }>(token);
        if (payload?.sessionId) {
          await authService.logout(payload.sessionId);
        }
      } catch {
        // Ignore decode errors
      }
    }
    
    reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * Logout from all sessions
   * POST /auth/logout-all
   */
  fastify.post('/logout-all', {
    onRequest: [authenticate],
    schema: {
      description: 'Logout from all sessions',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            sessionsRevoked: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const count = await authService.logoutAll(request.user!.id);
    
    reply.send({
      success: true,
      message: 'Logged out from all sessions',
      sessionsRevoked: count,
    });
  });

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  fastify.post('/forgot-password', {
    schema: {
      description: 'Request password reset email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = resetRequestSchema.parse(request.body);
    await authService.requestPasswordReset(email);
    
    reply.send({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    });
  });

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password using token from email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(token, password);
    
    reply.send({
      success: true,
      message: 'Password reset successfully',
    });
  });

  /**
   * Change password (authenticated)
   * POST /auth/change-password
   */
  fastify.post('/change-password', {
    onRequest: [authenticate],
    schema: {
      description: 'Change password for authenticated user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    await authService.changePassword(request.user!.id, currentPassword, newPassword);
    
    reply.send({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * Get current user profile
   * GET /auth/me
   */
  fastify.get('/me', {
    onRequest: [authenticate],
    schema: {
      description: 'Get current authenticated user profile',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                accountId: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                roles: { type: 'array', items: { type: 'string' } },
                permissions: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      success: true,
      data: request.user,
    });
  });
}
