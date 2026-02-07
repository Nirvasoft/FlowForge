import { post, get } from './client';
import { setTokens, clearTokens } from './client';
import type { User, AuthTokens, LoginCredentials, RegisterData } from '../types';

interface LoginResponse {
    user: User;
    tokens: AuthTokens;
}

interface RegisterResponse {
    user: {
        id: string;
        email: string;
    };
    account: {
        id: string;
        name: string;
    };
    tokens: AuthTokens;
}

/**
 * Register a new account and user
 */
export async function register(data: RegisterData): Promise<RegisterResponse> {
    const response = await post<RegisterResponse>('/auth/register', data);
    setTokens(response.tokens);
    return response;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await post<LoginResponse>('/auth/login', credentials);
    setTokens(response.tokens);
    return response;
}

/**
 * Logout current session
 */
export async function logout(): Promise<void> {
    try {
        await post('/auth/logout');
    } finally {
        clearTokens();
    }
}

/**
 * Logout from all sessions
 */
export async function logoutAll(): Promise<{ sessionsRevoked: number }> {
    const response = await post<{ sessionsRevoked: number }>('/auth/logout-all');
    clearTokens();
    return response;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
    return get<User>('/auth/me');
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<void> {
    await post('/auth/forgot-password', { email });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, password: string): Promise<void> {
    await post('/auth/reset-password', { token, password });
}

/**
 * Change password (authenticated)
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await post('/auth/change-password', { currentPassword, newPassword });
}
