import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { prisma } from '../utils/prisma.js';
import type { AuthUser } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth-middleware');

/**
 * Authenticate request using JWT access token
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT token
    await request.jwtVerify();

    const payload = request.user as unknown as {
      userId: string;
      accountId: string;
      email: string;
      type: string;
    };

    // Ensure it's an access token
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        groupMemberships: {
          include: {
            group: {
              include: {
                roleAssignments: {
                  include: {
                    role: {
                      include: {
                        permissions: {
                          include: {
                            permission: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is not active');
    }

    // Collect roles from direct assignments and group memberships
    const roles = new Set<string>();
    const permissions = new Set<string>();

    // Direct role assignments
    for (const assignment of user.roleAssignments) {
      roles.add(assignment.role.name);
      for (const rp of assignment.role.permissions) {
        permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
      }
    }

    // Group role assignments
    for (const membership of user.groupMemberships) {
      for (const groupRole of membership.group.roleAssignments) {
        roles.add(groupRole.role.name);
        for (const rp of groupRole.role.permissions) {
          permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
        }
      }
    }

    // Attach auth user to request
    const authUser: AuthUser = {
      id: user.id,
      accountId: user.accountId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: Array.from(roles),
      permissions: Array.from(permissions),
    };

    request.user = authUser;
    request.accountId = user.accountId;

    // Update last active timestamp (fire and forget)
    prisma.user
      .update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      })
      .catch((err) => logger.error({ err }, 'Failed to update lastActiveAt'));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    logger.error({ error }, 'Authentication failed');
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await authenticate(request, reply);
  } catch {
    // Ignore auth errors for optional auth
    (request as any).user = undefined;
    request.accountId = undefined;
  }
}

/**
 * Create a permission check middleware
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPermissions = new Set(request.user.permissions);

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.has(perm)
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions', {
        required: requiredPermissions,
        available: request.user.permissions,
      });
    }
  };
}

/**
 * Create a role check middleware
 */
export function requireRole(...requiredRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRoles = new Set(request.user.roles);

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.has(role));

    if (!hasRole) {
      throw new ForbiddenError('Insufficient role', {
        required: requiredRoles,
        available: request.user.roles,
      });
    }
  };
}

/**
 * Ensure user belongs to the specified account
 */
export async function requireAccount(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Account ID from URL params (if present)
  const paramAccountId = (request.params as { accountId?: string }).accountId;

  if (paramAccountId && paramAccountId !== request.user.accountId) {
    throw new ForbiddenError('Access denied to this account');
  }
}
