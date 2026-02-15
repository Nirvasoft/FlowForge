/**
 * AppsPage - Lists all applications with CRUD actions
 * Enhanced with template gallery, rich app cards, and improved Create flow.
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
    Eye,
    Receipt,
    Users,
    Headphones,
    Kanban,
    Sparkles,
    ArrowRight,
    Clock,
    Layers,
    ChevronLeft,
} from 'lucide-react';
import { Button, Input, Card, Badge, Modal } from '../../components/ui';
import { cn } from '../../lib/utils';
import { listApps, createApp, deleteApp, publishApp, duplicateApp } from '../../api/apps';
import type { Application, AppType, AppStatus } from '../../types';

// ============================================================================
// App Templates
// ============================================================================

interface AppTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    type: AppType;
    gradient: string;
    tags: string[];
    pages: number;
}

const APP_TEMPLATES: AppTemplate[] = [
    {
        id: 'expense-management',
        name: 'Expense Management',
        description: 'Track and approve expense claims with automated routing and real-time status',
        icon: <Receipt className="w-6 h-6" />,
        type: 'internal',
        gradient: 'from-violet-500 to-purple-600',
        tags: ['Finance', 'Approvals'],
        pages: 3,
    },
    {
        id: 'employee-portal',
        name: 'Employee Portal',
        description: 'Self-service portal for leave management, directory, and HR resources',
        icon: <Users className="w-6 h-6" />,
        type: 'portal',
        gradient: 'from-sky-500 to-blue-600',
        tags: ['HR', 'Self-Service'],
        pages: 3,
    },
    {
        id: 'it-help-desk',
        name: 'IT Help Desk',
        description: 'Manage support tickets with SLA tracking, knowledge base, and routing',
        icon: <Headphones className="w-6 h-6" />,
        type: 'internal',
        gradient: 'from-orange-500 to-amber-600',
        tags: ['Support', 'IT'],
        pages: 2,
    },
    {
        id: 'customer-portal',
        name: 'Customer Portal',
        description: 'External-facing portal for customer support tickets and documentation',
        icon: <Globe className="w-6 h-6" />,
        type: 'portal',
        gradient: 'from-emerald-500 to-teal-600',
        tags: ['External', 'Support'],
        pages: 2,
    },
    {
        id: 'project-tracker',
        name: 'Project Tracker',
        description: 'Track projects, milestones, and team assignments with Kanban boards',
        icon: <Kanban className="w-6 h-6" />,
        type: 'internal',
        gradient: 'from-rose-500 to-pink-600',
        tags: ['Project Mgmt', 'Teams'],
        pages: 3,
    },
    {
        id: 'blank',
        name: 'Blank App',
        description: 'Start from scratch with a clean canvas and build whatever you need',
        icon: <Sparkles className="w-6 h-6" />,
        type: 'internal',
        gradient: 'from-slate-500 to-slate-600',
        tags: ['Flexible'],
        pages: 1,
    },
];

// ============================================================================
// Gradient map for app icon backgrounds
// ============================================================================

const APP_GRADIENTS = [
    'from-violet-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-orange-500 to-amber-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-cyan-500 to-teal-500',
    'from-fuchsia-500 to-pink-500',
];

function getAppGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return APP_GRADIENTS[Math.abs(hash) % APP_GRADIENTS.length];
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// Main Component
// ============================================================================

export function AppsPage() {
    const navigate = useNavigate();
    const [apps, setApps] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<AppType | ''>('');
    const [statusFilter, setStatusFilter] = useState<AppStatus | ''>('');

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState<'template' | 'details'>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);
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

    function openCreateModal(template?: AppTemplate) {
        if (template) {
            setSelectedTemplate(template);
            setNewAppName(template.id === 'blank' ? '' : template.name);
            setNewAppDescription(template.id === 'blank' ? '' : template.description);
            setNewAppType(template.type);
            setCreateStep('details');
        } else {
            setSelectedTemplate(null);
            setCreateStep('template');
        }
        setShowCreateModal(true);
    }

    function closeCreateModal() {
        setShowCreateModal(false);
        setSelectedTemplate(null);
        setNewAppName('');
        setNewAppDescription('');
        setNewAppType('internal');
        setCreateStep('template');
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
            closeCreateModal();
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
        const config: Record<AppStatus, { variant: 'success' | 'warning' | 'default'; label: string }> = {
            published: { variant: 'success', label: 'Published' },
            draft: { variant: 'warning', label: 'Draft' },
            archived: { variant: 'default', label: 'Archived' },
        };
        const { variant, label } = config[status];
        return <Badge variant={variant}>{label}</Badge>;
    }

    function getTypeIcon(type: AppType) {
        return type === 'portal' ? (
            <Globe className="w-5 h-5 text-white" />
        ) : (
            <Layout className="w-5 h-5 text-white" />
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
                <Button variant="primary" onClick={() => openCreateModal()}>
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

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : apps.length === 0 && !searchQuery && !typeFilter && !statusFilter ? (
                /* ── Template Gallery (Empty State) ── */
                <div className="space-y-6">
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center border border-primary-500/20">
                            <Sparkles className="w-8 h-8 text-primary-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-surface-100 mb-2">
                            Start Building
                        </h2>
                        <p className="text-surface-400 max-w-md mx-auto">
                            Choose a template to get started quickly, or create a blank app from scratch
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {APP_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => openCreateModal(template)}
                                className="group text-left p-5 rounded-xl border border-surface-700 bg-surface-800/50
                                           hover:border-surface-500 hover:bg-surface-800 transition-all duration-200
                                           hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5"
                            >
                                <div className="flex items-start gap-4 mb-3">
                                    <div className={cn(
                                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0',
                                        'shadow-lg transition-transform duration-200 group-hover:scale-110',
                                        template.gradient
                                    )}>
                                        {template.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-surface-100 group-hover:text-primary-400 transition-colors">
                                            {template.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-surface-500 capitalize">{template.type}</span>
                                            <span className="text-surface-700">·</span>
                                            <span className="text-xs text-surface-500">{template.pages} pages</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-surface-400 mb-3 line-clamp-2">
                                    {template.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                        {template.tags.map((tag) => (
                                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-700/60 text-surface-400">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-primary-400 transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : apps.length === 0 ? (
                /* ── No Results for Filters ── */
                <Card className="p-12 text-center">
                    <Search className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-surface-200 mb-2">No apps found</h3>
                    <p className="text-surface-400 mb-4">
                        Try adjusting your search or filters
                    </p>
                    <Button variant="ghost" onClick={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter(''); }}>
                        Clear Filters
                    </Button>
                </Card>
            ) : (
                /* ── App Cards Grid ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apps.map((app) => (
                        <Card
                            key={app.id}
                            className="group relative p-0 overflow-hidden hover:border-surface-500
                                       transition-all duration-200 cursor-pointer
                                       hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5"
                            onClick={() => navigate(`/apps/${app.id}/build`)}
                        >
                            {/* Gradient header strip */}
                            <div className={cn(
                                'h-1.5 bg-gradient-to-r',
                                app.status === 'published'
                                    ? getAppGradient(app.name)
                                    : 'from-surface-600 to-surface-700'
                            )} />

                            <div className="p-5">
                                {/* Top row: Icon + Name + Menu */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center',
                                            'shadow-md transition-transform duration-200 group-hover:scale-110',
                                            getAppGradient(app.name)
                                        )}>
                                            {getTypeIcon(app.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-surface-100 group-hover:text-primary-400 transition-colors">
                                                {app.name}
                                            </h3>
                                            <p className="text-xs text-surface-500 capitalize">{app.type} app</p>
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

                                {/* Description */}
                                {app.description && (
                                    <p className="text-sm text-surface-400 mb-4 line-clamp-2">
                                        {app.description}
                                    </p>
                                )}

                                {/* Footer: Status + Metadata */}
                                <div className="flex items-center justify-between pt-3 border-t border-surface-700/50">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(app.status)}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-surface-500">
                                        <span className="flex items-center gap-1">
                                            <Layers className="w-3 h-3" />
                                            {app.pages?.length || 0} pages
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {getRelativeTime(app.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Hover overlay with quick actions */}
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-surface-900/95 via-surface-900/80 to-transparent
                                            opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                            flex items-end justify-center gap-2 pointer-events-none group-hover:pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Button
                                    variant="primary"
                                    className="text-xs px-3 py-1.5 h-auto"
                                    onClick={() => navigate(`/apps/${app.id}/build`)}
                                >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                </Button>
                                {app.status === 'published' && (
                                    <Button
                                        variant="ghost"
                                        className="text-xs px-3 py-1.5 h-auto border border-surface-600"
                                        onClick={() => window.open(`/portal/${app.slug}`, '_blank')}
                                    >
                                        <Eye className="w-3 h-3 mr-1" />
                                        Preview
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Create App Modal ── */}
            <Modal
                isOpen={showCreateModal}
                onClose={closeCreateModal}
                title={createStep === 'template' ? 'Choose a Template' : 'Create New App'}
            >
                {createStep === 'template' ? (
                    /* Step 1: Template Selection */
                    <div className="space-y-4">
                        <p className="text-sm text-surface-400">
                            Pick a template to get started, or start from scratch
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                            {APP_TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        setSelectedTemplate(template);
                                        setNewAppName(template.id === 'blank' ? '' : template.name);
                                        setNewAppDescription(template.id === 'blank' ? '' : template.description);
                                        setNewAppType(template.type);
                                        setCreateStep('details');
                                    }}
                                    className="group text-left p-3 rounded-lg border border-surface-700 hover:border-primary-500/50
                                               hover:bg-primary-500/5 transition-all duration-150"
                                >
                                    <div className={cn(
                                        'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white mb-2',
                                        template.gradient
                                    )}>
                                        {template.icon}
                                    </div>
                                    <div className="font-medium text-sm text-surface-200 group-hover:text-primary-400 transition-colors">
                                        {template.name}
                                    </div>
                                    <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">
                                        {template.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Step 2: App Details */
                    <div className="space-y-4">
                        {selectedTemplate && selectedTemplate.id !== 'blank' && (
                            <button
                                onClick={() => setCreateStep('template')}
                                className="flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back to templates
                            </button>
                        )}

                        {selectedTemplate && selectedTemplate.id !== 'blank' && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700">
                                <div className={cn(
                                    'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white',
                                    selectedTemplate.gradient
                                )}>
                                    {selectedTemplate.icon}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-surface-200">
                                        {selectedTemplate.name} template
                                    </div>
                                    <div className="text-xs text-surface-500">
                                        {selectedTemplate.pages} pages · {selectedTemplate.type}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        'p-4 rounded-lg border text-left transition-all duration-150',
                                        newAppType === 'internal'
                                            ? 'border-primary-500 bg-primary-500/10 shadow-sm shadow-primary-500/20'
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
                                        'p-4 rounded-lg border text-left transition-all duration-150',
                                        newAppType === 'portal'
                                            ? 'border-primary-500 bg-primary-500/10 shadow-sm shadow-primary-500/20'
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
                            <Button variant="ghost" onClick={closeCreateModal}>
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
                )}
            </Modal>
        </div>
    );
}

// ============================================================================
// App Menu Dropdown
// ============================================================================

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
                className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onEdit();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700/70 flex items-center gap-2.5 transition-colors"
                        >
                            <Edit className="w-4 h-4 text-surface-400" />
                            Edit
                        </button>
                        {app.status === 'draft' && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onPublish();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700/70 flex items-center gap-2.5 transition-colors"
                            >
                                <Upload className="w-4 h-4 text-surface-400" />
                                Publish
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onDuplicate();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700/70 flex items-center gap-2.5 transition-colors"
                        >
                            <Copy className="w-4 h-4 text-surface-400" />
                            Duplicate
                        </button>
                        <div className="border-t border-surface-700 my-1" />
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onDelete();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
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
