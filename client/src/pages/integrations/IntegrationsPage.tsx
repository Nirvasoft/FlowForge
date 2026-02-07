/**
 * IntegrationsPage - Manage connectors, connections, and webhooks
 */

import { useState, useEffect } from 'react';
import {
    Plus,
    Plug,
    Link2,
    Webhook as WebhookIcon,
    MoreVertical,
    Trash2,
    Power,
    PowerOff,
    RefreshCw,
    CheckCircle,
    Loader2,
    Copy,
    Key,
    Globe,
    Database,
    Mail,
    Settings,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import {
    listTemplates,
    listConnectors,
    createConnector,
    deleteConnector,
    testConnector,
    listConnections,
    deleteConnection,
    testConnection,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    enableWebhook,
    disableWebhook,
    regenerateSecret,
} from '../../api/integrations';
import type { Connector, ConnectorTemplate, Connection, Webhook as WebhookType, ConnectorType } from '../../types';

const CONNECTOR_ICONS: Record<ConnectorType, React.ComponentType<{ className?: string }>> = {
    rest: Globe,
    graphql: Globe,
    soap: Globe,
    database: Database,
    file: Database,
    email: Mail,
    custom: Settings,
};

type Tab = 'connectors' | 'connections' | 'webhooks';

export function IntegrationsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('connectors');

    const tabs = [
        { id: 'connectors' as Tab, label: 'Connectors', icon: Plug },
        { id: 'connections' as Tab, label: 'Connections', icon: Link2 },
        { id: 'webhooks' as Tab, label: 'Webhooks', icon: WebhookIcon },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-surface-100">Integrations</h1>
                <p className="text-surface-400 mt-1">Connect to external services, APIs, and webhooks</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-surface-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                            activeTab === tab.id
                                ? 'border-primary-500 text-primary-400'
                                : 'border-transparent text-surface-400 hover:text-surface-200'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'connectors' && <ConnectorsTab />}
            {activeTab === 'connections' && <ConnectionsTab />}
            {activeTab === 'webhooks' && <WebhooksTab />}
        </div>
    );
}

// ============================================================================
// Connectors Tab
// ============================================================================

function ConnectorsTab() {
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [templates, setTemplates] = useState<ConnectorTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [connectorsRes, templatesRes] = await Promise.all([
                    listConnectors(),
                    listTemplates(),
                ]);
                setConnectors(connectorsRes.connectors || []);
                setTemplates(templatesRes.templates || []);
            } catch (error) {
                console.error('Failed to load connectors:', error);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleCreateFromTemplate = async (template: ConnectorTemplate) => {
        try {
            const connector = await createConnector({
                name: `${template.name} Connector`,
                type: template.type,
                provider: template.provider,
                baseUrl: template.baseUrl,
                authType: template.authType,
                operations: template.operations,
                enabled: true,
            });
            setConnectors((prev) => [...prev, connector]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create connector:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this connector?')) return;
        try {
            await deleteConnector(id);
            setConnectors((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            console.error('Failed to delete connector:', error);
        }
    };

    const handleTest = async (id: string) => {
        try {
            const result = await testConnector(id);
            alert(result.success ? 'Connection successful!' : `Failed: ${result.message}`);
        } catch (error) {
            console.error('Test failed:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-surface-400">{connectors.length} configured connectors</p>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Connector
                </Button>
            </div>

            {connectors.length === 0 ? (
                <div className="text-center py-16 bg-surface-900 border border-surface-700 rounded-lg">
                    <Plug className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No connectors yet</h3>
                    <p className="text-surface-500 mb-6">Add connectors to integrate with external APIs</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Connector
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connectors.map((connector) => {
                        const Icon = CONNECTOR_ICONS[connector.type] || Globe;
                        return (
                            <div
                                key={connector.id}
                                className="bg-surface-900 border border-surface-700 rounded-lg p-4 hover:border-surface-600 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-primary-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-surface-100 font-medium">{connector.name}</h4>
                                            <p className="text-surface-500 text-xs">{connector.provider}</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveMenu(activeMenu === connector.id ? null : connector.id)}
                                            className="p-1 rounded hover:bg-surface-700 text-surface-400"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                        {activeMenu === connector.id && (
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-600 rounded-lg shadow-lg z-10">
                                                <button
                                                    onClick={() => { handleTest(connector.id); setActiveMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Test
                                                </button>
                                                <button
                                                    onClick={() => { handleDelete(connector.id); setActiveMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={cn(
                                        'px-2 py-0.5 rounded',
                                        connector.enabled ? 'bg-green-500/20 text-green-400' : 'bg-surface-600/20 text-surface-400'
                                    )}>
                                        {connector.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <span className="text-surface-500">{connector.operations.length} operations</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold text-surface-100 mb-6">Add Connector</h2>
                        <p className="text-surface-400 mb-4">Choose a template to get started</p>
                        <div className="grid grid-cols-2 gap-3">
                            {templates.map((template) => {
                                const Icon = CONNECTOR_ICONS[template.type] || Globe;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => handleCreateFromTemplate(template)}
                                        className="flex items-center gap-3 p-4 bg-surface-800 border border-surface-600 rounded-lg hover:border-primary-500 text-left transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-primary-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-surface-100 font-medium">{template.name}</h4>
                                            <p className="text-surface-500 text-xs">{template.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-end mt-6">
                            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Connections Tab
// ============================================================================

function ConnectionsTab() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const result = await listConnections();
                setConnections(result.connections || []);
            } catch (error) {
                console.error('Failed to load connections:', error);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this connection?')) return;
        try {
            await deleteConnection(id);
            setConnections((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            console.error('Failed to delete connection:', error);
        }
    };

    const handleTest = async (id: string) => {
        try {
            const result = await testConnection(id);
            alert(result.success ? 'Connection successful!' : `Failed: ${result.message}`);
        } catch (error) {
            console.error('Test failed:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const statusColors = {
        active: 'bg-green-500/20 text-green-400',
        inactive: 'bg-surface-500/20 text-surface-400',
        error: 'bg-red-500/20 text-red-400',
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-surface-400">{connections.length} active connections</p>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Connection
                </Button>
            </div>

            {connections.length === 0 ? (
                <div className="text-center py-16 bg-surface-900 border border-surface-700 rounded-lg">
                    <Link2 className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No connections yet</h3>
                    <p className="text-surface-500">Add a connector first, then create connections</p>
                </div>
            ) : (
                <div className="bg-surface-900 border border-surface-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-surface-800/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Name</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Last Used</th>
                                <th className="w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700">
                            {connections.map((conn) => (
                                <tr key={conn.id} className="hover:bg-surface-800/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Key className="w-4 h-4 text-surface-500" />
                                            <span className="text-surface-200">{conn.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-0.5 rounded text-xs', statusColors[conn.status])}>
                                            {conn.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-surface-500 text-sm">
                                        {conn.lastUsed ? new Date(conn.lastUsed).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleTest(conn.id)}
                                                className="p-1 rounded hover:bg-surface-700 text-surface-400"
                                                title="Test"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(conn.id)}
                                                className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Webhooks Tab
// ============================================================================

function WebhooksTab() {
    const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const result = await listWebhooks();
                setWebhooks(result.webhooks || []);
            } catch (error) {
                console.error('Failed to load webhooks:', error);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleCreate = async (name: string, targetType: string) => {
        try {
            const webhook = await createWebhook({
                name,
                targetType: targetType as WebhookType['targetType'],
                events: [],
                enabled: true,
            });
            setWebhooks((prev) => [...prev, webhook]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create webhook:', error);
        }
    };

    const handleToggle = async (webhook: WebhookType) => {
        try {
            const updated = webhook.enabled
                ? await disableWebhook(webhook.id)
                : await enableWebhook(webhook.id);
            setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        } catch (error) {
            console.error('Failed to toggle webhook:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this webhook?')) return;
        try {
            await deleteWebhook(id);
            setWebhooks((prev) => prev.filter((w) => w.id !== id));
        } catch (error) {
            console.error('Failed to delete webhook:', error);
        }
    };

    const handleRegenerateSecret = async (id: string) => {
        if (!confirm('Regenerate secret? The old secret will stop working.')) return;
        try {
            const result = await regenerateSecret(id);
            alert(`New secret: ${result.secret}`);
            // Reload to update
            const refreshed = await listWebhooks();
            setWebhooks(refreshed.webhooks || []);
        } catch (error) {
            console.error('Failed to regenerate secret:', error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-surface-400">{webhooks.length} webhooks</p>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Webhook
                </Button>
            </div>

            {webhooks.length === 0 ? (
                <div className="text-center py-16 bg-surface-900 border border-surface-700 rounded-lg">
                    <WebhookIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No webhooks yet</h3>
                    <p className="text-surface-500 mb-6">Create webhooks to receive events from external services</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Webhook
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {webhooks.map((webhook) => (
                        <div
                            key={webhook.id}
                            className="bg-surface-900 border border-surface-700 rounded-lg p-4"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        'w-10 h-10 rounded-lg flex items-center justify-center',
                                        webhook.enabled ? 'bg-green-500/20' : 'bg-surface-600/20'
                                    )}>
                                        <WebhookIcon className={cn('w-5 h-5', webhook.enabled ? 'text-green-400' : 'text-surface-400')} />
                                    </div>
                                    <div>
                                        <h4 className="text-surface-100 font-medium">{webhook.name}</h4>
                                        <p className="text-surface-500 text-xs">
                                            Target: {webhook.targetType}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggle(webhook)}
                                        className={cn(
                                            'p-2 rounded transition-colors',
                                            webhook.enabled
                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                : 'bg-surface-700 text-surface-400 hover:bg-surface-600'
                                        )}
                                        title={webhook.enabled ? 'Disable' : 'Enable'}
                                    >
                                        {webhook.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleRegenerateSecret(webhook.id)}
                                        className="p-2 rounded bg-surface-700 text-surface-400 hover:bg-surface-600"
                                        title="Regenerate Secret"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="p-2 rounded bg-surface-700 text-surface-400 hover:text-red-400"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-surface-800 rounded-lg p-3 flex items-center justify-between">
                                <code className="text-xs text-surface-300 truncate">
                                    {webhook.url}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(webhook.url)}
                                    className="ml-2 p-1 rounded hover:bg-surface-700 text-surface-400"
                                    title="Copy URL"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateWebhookModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}

function CreateWebhookModal({
    onClose,
    onCreate,
}: {
    onClose: () => void;
    onCreate: (name: string, targetType: string) => void;
}) {
    const [name, setName] = useState('');
    const [targetType, setTargetType] = useState('workflow');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold text-surface-100 mb-6">Create Webhook</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-surface-400 mb-1.5">Webhook Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., GitHub Push Events"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-surface-400 mb-1.5">Target Type</label>
                        <select
                            value={targetType}
                            onChange={(e) => setTargetType(e.target.value)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-200"
                        >
                            <option value="workflow">Workflow</option>
                            <option value="form">Form</option>
                            <option value="app">App</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onCreate(name, targetType)} disabled={!name.trim()}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create
                    </Button>
                </div>
            </div>
        </div>
    );
}
