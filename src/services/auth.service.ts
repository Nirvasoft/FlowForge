import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password.js';
import { generateTokenPair, type TokenPair } from '../utils/jwt.js';
import {
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { nanoid } from 'nanoid';
import type { LoginCredentials, RegisterInput, OAuthProfile } from '../types/index.js';

const logger = createLogger('auth-service');

/**
 * Authentication service handling user registration, login, and token management
 */
export class AuthService {
  constructor(private readonly fastify: FastifyInstance) { }

  /**
   * Register a new user and account
   */
  async register(input: RegisterInput): Promise<{
    user: { id: string; email: string };
    account: { id: string; name: string };
    tokens: TokenPair;
  }> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      throw new BadRequestError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    // Generate account slug
    const slug = input.accountName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Check if slug is unique
    const existingAccount = await prisma.account.findUnique({
      where: { slug },
    });

    const finalSlug = existingAccount ? `${slug}-${nanoid(6)}` : slug;

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create account, user, default roles in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create account
      const account = await tx.account.create({
        data: {
          name: input.accountName,
          slug: finalSlug,
        },
      });

      // Create default roles
      const adminRole = await tx.role.create({
        data: {
          accountId: account.id,
          name: 'Admin',
          description: 'Full administrative access',
          isSystem: true,
        },
      });

      const memberRole = await tx.role.create({
        data: {
          accountId: account.id,
          name: 'Member',
          description: 'Standard user access',
          isSystem: true,
        },
      });

      // Create default permissions
      const resources = ['users', 'groups', 'roles', 'apps', 'processes', 'forms', 'datasets'];
      const actions = ['create', 'read', 'update', 'delete'];

      for (const resource of resources) {
        for (const action of actions) {
          const permission = await tx.permission.upsert({
            where: { resource_action: { resource, action } },
            create: { resource, action },
            update: {},
          });

          // Assign all permissions to Admin role
          await tx.rolePermission.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          });

          // Assign read permissions to Member role
          if (action === 'read') {
            await tx.rolePermission.create({
              data: {
                roleId: memberRole.id,
                permissionId: permission.id,
              },
            });
          }
        }
      }

      // Create user
      const user = await tx.user.create({
        data: {
          accountId: account.id,
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          status: 'ACTIVE',
          emailVerified: false,
        },
      });

      // Assign Admin role to first user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      // Create session
      const session = await tx.session.create({
        data: {
          userId: user.id,
          token: nanoid(64),
          refreshToken: nanoid(64),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return { account, user, session };
    });

    // Generate JWT tokens
    const tokens = await generateTokenPair(this.fastify, {
      userId: result.user.id,
      accountId: result.account.id,
      email: result.user.email,
      sessionId: result.session.id,
    });

    logger.info({ userId: result.user.id, accountId: result.account.id }, 'User registered');

    return {
      user: { id: result.user.id, email: result.user.email },
      account: { id: result.account.id, name: result.account.name },
      tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{
    user: { id: string; email: string; firstName: string; lastName: string };
    tokens: TokenPair;
  }> {
    const user = await prisma.user.findFirst({
      where: { email: credentials.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your account is not active');
    }

    const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create new session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: nanoid(64),
        refreshToken: nanoid(64),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: metadata?.userAgent ?? null,
        ipAddress: metadata?.ipAddress ?? null,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT tokens
    const tokens = await generateTokenPair(this.fastify, {
      userId: user.id,
      accountId: user.accountId,
      email: user.email,
      sessionId: session.id,
    });

    logger.info({ userId: user.id }, 'User logged in');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = this.fastify.jwt.verify<{
        userId: string;
        accountId: string;
        sessionId: string;
        type: string;
      }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      // Check if session exists and is valid
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedError('Session expired or invalid');
      }

      if (session.user.status !== 'ACTIVE') {
        throw new UnauthorizedError('User account is not active');
      }

      // Generate new tokens
      const tokens = await generateTokenPair(this.fastify, {
        userId: session.userId,
        accountId: session.user.accountId,
        email: session.user.email,
        sessionId: session.id,
      });

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Logout - invalidate session
   */
  async logout(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { id: sessionId },
    }).catch(() => {
      // Ignore if session doesn't exist
    });

    logger.info({ sessionId }, 'User logged out');
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(userId: string): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info({ userId, count: result.count }, 'User logged out from all sessions');

    return result.count;
  }

  /**
   * Handle OAuth login/registration
   */
  async handleOAuthLogin(
    profile: OAuthProfile,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{
    user: { id: string; email: string; firstName: string; lastName: string };
    tokens: TokenPair;
    isNewUser: boolean;
  }> {
    // Check if OAuth account exists
    let oauthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    let user = oauthAccount?.user;
    let isNewUser = false;

    if (!user) {
      // Check if user exists with this email
      user = await prisma.user.findFirst({
        where: { email: profile.email.toLowerCase() },
      }) ?? undefined;

      if (user) {
        // Link OAuth account to existing user
        oauthAccount = await prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider: profile.provider,
            providerUserId: profile.providerUserId,
          },
          include: { user: true },
        });
      } else {
        // Create new user and account
        const slug = profile.email.split('@')[0]!
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .substring(0, 50);

        const result = await prisma.$transaction(async (tx) => {
          const account = await tx.account.create({
            data: {
              name: `${profile.firstName}'s Workspace`,
              slug: `${slug}-${nanoid(6)}`,
            },
          });

          const newUser = await tx.user.create({
            data: {
              accountId: account.id,
              email: profile.email.toLowerCase(),
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatar: profile.avatar ?? null,
              status: 'ACTIVE',
              emailVerified: true,
            },
          });

          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider: profile.provider,
              providerUserId: profile.providerUserId,
            },
          });

          // Create default Admin role and assign to user
          const adminRole = await tx.role.create({
            data: {
              accountId: account.id,
              name: 'Admin',
              description: 'Full administrative access',
              isSystem: true,
            },
          });

          await tx.userRole.create({
            data: {
              userId: newUser.id,
              roleId: adminRole.id,
            },
          });

          return newUser;
        });

        user = result;
        isNewUser = true;
      }
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your account is not active');
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: nanoid(64),
        refreshToken: nanoid(64),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: metadata?.userAgent ?? null,
        ipAddress: metadata?.ipAddress ?? null,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT tokens
    const tokens = await generateTokenPair(this.fastify, {
      userId: user.id,
      accountId: user.accountId,
      email: user.email,
      sessionId: session.id,
    });

    logger.info({ userId: user.id, provider: profile.provider, isNewUser }, 'OAuth login');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
      isNewUser,
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists
    if (!user) {
      logger.info({ email }, 'Password reset requested for non-existent email');
      return;
    }

    // Generate reset token
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token (using invitation table for simplicity, could be separate table)
    await prisma.invitation.create({
      data: {
        accountId: user.accountId,
        email: user.email,
        token,
        status: 'PENDING',
        expiresAt,
        createdBy: user.id,
      },
    });

    // TODO: Send email with reset link
    logger.info({ userId: user.id }, 'Password reset token generated');
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    // Find valid token
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const user = await prisma.user.findFirst({
      where: { email: invitation.email },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and invalidate token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
      // Invalidate all sessions
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    logger.info({ userId: user.id }, 'Password reset completed');
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    // Hash and update password
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info({ userId }, 'Password changed');
  }

  /**
   * Get current user profile by ID
   */
  async getCurrentUser(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatar: string | null;
    phone: string | null;
    timezone: string;
    locale: string;
    status: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
    account: {
      id: string;
      name: string;
      slug: string;
      plan: string;
    } | null;
    roles: Array<{ id: string; name: string }>;
    createdAt: Date;
    lastLoginAt: Date | null;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get account separately
    const account = user.accountId
      ? await prisma.account.findUnique({
        where: { id: user.accountId },
        select: { id: true, name: true, slug: true, plan: true },
      })
      : null;

    // Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      phone: user.phone,
      timezone: user.timezone,
      locale: user.locale,
      status: user.status,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      account,
      roles: userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
