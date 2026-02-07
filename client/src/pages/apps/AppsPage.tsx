/**
 * AppsPage - Lists all applications with CRUD actions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Copy,
    Trash2,
    Globe,
    Layout,
    Loader2,
    Upload,
    Download,
} from 'lucide-react';
import { Button, Input, Card, Badge, Modal } from '../../components/ui';
import { cn } from '../../lib/utils';
import { listApps, createApp, deleteApp, publishApp, duplicateApp } from '../../api/apps';
import type { Application, AppType, AppStatus } from '../../types';

export function AppsPage() {
    const navigate = useNavigate();
    const [apps, setApps] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<AppType | ''>('');
    const [statusFilter, setStatusFilter] = useState<AppStatus | ''>('');

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAppName, setNewAppName] = useState('');
    const [newAppDescription, setNewAppDescription] = useState('');
    const [newAppType, setNewAppType] = useState<AppType>('internal');
    const [isCreating, setIsCreating] = useState(false);

    // Load apps
    useEffect(() => {
        loadApps();
    }, [searchQuery, typeFilter, statusFilter]);

    async function loadApps() {
        setIsLoading(true);
        try {
            const response = await listApps({
                search: searchQuery || undefined,
                type: typeFilter || undefined,
                status: statusFilter || undefined,
            });
            setApps(response.apps);
        } catch (error) {
            console.error('Failed to load apps:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateApp() {
        if (!newAppName.trim()) return;

        setIsCreating(true);
        try {
            const app = await createApp({
                name: newAppName,
                description: newAppDescription,
                type: newAppType,
            });
            setShowCreateModal(false);
            setNewAppName('');
            setNewAppDescription('');
            navigate(`/apps/${app.id}/build`);
        } catch (error) {
            console.error('Failed to create app:', error);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDeleteApp(id: string) {
        if (!confirm('Are you sure you want to delete this app?')) return;
        try {
            await deleteApp(id);
            setApps(apps.filter((a) => a.id !== id));
        } catch (error) {
            console.error('Failed to delete app:', error);
        }
    }

    async function handlePublishApp(id: string) {
        try {
            const updated = await publishApp(id);
            setApps(apps.map((a) => (a.id === id ? updated : a)));
        } catch (error) {
            console.error('Failed to publish app:', error);
        }
    }

    async function handleDuplicateApp(id: string, name: string) {
        try {
            const duplicated = await duplicateApp(id, `${name} (Copy)`);
            setApps([duplicated, ...apps]);
        } catch (error) {
            console.error('Failed to duplicate app:', error);
        }
    }

    function getStatusBadge(status: AppStatus) {
        const variants: Record<AppStatus, 'success' | 'warning' | 'default'> = {
            published: 'success',
            draft: 'warning',
            archived: 'default',
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
    }

    function getTypeIcon(type: AppType) {
        return type === 'portal' ? (
            <Globe className="w-4 h-4 text-blue-400" />
        ) : (
            <Layout className="w-4 h-4 text-indigo-400" />
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Apps</h1>
                    <p className="text-surface-400 mt-1">Build internal applications and portals</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create App
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <Input
                        placeholder="Search apps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as AppType | '')}
                    className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-200 text-sm"
                >
                    <option value="">All Types</option>
                    <option value="internal">Internal</option>
                    <option value="portal">Portal</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AppStatus | '')}
                    className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-200 text-sm"
                >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Apps Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : apps.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
                        <Layout className="w-8 h-8 text-surface-500" />
                    </div>
                    <h3 className="text-lg font-medium text-surface-200 mb-2">No apps yet</h3>
                    <p className="text-surface-400 mb-4">
                        Create your first app to start building
                    </p>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create App
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apps.map((app) => (
                        <Card
                            key={app.id}
                            className="p-4 hover:border-surface-600 transition-colors cursor-pointer group"
                            onClick={() => navigate(`/apps/${app.id}/build`)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                        {getTypeIcon(app.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-surface-100 group-hover:text-primary-400 transition-colors">
                                            {app.name}
                                        </h3>
                                        <p className="text-sm text-surface-500 capitalize">{app.type}</p>
                                    </div>
                                </div>
                                <div
                                    className="relative"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <AppMenu
                                        app={app}
                                        onEdit={() => navigate(`/apps/${app.id}/build`)}
                                        onPublish={() => handlePublishApp(app.id)}
                                        onDuplicate={() => handleDuplicateApp(app.id, app.name)}
                                        onDelete={() => handleDeleteApp(app.id)}
                                    />
                                </div>
                            </div>

                            {app.description && (
                                <p className="text-sm text-surface-400 mb-3 line-clamp-2">
                                    {app.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between">
                                {getStatusBadge(app.status)}
                                <span className="text-xs text-surface-500">
                                    {app.pages.length} page{app.pages.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create App Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create New App"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1">
                            App Name
                        </label>
                        <Input
                            placeholder="My App"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1">
                            Description (optional)
                        </label>
                        <Input
                            placeholder="Brief description..."
                            value={newAppDescription}
                            onChange={(e) => setNewAppDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1">
                            App Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setNewAppType('internal')}
                                className={cn(
                                    'p-4 rounded-lg border text-left transition-colors',
                                    newAppType === 'internal'
                                        ? 'border-primary-500 bg-primary-500/10'
                                        : 'border-surface-700 hover:border-surface-600'
                                )}
                            >
                                <Layout className="w-5 h-5 text-indigo-400 mb-2" />
                                <div className="font-medium text-surface-200">Internal App</div>
                                <div className="text-xs text-surface-500">For internal users</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewAppType('portal')}
                                className={cn(
                                    'p-4 rounded-lg border text-left transition-colors',
                                    newAppType === 'portal'
                                        ? 'border-primary-500 bg-primary-500/10'
                                        : 'border-surface-700 hover:border-surface-600'
                                )}
                            >
                                <Globe className="w-5 h-5 text-blue-400 mb-2" />
                                <div className="font-medium text-surface-200">Portal</div>
                                <div className="text-xs text-surface-500">External-facing site</div>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateApp}
                            disabled={!newAppName.trim() || isCreating}
                        >
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Create App
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// App Menu Dropdown
interface AppMenuProps {
    app: Application;
    onEdit: () => void;
    onPublish: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

function AppMenu({ app, onEdit, onPublish, onDuplicate, onDelete }: AppMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-700 rounded-lg shadow-lg z-20 overflow-hidden">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onEdit();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700 flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                        {app.status === 'draft' && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onPublish();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700 flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Publish
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onDuplicate();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700 flex items-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            Duplicate
                        </button>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onDelete();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-surface-700 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
