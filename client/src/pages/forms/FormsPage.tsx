import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreHorizontal,
    FileText,
    Edit,
    Trash2,
    Copy,
    Play,
    Archive
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardContent,
    Badge,
    Modal,
    ModalFooter
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { listForms, createForm, updateForm, deleteForm } from '../../api/forms';
import type { Form } from '../../types';

const statusVariants: Record<Form['status'], 'success' | 'warning' | 'info'> = {
    ACTIVE: 'success',
    DRAFT: 'warning',
    ARCHIVED: 'info',
};

export function FormsPage() {
    const navigate = useNavigate();
    const [forms, setForms] = useState<Form[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState<Form | null>(null);
    const [deletingForm, setDeletingForm] = useState<Form | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Load forms from API
    const loadForms = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listForms({
                status: statusFilter !== 'all' ? statusFilter as Form['status'] : undefined,
                search: searchQuery || undefined,
            });
            setForms(response.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load forms');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        loadForms();
    }, [loadForms]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = () => setOpenDropdown(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Filter forms (client-side for additional filtering)
    const filteredForms = forms.filter((form) => {
        const matchesSearch =
            form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            form.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCreate = useCallback(async (formData: { name: string; description?: string }) => {
        try {
            const newForm = await createForm(formData);
            setForms(prev => [...prev, newForm]);
            setIsCreateModalOpen(false);
        } catch (err) {
            throw err; // Let modal handle error
        }
    }, []);

    const handleUpdate = useCallback(async (formId: string, formData: { name?: string; description?: string; status?: Form['status'] }) => {
        try {
            const updatedForm = await updateForm(formId, formData);
            setForms(prev => prev.map(f => f.id === updatedForm.id ? updatedForm : f));
            setEditingForm(null);
        } catch (err) {
            throw err;
        }
    }, []);

    const handleDelete = useCallback(async () => {
        if (deletingForm) {
            try {
                await deleteForm(deletingForm.id);
                setForms(prev => prev.filter(f => f.id !== deletingForm.id));
                setDeletingForm(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete form');
            }
        }
    }, [deletingForm]);

    const handleStatusChange = useCallback(async (formId: string, newStatus: Form['status']) => {
        try {
            const updatedForm = await updateForm(formId, { status: newStatus });
            setForms(prev => prev.map(f => f.id === formId ? updatedForm : f));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update status');
        }
        setOpenDropdown(null);
    }, []);

    const handleDuplicate = useCallback(async (form: Form) => {
        try {
            const newForm = await createForm({
                name: `${form.name} (Copy)`,
                description: form.description,
                fields: form.fields.map(f => ({
                    name: f.name,
                    label: f.label,
                    type: f.type,
                    required: f.required,
                    config: f.config,
                })),
            });
            setForms(prev => [...prev, newForm]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to duplicate form');
        }
        setOpenDropdown(null);
    }, []);

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Forms</h1>
                    <p className="mt-1 text-surface-400">Create and manage data collection forms</p>
                </div>
                <Button onClick={() => navigate('/forms/new')}>
                    <Plus className="h-4 w-4" />
                    Create Form
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search forms..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((status) => (
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
                    </div>
                </CardContent>
            </Card>

            {/* Forms grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                </div>
            ) : filteredForms.length === 0 ? (
                <Card>
                    <CardContent className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="p-4 rounded-full bg-surface-800/50 mb-4">
                                <FileText className="h-8 w-8 text-surface-500" />
                            </div>
                            <h3 className="text-lg font-medium text-surface-200">No forms found</h3>
                            <p className="mt-1 text-surface-400 max-w-sm">
                                {searchQuery || statusFilter !== 'all'
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Create your first form to start collecting data.'}
                            </p>
                            {!searchQuery && statusFilter === 'all' && (
                                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                                    <Plus className="h-4 w-4" />
                                    Create your first form
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredForms.map((form) => (
                        <Card key={form.id} className="hover:border-surface-600 transition-colors">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-surface-100">{form.name}</h3>
                                            <p className="text-sm text-surface-400 mt-0.5 line-clamp-2">
                                                {form.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdown(openDropdown === form.id ? null : form.id);
                                            }}
                                            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                        {openDropdown === form.id && (
                                            <div
                                                className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 animate-fade-in"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="p-1">
                                                    <button
                                                        onClick={() => navigate(`/forms/${form.id}/edit`)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicate(form)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                        Duplicate
                                                    </button>
                                                    {form.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleStatusChange(form.id, 'ACTIVE')}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            Publish
                                                        </button>
                                                    )}
                                                    {form.status === 'ACTIVE' && (
                                                        <button
                                                            onClick={() => handleStatusChange(form.id, 'ARCHIVED')}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                            Archive
                                                        </button>
                                                    )}
                                                    <hr className="my-1 border-surface-700" />
                                                    <button
                                                        onClick={() => {
                                                            setDeletingForm(form);
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
                                    <Badge variant={statusVariants[form.status]}>
                                        {form.status.charAt(0) + form.status.slice(1).toLowerCase()}
                                    </Badge>
                                    <span className="text-xs text-surface-500">
                                        {(form.fields?.length ?? 0)} field{(form.fields?.length ?? 0) !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-surface-700/50 text-xs text-surface-500">
                                    Updated {new Date(form.updatedAt).toLocaleDateString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Form Modal */}
            <FormModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreate}
            />

            {/* Edit Form Modal */}
            <FormModal
                isOpen={!!editingForm}
                onClose={() => setEditingForm(null)}
                onSave={handleCreate}
                onUpdate={handleUpdate}
                form={editingForm || undefined}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingForm}
                onClose={() => setDeletingForm(null)}
                title="Delete Form"
                description={`Are you sure you want to delete "${deletingForm?.name}"? This action cannot be undone.`}
            >
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeletingForm(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Form
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

// Form Create/Edit Modal
interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: { name: string; description?: string }) => Promise<void>;
    onUpdate?: (formId: string, formData: { name?: string; description?: string }) => Promise<void>;
    form?: Form;
}

function FormModal({ isOpen, onClose, onSave, onUpdate, form }: FormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [_error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (form) {
            setFormData({
                name: form.name,
                description: form.description || '',
            });
        } else {
            setFormData({ name: '', description: '' });
        }
        setError(null);
    }, [form, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (form && onUpdate) {
                await onUpdate(form.id, formData);
            } else {
                await onSave(formData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save form');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={form ? 'Edit Form' : 'Create New Form'}
            description={form ? 'Update form details' : 'Set up a new data collection form'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Form Name"
                    placeholder="e.g., Employee Survey"
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
                        placeholder="Describe the purpose of this form..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {form ? 'Save Changes' : 'Create Form'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
