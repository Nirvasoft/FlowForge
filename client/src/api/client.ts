import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError, AuthTokens } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Token management
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export function setTokens(tokens: AuthTokens) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function clearTokens() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

export function getAccessToken(): string | null {
    return accessToken;
}

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config) => {
        if (accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // If 401 and we have refresh token, try to refresh
        if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const response = await axios.post<ApiResponse<AuthTokens>>(
                    `${API_BASE_URL}/auth/refresh`,
                    { refreshToken }
                );

                setTokens(response.data.data);

                // Retry original request with new token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                return apiClient(originalRequest);
            } catch {
                // Refresh failed, clear tokens and redirect to login
                clearTokens();
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

// Export the configured client
export default apiClient;

// Helper functions
export async function get<T>(url: string): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(url);
    return response.data.data;
}

export async function post<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(url, data);
    return response.data.data;
}

export async function put<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(url, data);
    return response.data.data;
}

export async function patch<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await apiClient.patch<ApiResponse<T>>(url, data);
    return response.data.data;
}

export async function del<T>(url: string): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(url);
    return response.data.data;
}
