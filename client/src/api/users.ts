import apiClient, { get, post, patch, del } from './client';
import type { User, PaginatedResponse } from '../types';

interface ListUsersParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    search?: string;
}

interface CreateUserData {
    email: string;
    firstName: string;
    lastName: string;
    roleIds?: string[];
}

interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    profile?: Record<string, unknown>;
}

/**
 * List users with pagination and filtering
 */
export async function listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);

    const response = await apiClient.get(`/users?${searchParams.toString()}`);
    const body = response.data;
    // Backend returns { success, data: [...users], pagination: { page, limit, total, totalPages, ... } }
    return {
        items: body.data || [],
        total: body.pagination?.total ?? 0,
        page: body.pagination?.page ?? 1,
        limit: body.pagination?.limit ?? 20,
        totalPages: body.pagination?.totalPages ?? 1,
    };
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User> {
    return get<User>(`/users/${id}`);
}

/**
 * Create a new user (invite)
 */
export async function createUser(data: CreateUserData): Promise<User> {
    return post<User>('/users', data);
}

/**
 * Update a user
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
    return patch<User>(`/users/${id}`, data);
}

/**
 * Update user status
 */
export async function updateUserStatus(id: string, status: User['status']): Promise<User> {
    return patch<User>(`/users/${id}/status`, { status });
}

/**
 * Assign roles to user
 */
export async function assignRoles(id: string, roleIds: string[]): Promise<User> {
    return post<User>(`/users/${id}/roles`, { roleIds });
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
    await del(`/users/${id}`);
}

/**
 * Resend invitation email
 */
export async function resendInvitation(id: string): Promise<void> {
    await post(`/users/${id}/invite`);
}
