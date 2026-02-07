import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { hashPassword } from '../utils/password.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  PaginatedResponse,
} from '../types/index.js';
import type { User, UserStatus } from '@prisma/client';

const logger = createLogger('user-service');

/**
 * User service for managing users within an account
 */
export class UserService {
  /**
   * List users with pagination
   */
  async listUsers(
    accountId: string,
    params: PaginationParams & { status?: UserStatus; search?: string }
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, search } = params;
    const skip = (page - 1) * limit;

    const where = {
      accountId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users as User[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(accountId: string, userId: string): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
      include: {
        roleAssignments: {
          include: {
            role: true,
          },
        },
        groupMemberships: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Create a new user
   */
  async createUser(
    accountId: string,
    input: CreateUserInput,
    createdBy: string
  ): Promise<User> {
    // Check if email already exists in account
    const existingUser = await prisma.user.findFirst({
      where: { accountId, email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Hash password if provided
    const passwordHash = input.password ? await hashPassword(input.password) : null;

    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          accountId,
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? null,
          timezone: input.timezone ?? 'UTC',
          locale: input.locale ?? 'en',
          status: passwordHash ? 'ACTIVE' : 'PENDING',
          createdBy,
        },
      });

      // Assign roles
      if (input.roleIds?.length) {
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: newUser.id,
            roleId,
            createdBy,
          })),
        });
      }

      // Add to groups
      if (input.groupIds?.length) {
        await tx.groupMember.createMany({
          data: input.groupIds.map((groupId) => ({
            userId: newUser.id,
            groupId,
            createdBy,
          })),
        });
      }

      return newUser;
    });

    logger.info({ userId: user.id, accountId }, 'User created');

    return user;
  }

  /**
   * Update user
   */
  async updateUser(
    accountId: string,
    userId: string,
    input: UpdateUserInput
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.displayName !== undefined && { displayName: input.displayName ?? null }),
        ...(input.phone !== undefined && { phone: input.phone ?? null }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.locale !== undefined && { locale: input.locale }),
        ...(input.avatar !== undefined && { avatar: input.avatar ?? null }),
        ...(input.preferences !== undefined && { preferences: input.preferences as Prisma.InputJsonValue }),
        ...(input.notificationPrefs !== undefined && { notificationPrefs: input.notificationPrefs as Prisma.InputJsonValue }),
      },
    });

    logger.info({ userId, accountId }, 'User updated');

    return updatedUser;
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    accountId: string,
    userId: string,
    status: UserStatus
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // If suspending/deactivating, invalidate sessions
    if (status === 'SUSPENDED' || status === 'INACTIVE') {
      await prisma.session.deleteMany({
        where: { userId },
      });
    }

    logger.info({ userId, accountId, status }, 'User status updated');

    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(accountId: string, userId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info({ userId, accountId }, 'User deleted');
  }

  /**
   * Assign roles to user
   */
  async assignRoles(
    accountId: string,
    userId: string,
    roleIds: string[],
    assignedBy: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify roles belong to account
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds }, accountId },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestError('Some roles are invalid');
    }

    // Remove existing roles and add new ones
    await prisma.$transaction([
      prisma.userRole.deleteMany({
        where: { userId },
      }),
      prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
          createdBy: assignedBy,
        })),
      }),
    ]);

    logger.info({ userId, roleIds }, 'User roles updated');
  }

  /**
   * Add user to groups
   */
  async addToGroups(
    accountId: string,
    userId: string,
    groupIds: string[],
    addedBy: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify groups belong to account
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds }, accountId },
    });

    if (groups.length !== groupIds.length) {
      throw new BadRequestError('Some groups are invalid');
    }

    // Add to groups (ignore duplicates)
    await prisma.groupMember.createMany({
      data: groupIds.map((groupId) => ({
        userId,
        groupId,
        createdBy: addedBy,
      })),
      skipDuplicates: true,
    });

    logger.info({ userId, groupIds }, 'User added to groups');
  }

  /**
   * Remove user from groups
   */
  async removeFromGroups(
    accountId: string,
    userId: string,
    groupIds: string[]
  ): Promise<void> {
    await prisma.groupMember.deleteMany({
      where: {
        userId,
        groupId: { in: groupIds },
        group: { accountId },
      },
    });

    logger.info({ userId, groupIds }, 'User removed from groups');
  }
}

export const userService = new UserService();
