import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../../services/auth.service.js';
import { authenticate } from '../../middleware/auth.js';

// Validation schemas
const registerSchema = z.object({
  accountName: z.string().min(2).max(200),
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

const forgotPasswordSchema = z.object({
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
   * POST /auth/register
   * Register a new user and create an account
   */
  fastify.post('/register', {
    schema: {
      description: 'Register a new user and create an account',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['accountName', 'email', 'password', 'firstName', 'lastName'],
        properties: {
          accountName: { type: 'string', minLength: 2, maxLength: 200 },
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

    return reply.status(201).send({
      success: true,
      data: result,
    });
  });

  /**
   * POST /auth/login
   * Login with email and password
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
    const credentials = loginSchema.parse(request.body);
    const result = await authService.login(credentials, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    return reply.send({
      success: true,
      data: result,
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token
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

    return reply.send({
      success: true,
      data: tokens,
    });
  });

  /**
   * POST /auth/logout
   * Logout current session
   */
  fastify.post('/logout', {
    preHandler: [authenticate],
    schema: {
      description: 'Logout current session',
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
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as unknown as { sessionId?: string };
    if (payload.sessionId) {
      await authService.logout(payload.sessionId);
    }

    return reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  /**
   * POST /auth/logout-all
   * Logout from all sessions
   */
  fastify.post('/logout-all', {
    preHandler: [authenticate],
    schema: {
      description: 'Logout from all sessions',
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
                message: { type: 'string' },
                sessionsRevoked: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const count = await authService.logoutAll(request.user!.id);

    return reply.send({
      success: true,
      data: {
        message: 'Logged out from all sessions',
        sessionsRevoked: count,
      },
    });
  });

  /**
   * POST /auth/forgot-password
   * Request password reset email
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
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = forgotPasswordSchema.parse(request.body);
    await authService.requestPasswordReset(email);

    return reply.send({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent',
      },
    });
  });

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password with token',
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
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(token, password);

    return reply.send({
      success: true,
      data: { message: 'Password reset successfully' },
    });
  });

  /**
   * POST /auth/change-password
   * Change password for authenticated user
   */
  fastify.post('/change-password', {
    preHandler: [authenticate],
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
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    await authService.changePassword(request.user!.id, currentPassword, newPassword);

    return reply.send({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  });

  /**
   * GET /auth/me
   * Get current user profile
   */
  fastify.get('/me', {
    preHandler: [authenticate],
    schema: {
      description: 'Get current user profile',
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
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                displayName: { type: 'string', nullable: true },
                avatar: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
                timezone: { type: 'string' },
                locale: { type: 'string' },
                status: { type: 'string' },
                emailVerified: { type: 'boolean' },
                mfaEnabled: { type: 'boolean' },
                account: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    plan: { type: 'string' },
                  },
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
                createdAt: { type: 'string' },
                lastLoginAt: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await authService.getCurrentUser(request.user!.id);

    return reply.send({
      success: true,
      data: user,
    });
  });
}
