import { useState, useEffect } from 'react';
import { RefreshCw, Cloud, CloudOff, CheckCircle, AlertTriangle, Users, Building2, Shield, Save } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardContent, Badge } from '../../components/ui';

interface DirectorySyncConfig {
    enabled: boolean;
    provider: 'azure_ad' | 'google' | 'okta' | 'ldap' | null;
    tenantId: string;
    clientId: string;
    syncInterval: number; // in hours
    lastSync: string | null;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    syncedUsers: number;
    syncedGroups: number;
    autoProvision: boolean;
    autoDeprovision: boolean;
}

const defaultConfig: DirectorySyncConfig = {
    enabled: false,
    provider: null,
    tenantId: '',
    clientId: '',
    syncInterval: 24,
    lastSync: null,
    syncStatus: 'idle',
    syncedUsers: 0,
    syncedGroups: 0,
    autoProvision: true,
    autoDeprovision: false,
};

export function DirectorySyncSettings() {
    const [config, setConfig] = useState<DirectorySyncConfig>(defaultConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Mock initial load
    useEffect(() => {
        setTimeout(() => {
            setConfig({
                ...defaultConfig,
                enabled: true,
                provider: 'azure_ad',
                tenantId: 'example-tenant-id',
                clientId: 'example-client-id',
                syncInterval: 12,
                lastSync: '2024-01-25T10:30:00Z',
                syncStatus: 'success',
                syncedUsers: 156,
                syncedGroups: 12,
            });
        }, 500);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setConfig(prev => ({ ...prev, syncStatus: 'syncing' }));

        await new Promise(resolve => setTimeout(resolve, 2000));

        setConfig(prev => ({
            ...prev,
            syncStatus: 'success',
            lastSync: new Date().toISOString(),
            syncedUsers: prev.syncedUsers + Math.floor(Math.random() * 5),
        }));
        setIsSyncing(false);
    };

    const getProviderLabel = (provider: string | null) => {
        switch (provider) {
            case 'azure_ad': return 'Microsoft Entra ID (Azure AD)';
            case 'google': return 'Google Workspace';
            case 'okta': return 'Okta';
            case 'ldap': return 'LDAP/Active Directory';
            default: return 'Not configured';
        }
    };

    const getSyncStatusBadge = () => {
        switch (config.syncStatus) {
            case 'syncing':
                return <Badge variant="info"><RefreshCw className="h-3 w-3 animate-spin" /> Syncing...</Badge>;
            case 'success':
                return <Badge variant="success"><CheckCircle className="h-3 w-3" /> Synced</Badge>;
            case 'error':
                return <Badge variant="error"><AlertTriangle className="h-3 w-3" /> Error</Badge>;
            default:
                return <Badge variant="warning">Not synced</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <Card>
                <CardHeader
                    title="Directory Sync"
                    description="Synchronize users and groups from your identity provider"
                />
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-800/50">
                        <div className="flex items-center gap-4">
                            {config.enabled ? (
                                <div className="p-3 rounded-full bg-green-500/20 text-green-400">
                                    <Cloud className="h-6 w-6" />
                                </div>
                            ) : (
                                <div className="p-3 rounded-full bg-surface-700 text-surface-400">
                                    <CloudOff className="h-6 w-6" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-surface-100">
                                    {config.enabled ? getProviderLabel(config.provider) : 'Directory Sync Disabled'}
                                </p>
                                <p className="text-sm text-surface-400">
                                    {config.lastSync
                                        ? `Last synced: ${new Date(config.lastSync).toLocaleString()}`
                                        : 'Never synced'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {getSyncStatusBadge()}
                            <Button
                                variant="secondary"
                                onClick={handleSync}
                                isLoading={isSyncing}
                                disabled={!config.enabled}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Sync Now
                            </Button>
                        </div>
                    </div>

                    {/* Stats */}
                    {config.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-primary-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-surface-100">{config.syncedUsers}</p>
                                        <p className="text-sm text-surface-400">Users synced</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700">
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-blue-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-surface-100">{config.syncedGroups}</p>
                                        <p className="text-sm text-surface-400">Groups synced</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card>
                <CardHeader title="Configuration" description="Set up your identity provider connection" />
                <CardContent className="space-y-6">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-surface-200">Enable Directory Sync</p>
                            <p className="text-sm text-surface-400">Automatically sync users and groups</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>

                    {config.enabled && (
                        <>
                            {/* Provider Selection */}
                            <div>
                                <label className="block text-sm font-medium text-surface-200 mb-2">Identity Provider</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'azure_ad', label: 'Microsoft Entra ID', icon: Shield },
                                        { id: 'google', label: 'Google Workspace', icon: Cloud },
                                        { id: 'okta', label: 'Okta', icon: Shield },
                                        { id: 'ldap', label: 'LDAP/AD', icon: Building2 },
                                    ].map((provider) => {
                                        const Icon = provider.icon;
                                        return (
                                            <button
                                                key={provider.id}
                                                onClick={() => setConfig({ ...config, provider: provider.id as DirectorySyncConfig['provider'] })}
                                                className={`p-3 rounded-lg border text-left transition-colors ${config.provider === provider.id
                                                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                                    : 'border-surface-700 text-surface-300 hover:border-surface-600'
                                                    }`}
                                            >
                                                <Icon className="h-5 w-5 mb-2" />
                                                <p className="font-medium text-sm">{provider.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Connection Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tenant ID"
                                    placeholder="Enter tenant ID"
                                    value={config.tenantId}
                                    onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                                />
                                <Input
                                    label="Client ID"
                                    placeholder="Enter client ID"
                                    value={config.clientId}
                                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                                />
                            </div>

                            {/* Sync Interval */}
                            <div>
                                <label className="block text-sm font-medium text-surface-200 mb-2">Sync Interval</label>
                                <select
                                    value={config.syncInterval}
                                    onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-primary-500"
                                >
                                    <option value={1}>Every hour</option>
                                    <option value={6}>Every 6 hours</option>
                                    <option value={12}>Every 12 hours</option>
                                    <option value={24}>Every 24 hours</option>
                                </select>
                            </div>

                            {/* Auto-provisioning */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                                    <div>
                                        <p className="text-sm font-medium text-surface-200">Auto-provision users</p>
                                        <p className="text-xs text-surface-400">Automatically create new users from directory</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.autoProvision}
                                            onChange={(e) => setConfig({ ...config, autoProvision: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-surface-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                                    <div>
                                        <p className="text-sm font-medium text-surface-200">Auto-deprovision users</p>
                                        <p className="text-xs text-surface-400">Automatically disable removed users</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.autoDeprovision}
                                            onChange={(e) => setConfig({ ...config, autoDeprovision: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-surface-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-surface-700">
                        <Button onClick={handleSave} isLoading={isSaving}>
                            <Save className="h-4 w-4" />
                            Save Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default DirectorySyncSettings;
