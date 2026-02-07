import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, RegisterData } from '../types';
import * as authApi from '../api/auth';
import { getAccessToken, clearTokens } from '../api/client';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is authenticated on mount
    useEffect(() => {
        const token = getAccessToken();
        if (token) {
            authApi.getCurrentUser()
                .then(setUser)
                .catch(() => {
                    clearTokens();
                    setUser(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authApi.login({ email, password });
        setUser(response.user);
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        await authApi.register(data);
        // After registration, get the full user profile
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
    }, []);

    const logout = useCallback(async () => {
        await authApi.logout();
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
