import { useState } from 'react';
import { Users, Shield, Cloud } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui';
import { DirectorySyncSettings } from './DirectorySyncSettings';

type SettingsTab = 'profile' | 'security' | 'directory';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const tabs = [
        { id: 'profile' as const, label: 'Profile', icon: Users },
        { id: 'security' as const, label: 'Security', icon: Shield },
        { id: 'directory' as const, label: 'Directory Sync', icon: Cloud },
    ];

    return (
        <div className="space-y-6 animate-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-100">Settings</h1>
                <p className="mt-1 text-surface-400">Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-surface-700 pb-3">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && (
                <Card>
                    <CardHeader title="Profile" description="Your personal information" />
                    <CardContent>
                        <p className="text-surface-400">Profile settings coming soon...</p>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'security' && (
                <Card>
                    <CardHeader title="Security" description="Password and authentication" />
                    <CardContent>
                        <p className="text-surface-400">Security settings coming soon...</p>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'directory' && <DirectorySyncSettings />}
        </div>
    );
}
