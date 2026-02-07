import type { User, Account, Role, Permission } from '@prisma/client';

/**
 * Authenticated user context attached to requests
 */
export interface AuthUser {
  id: string;
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  permissions: string[];
}

/**
 * Extended FastifyRequest with auth context
 */
declare module 'fastify' {
  interface FastifyRequest {
    accountId?: string;
  }
}

/**
 * JWT payload types
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      accountId: string;
      email: string;
      type: 'access' | 'refresh';
      sessionId?: string;
    };
    user: AuthUser;
  }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Standard API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

/**
 * User with relations
 */
export interface UserWithRelations extends User {
  account?: Account;
  roleAssignments?: Array<{
    role: Role & {
      permissions: Array<{
        permission: Permission;
      }>;
    };
  }>;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  roleIds?: string[];
  groupIds?: string[];
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  avatar?: string;
  preferences?: Record<string, unknown>;
  notificationPrefs?: Record<string, unknown>;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration input
 */
export interface RegisterInput {
  accountName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * OAuth profile from provider
 */
export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}
