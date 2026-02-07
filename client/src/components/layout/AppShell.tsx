import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export function AppShell() {
    const { isAuthenticated, isLoading } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Show loading state
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <p className="text-surface-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-surface-950">
            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main content area */}
            <div
                className={cn(
                    'transition-all duration-300',
                    isSidebarCollapsed ? 'ml-16' : 'ml-64'
                )}
            >
                {/* Header */}
                <Header />

                {/* Page content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
