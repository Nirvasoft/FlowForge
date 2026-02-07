import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreHorizontal,
    GitBranch,
    Edit,
    Trash2,
    Play,
    Pause,
    Archive,
    Eye,
    CheckCircle,
    Clock,
    AlertCircle,
    XCircle
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardContent,
    Badge,
    Modal,
    ModalFooter
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { listProcesses, listTasks, listAllInstances, createProcess, updateProcess, deleteProcess } from '../../api/workflows';
import type { Process, ProcessInstance, Task } from '../../types';

const processStatusVariants: Record<Process['status'], 'success' | 'warning' | 'info' | 'error'> = {
    ACTIVE: 'success',
    DRAFT: 'warning',
    DEPRECATED: 'error',
    ARCHIVED: 'info',
};

const instanceStatusIcons: Record<ProcessInstance['status'], React.ReactNode> = {
    RUNNING: <Clock className="h-4 w-4 text-blue-400" />,
    COMPLETED: <CheckCircle className="h-4 w-4 text-green-400" />,
    FAILED: <XCircle className="h-4 w-4 text-red-400" />,
    CANCELLED: <XCircle className="h-4 w-4 text-surface-400" />,
    SUSPENDED: <Pause className="h-4 w-4 text-yellow-400" />,
};

type TabType = 'processes' | 'instances' | 'tasks';

export function WorkflowsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('processes');
    const [processes, setProcesses] = useState<Process[]>([]);
    const [instances, setInstances] = useState<ProcessInstance[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProcess, setEditingProcess] = useState<Process | null>(null);
    const [deletingProcess, setDeletingProcess] = useState<Process | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Load processes from API
    const loadProcesses = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listProcesses({
                status: statusFilter !== 'all' ? statusFilter as Process['status'] : undefined,
                search: searchQuery || undefined,
            });
            setProcesses(response.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load workflows');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchQuery]);

    // Load tasks from API
    const loadTasks = useCallback(async () => {
        try {
            const response = await listTasks({
                status: statusFilter !== 'all' ? statusFilter as Task['status'] : undefined,
            });
            setTasks(response.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tasks');
        }
    }, [statusFilter]);

    // Load instances from API
    const loadInstances = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listAllInstances({
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
            setInstances(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load instances');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        if (activeTab === 'processes') {
            loadProcesses();
        } else if (activeTab === 'tasks') {
            loadTasks();
        } else if (activeTab === 'instances') {
            loadInstances();
        } else {
            setIsLoading(false);
        }
    }, [activeTab, loadProcesses, loadTasks, loadInstances]);

    // Close dropdown
    useEffect(() => {
        const handleClick = () => setOpenDropdown(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Filter processes (client-side for additional filtering)
    const filteredProcesses = processes.filter((proc) => {
        const matchesSearch =
            proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            proc.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || proc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Filter tasks
    const filteredTasks = tasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCreate = useCallback(async (processData: { name: string; description?: string }) => {
        try {
            const newProcess = await createProcess(processData);
            setProcesses(prev => [...prev, newProcess]);
            setIsCreateModalOpen(false);
        } catch (err) {
            throw err;
        }
    }, []);

    const handleUpdate = useCallback(async (processId: string, processData: { name?: string; description?: string; status?: Process['status'] }) => {
        try {
            const updatedProcess = await updateProcess(processId, processData);
            setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));
            setEditingProcess(null);
        } catch (err) {
            throw err;
        }
    }, []);

    const handleDelete = useCallback(async () => {
        if (deletingProcess) {
            try {
                await deleteProcess(deletingProcess.id);
                setProcesses(prev => prev.filter(p => p.id !== deletingProcess.id));
                setDeletingProcess(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete workflow');
            }
        }
    }, [deletingProcess]);

    const handleStatusChange = useCallback(async (processId: string, newStatus: Process['status']) => {
        try {
            const updatedProcess = await updateProcess(processId, { status: newStatus });
            setProcesses(prev => prev.map(p => p.id === processId ? updatedProcess : p));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update status');
        }
        setOpenDropdown(null);
    }, []);

    const getInstanceCount = (processId: string) => {
        return instances.filter(i => i.processId === processId && i.status === 'RUNNING').length;
    };

    const tabs: { id: TabType; label: string; count?: number }[] = [
        { id: 'processes', label: 'Workflows', count: processes.length },
        { id: 'instances', label: 'Running', count: instances.filter(i => i.status === 'RUNNING').length },
        { id: 'tasks', label: 'My Tasks', count: tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length },
    ];

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Workflows</h1>
                    <p className="mt-1 text-surface-400">Design and automate business processes</p>
                </div>
                <Button onClick={() => navigate('/workflows/new/design')}>
                    <Plus className="h-4 w-4" />
                    Create Workflow
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-surface-800/50 rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setStatusFilter('all');
                            setSearchQuery('');
                        }}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                            activeTab === tab.id
                                ? 'bg-surface-700 text-surface-100'
                                : 'text-surface-400 hover:text-surface-200'
                        )}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={cn(
                                'px-1.5 py-0.5 text-xs rounded-full',
                                activeTab === tab.id ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-700 text-surface-400'
                            )}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search and filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        {activeTab === 'processes' && (
                            <div className="flex gap-2">
                                {['all', 'ACTIVE', 'DRAFT', 'DEPRECATED'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={cn(
                                            'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                                            statusFilter === status
                                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                                        )}
                                    >
                                        {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === 'tasks' && (
                            <div className="flex gap-2">
                                {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={cn(
                                            'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                                            statusFilter === status
                                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                                        )}
                                    >
                                        {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0) + status.replace('_', ' ').slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Content based on tab */}
            {activeTab === 'processes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                        </div>
                    ) : filteredProcesses.length === 0 ? (
                        <Card className="col-span-full">
                            <CardContent className="py-16">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="p-4 rounded-full bg-surface-800/50 mb-4">
                                        <GitBranch className="h-8 w-8 text-surface-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-surface-200">No workflows found</h3>
                                    <p className="mt-1 text-surface-400 max-w-sm">
                                        Create your first workflow to automate your business processes.
                                    </p>
                                    <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                                        <Plus className="h-4 w-4" />
                                        Create Workflow
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredProcesses.map((process) => (
                            <Card key={process.id} className="hover:border-surface-600 transition-colors">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                                                <GitBranch className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-surface-100">{process.name}</h3>
                                                <p className="text-sm text-surface-400 mt-0.5 line-clamp-2">
                                                    {process.description || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdown(openDropdown === process.id ? null : process.id);
                                                }}
                                                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            {openDropdown === process.id && (
                                                <div
                                                    className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 animate-fade-in"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-1">
                                                        <button
                                                            onClick={() => navigate(`/workflows/${process.id}/design`)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActiveTab('instances');
                                                                setOpenDropdown(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View Instances
                                                        </button>
                                                        {process.status === 'DRAFT' && (
                                                            <button
                                                                onClick={() => handleStatusChange(process.id, 'ACTIVE')}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Play className="h-4 w-4" />
                                                                Publish
                                                            </button>
                                                        )}
                                                        {process.status === 'ACTIVE' && (
                                                            <button
                                                                onClick={() => handleStatusChange(process.id, 'DEPRECATED')}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Archive className="h-4 w-4" />
                                                                Deprecate
                                                            </button>
                                                        )}
                                                        <hr className="my-1 border-surface-700" />
                                                        <button
                                                            onClick={() => {
                                                                setDeletingProcess(process);
                                                                setOpenDropdown(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <Badge variant={processStatusVariants[process.status]}>
                                            {process.status.charAt(0) + process.status.slice(1).toLowerCase()}
                                        </Badge>
                                        <span className="text-xs text-surface-500">
                                            v{process.version} • {getInstanceCount(process.id)} running
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'instances' && (
                <Card>
                    <CardHeader title="Running Instances" description="Active workflow executions" />
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-700/50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Instance</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Workflow</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Started</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-700/50">
                                {instances.map((instance) => {
                                    const process = processes.find(p => p.id === instance.processId);
                                    return (
                                        <tr key={instance.id} className="hover:bg-surface-800/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-surface-300">{instance.id}</td>
                                            <td className="px-6 py-4 text-surface-200">{process?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {instanceStatusIcons[instance.status]}
                                                    <span className="text-surface-300">{instance.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-surface-400 text-sm">
                                                {new Date(instance.startedAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'tasks' && (
                <Card>
                    <CardHeader title="My Tasks" description="Tasks assigned to you or available to claim" />
                    <div className="divide-y divide-surface-700/50">
                        {filteredTasks.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                <p className="text-surface-400">No tasks to show</p>
                            </div>
                        ) : (
                            filteredTasks.map((task) => (
                                <div key={task.id} className="px-6 py-4 hover:bg-surface-800/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'p-2 rounded-lg',
                                                task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                                                    task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-yellow-500/10 text-yellow-400'
                                            )}>
                                                {task.type === 'APPROVAL' ? <CheckCircle className="h-5 w-5" /> :
                                                    task.type === 'REVIEW' ? <Eye className="h-5 w-5" /> :
                                                        <Clock className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-surface-100">{task.name}</h4>
                                                <p className="text-sm text-surface-400">
                                                    {task.type} • Created {new Date(task.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {task.dueAt && (
                                                <div className="flex items-center gap-1 text-sm text-yellow-400">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Due {new Date(task.dueAt).toLocaleDateString()}
                                                </div>
                                            )}
                                            <Badge
                                                variant={
                                                    task.status === 'COMPLETED' ? 'success' :
                                                        task.status === 'IN_PROGRESS' ? 'info' :
                                                            'warning'
                                                }
                                            >
                                                {task.status.replace('_', ' ')}
                                            </Badge>
                                            {task.status !== 'COMPLETED' && (
                                                <Button size="sm">
                                                    {task.status === 'PENDING' ? 'Claim' : 'Complete'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            )}

            {/* Create Workflow Modal */}
            <WorkflowModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreate}
            />

            {/* Edit Workflow Modal */}
            <WorkflowModal
                isOpen={!!editingProcess}
                onClose={() => setEditingProcess(null)}
                onSave={handleCreate}
                onUpdate={handleUpdate}
                process={editingProcess || undefined}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingProcess}
                onClose={() => setDeletingProcess(null)}
                title="Delete Workflow"
                description={`Are you sure you want to delete "${deletingProcess?.name}"? This cannot be undone.`}
            >
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeletingProcess(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Workflow
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

// Workflow Create/Edit Modal
interface WorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (processData: { name: string; description?: string }) => Promise<void>;
    onUpdate?: (processId: string, processData: { name?: string; description?: string }) => Promise<void>;
    process?: Process;
}

function WorkflowModal({ isOpen, onClose, onSave, onUpdate, process }: WorkflowModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [_error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (process) {
            setFormData({
                name: process.name,
                description: process.description || '',
            });
        } else {
            setFormData({ name: '', description: '' });
        }
        setError(null);
    }, [process, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (process && onUpdate) {
                await onUpdate(process.id, formData);
            } else {
                await onSave(formData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save workflow');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={process ? 'Edit Workflow' : 'Create New Workflow'}
            description={process ? 'Update workflow details' : 'Design a new business process'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Workflow Name"
                    placeholder="e.g., Purchase Approval"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-surface-200 mb-1.5">
                        Description
                    </label>
                    <textarea
                        className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                        rows={3}
                        placeholder="Describe the workflow process..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {process ? 'Save Changes' : 'Create Workflow'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
