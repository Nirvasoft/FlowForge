import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Database,
    Table2,
    Eye,
    AlertCircle,
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardContent,
    Badge,
    Modal,
    ModalFooter,
} from '../../components/ui';
import {
    getDataset,
    getDatasetRecords,
    createDatasetRecord,
    updateDatasetRecord,
    deleteDatasetRecord,
} from '../../api/datasets';
import type { Dataset, DatasetRecord, DatasetColumn } from '../../types';

// Helper to extract column info from schema
function getColumnsFromSchema(schema: Record<string, unknown> | DatasetColumn[]): DatasetColumn[] {
    if (Array.isArray(schema)) {
        return schema.map((col: any, idx: number) => ({
            name: col.name || col.label || `Column ${idx + 1}`,
            slug: col.slug || col.key || col.name?.toLowerCase?.()?.replace(/\s+/g, '_') || `col_${idx}`,
            type: col.type || 'text',
            required: col.required ?? false,
            unique: col.unique ?? false,
            hidden: col.hidden ?? false,
            settings: col.settings || {},
        }));
    }

    // schema is Record<string, unknown>
    return Object.entries(schema).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        slug: key,
        type: typeof value === 'string' ? value : (value as any)?.type || 'text',
        required: (value as any)?.required ?? false,
        unique: (value as any)?.unique ?? false,
        hidden: false,
        settings: {},
    }));
}

function getColumnTypeColor(type: string): string {
    switch (type?.toLowerCase()) {
        case 'text':
        case 'string':
            return 'text-blue-400 bg-blue-500/10';
        case 'number':
        case 'integer':
        case 'float':
            return 'text-purple-400 bg-purple-500/10';
        case 'boolean':
            return 'text-amber-400 bg-amber-500/10';
        case 'date':
        case 'datetime':
            return 'text-green-400 bg-green-500/10';
        case 'email':
            return 'text-cyan-400 bg-cyan-500/10';
        case 'select':
        case 'enum':
            return 'text-orange-400 bg-orange-500/10';
        case 'url':
            return 'text-indigo-400 bg-indigo-500/10';
        default:
            return 'text-surface-400 bg-surface-500/10';
    }
}

export function DatasetDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [dataset, setDataset] = useState<Dataset | null>(null);
    const [records, setRecords] = useState<DatasetRecord[]>([]);
    const [columns, setColumns] = useState<DatasetColumn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // CRUD state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DatasetRecord | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<DatasetRecord | null>(null);
    const [viewingRecord, setViewingRecord] = useState<DatasetRecord | null>(null);

    // Active tab
    const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data');

    // Load dataset
    const loadDataset = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const ds = await getDataset(id);
            setDataset(ds);
            const cols = getColumnsFromSchema(ds.schema);
            setColumns(cols);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dataset');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    // Load records
    const loadRecords = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoadingRecords(true);
            const result = await getDatasetRecords(id, {
                page,
                pageSize,
                search: searchQuery || undefined,
            });
            setRecords(result.data || []);
            setTotalRecords(result.total || 0);
            setTotalPages(result.totalPages || 0);
        } catch (err) {
            // If GET fails, records might not be in-memory 
            setRecords([]);
            setTotalRecords(0);
            setTotalPages(0);
        } finally {
            setIsLoadingRecords(false);
        }
    }, [id, page, pageSize, searchQuery]);

    useEffect(() => {
        loadDataset();
    }, [loadDataset]);

    useEffect(() => {
        if (dataset) {
            loadRecords();
        }
    }, [dataset, loadRecords]);

    // Add record
    const handleAddRecord = useCallback(async (data: Record<string, unknown>) => {
        if (!id) return;
        try {
            await createDatasetRecord(id, data);
            await loadRecords();
            setIsAddModalOpen(false);
        } catch (err) {
            throw err;
        }
    }, [id, loadRecords]);

    // Update record
    const handleUpdateRecord = useCallback(async (recordId: string, data: Record<string, unknown>) => {
        if (!id) return;
        try {
            await updateDatasetRecord(id, recordId, data);
            await loadRecords();
            setEditingRecord(null);
        } catch (err) {
            throw err;
        }
    }, [id, loadRecords]);

    // Delete record
    const handleDeleteRecord = useCallback(async () => {
        if (!id || !deletingRecord) return;
        try {
            await deleteDatasetRecord(id, deletingRecord.id);
            await loadRecords();
            setDeletingRecord(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete record');
        }
    }, [id, deletingRecord, loadRecords]);

    const formatCellValue = (value: unknown, type: string): string => {
        if (value === null || value === undefined) return '—';
        if (type === 'boolean') return value ? 'Yes' : 'No';
        if (type === 'date' || type === 'datetime') {
            try {
                return new Date(value as string).toLocaleDateString();
            } catch {
                return String(value);
            }
        }
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !dataset) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-surface-300">{error || 'Dataset not found'}</p>
                <Button onClick={() => navigate('/datasets')}>Back to Datasets</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/datasets')}
                        className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Table2 className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-surface-100">{dataset.name}</h1>
                                <p className="text-sm text-surface-400">{dataset.description || 'No description'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={loadRecords}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add Record
                    </Button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="py-4">
                        <p className="text-xs text-surface-400 uppercase font-medium">Total Records</p>
                        <p className="text-2xl font-bold text-surface-100 mt-1">{dataset.rowCount ?? totalRecords}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4">
                        <p className="text-xs text-surface-400 uppercase font-medium">Columns</p>
                        <p className="text-2xl font-bold text-surface-100 mt-1">{columns.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4">
                        <p className="text-xs text-surface-400 uppercase font-medium">Created</p>
                        <p className="text-sm font-medium text-surface-200 mt-1">
                            {new Date(dataset.createdAt).toLocaleDateString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4">
                        <p className="text-xs text-surface-400 uppercase font-medium">Last Updated</p>
                        <p className="text-sm font-medium text-surface-200 mt-1">
                            {new Date(dataset.updatedAt).toLocaleDateString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface-800/50 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('data')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data'
                        ? 'bg-primary-500 text-white'
                        : 'text-surface-400 hover:text-surface-200'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Data
                        <Badge variant="info">{totalRecords}</Badge>
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('schema')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'schema'
                        ? 'bg-primary-500 text-white'
                        : 'text-surface-400 hover:text-surface-200'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Table2 className="h-4 w-4" />
                        Schema
                        <Badge variant="info">{columns.length}</Badge>
                    </span>
                </button>
            </div>

            {activeTab === 'data' && (
                <>
                    {/* Search */}
                    <Card>
                        <CardContent className="py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search records..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setPage(1);
                                        }}
                                        leftIcon={<Search className="h-4 w-4" />}
                                    />
                                </div>
                                <span className="text-sm text-surface-400">
                                    {totalRecords} record{totalRecords !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Grid */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-700/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider w-12">
                                            #
                                        </th>
                                        {columns.filter(c => !c.hidden).map((col) => (
                                            <th
                                                key={col.slug}
                                                className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {col.name}
                                                    {col.required && <span className="text-red-400">*</span>}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider w-24">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-700/50">
                                    {isLoadingRecords ? (
                                        <tr>
                                            <td colSpan={columns.length + 2} className="px-6 py-12 text-center">
                                                <div className="flex items-center justify-center gap-3 text-surface-400">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
                                                    Loading records...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : records.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length + 2} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Database className="h-10 w-10 text-surface-600" />
                                                    <div>
                                                        <p className="text-surface-300 font-medium">No records found</p>
                                                        <p className="text-sm text-surface-500 mt-1">
                                                            {searchQuery ? 'Try a different search query' : 'Add your first record to get started'}
                                                        </p>
                                                    </div>
                                                    {!searchQuery && (
                                                        <Button onClick={() => setIsAddModalOpen(true)} className="mt-2">
                                                            <Plus className="h-4 w-4" />
                                                            Add Record
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        records.map((record, index) => (
                                            <tr
                                                key={record.id}
                                                className="hover:bg-surface-800/30 transition-colors group"
                                            >
                                                <td className="px-4 py-3 text-xs text-surface-500">
                                                    {(page - 1) * pageSize + index + 1}
                                                </td>
                                                {columns.filter(c => !c.hidden).map((col) => (
                                                    <td
                                                        key={col.slug}
                                                        className="px-4 py-3 text-sm text-surface-200 max-w-[200px] truncate"
                                                    >
                                                        {formatCellValue(record.data[col.slug], col.type)}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setViewingRecord(record)}
                                                            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                                                            title="View"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingRecord(record)}
                                                            className="p-1.5 rounded-lg text-surface-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingRecord(record)}
                                                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t border-surface-700/50">
                                <p className="text-sm text-surface-400">
                                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecords)} of {totalRecords}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-surface-300 px-2">
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {activeTab === 'schema' && (
                <Card>
                    <CardContent>
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
                                Column Definitions
                            </h3>
                            <div className="grid gap-3">
                                {columns.map((col, index) => (
                                    <div
                                        key={col.slug}
                                        className="flex items-center justify-between p-4 rounded-xl bg-surface-800/30 border border-surface-700/50 hover:border-surface-600/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-surface-500 font-mono w-6">{index + 1}</span>
                                            <div>
                                                <p className="font-medium text-surface-200">{col.name}</p>
                                                <p className="text-xs text-surface-500 font-mono">{col.slug}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {col.required && (
                                                <Badge variant="warning">Required</Badge>
                                            )}
                                            {col.unique && (
                                                <Badge variant="info">Unique</Badge>
                                            )}
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getColumnTypeColor(col.type)}`}>
                                                {col.type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Record Modal */}
            <RecordFormModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                columns={columns}
                onSave={(data) => handleAddRecord(data)}
                title="Add New Record"
            />

            {/* Edit Record Modal */}
            <RecordFormModal
                isOpen={!!editingRecord}
                onClose={() => setEditingRecord(null)}
                columns={columns}
                record={editingRecord || undefined}
                onSave={async (data) => { if (editingRecord) await handleUpdateRecord(editingRecord.id, data); }}
                title="Edit Record"
            />

            {/* View Record Modal */}
            <Modal
                isOpen={!!viewingRecord}
                onClose={() => setViewingRecord(null)}
                title="Record Details"
                size="lg"
            >
                {viewingRecord && (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {columns.map((col) => (
                                <div
                                    key={col.slug}
                                    className="flex items-start gap-4 p-3 rounded-lg bg-surface-800/30"
                                >
                                    <div className="min-w-[140px]">
                                        <p className="text-xs text-surface-400 font-medium">{col.name}</p>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${getColumnTypeColor(col.type)}`}>
                                            {col.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-surface-200 flex-1 break-all">
                                        {formatCellValue(viewingRecord.data[col.slug], col.type)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-surface-500 pt-2 border-t border-surface-700/50">
                            <span>ID: {viewingRecord.id}</span>
                            <span>Created: {new Date(viewingRecord.createdAt).toLocaleString()}</span>
                            <span>Updated: {new Date(viewingRecord.updatedAt).toLocaleString()}</span>
                        </div>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setViewingRecord(null)}>Close</Button>
                            <Button onClick={() => {
                                setEditingRecord(viewingRecord);
                                setViewingRecord(null);
                            }}>
                                <Edit className="h-4 w-4" />
                                Edit Record
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deletingRecord}
                onClose={() => setDeletingRecord(null)}
                title="Delete Record"
                description="Are you sure you want to delete this record? This action cannot be undone."
            >
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeletingRecord(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteRecord}>Delete Record</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

// Record Form Modal
interface RecordFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: DatasetColumn[];
    record?: DatasetRecord;
    onSave: (data: Record<string, unknown>) => Promise<void>;
    title: string;
}

function RecordFormModal({ isOpen, onClose, columns, record, onSave, title }: RecordFormModalProps) {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            const data: Record<string, string> = {};
            columns.forEach((col) => {
                const value = record?.data?.[col.slug];
                data[col.slug] = value !== null && value !== undefined ? String(value) : '';
            });
            setFormData(data);
            setErrors({});
        }
    }, [isOpen, columns, record]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const newErrors: Record<string, string> = {};
        columns.forEach((col) => {
            if (col.required && !formData[col.slug]?.trim()) {
                newErrors[col.slug] = `${col.name} is required`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            // Convert types
            const data: Record<string, unknown> = {};
            columns.forEach((col) => {
                const val = formData[col.slug];
                if (val === '' || val === undefined) {
                    data[col.slug] = null;
                    return;
                }
                switch (col.type?.toLowerCase()) {
                    case 'number':
                    case 'integer':
                    case 'float':
                        data[col.slug] = Number(val);
                        break;
                    case 'boolean':
                        data[col.slug] = val === 'true' || val === '1' || val === 'yes';
                        break;
                    default:
                        data[col.slug] = val;
                }
            });
            await onSave(data);
        } catch (err) {
            setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' });
        } finally {
            setIsLoading(false);
        }
    };

    const getInputType = (type: string): string => {
        switch (type?.toLowerCase()) {
            case 'number':
            case 'integer':
            case 'float':
                return 'number';
            case 'email':
                return 'email';
            case 'date':
                return 'date';
            case 'url':
                return 'url';
            default:
                return 'text';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._form && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {errors._form}
                    </div>
                )}

                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                    {columns.filter(c => !c.hidden).map((col) => (
                        <div key={col.slug}>
                            {col.type === 'boolean' ? (
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData[col.slug] === 'true' || formData[col.slug] === '1'}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                [col.slug]: e.target.checked ? 'true' : 'false',
                                            }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                    <span className="text-sm font-medium text-surface-200">
                                        {col.name}
                                        {col.required && <span className="text-red-400 ml-1">*</span>}
                                    </span>
                                </div>
                            ) : col.type === 'select' || col.type === 'enum' ? (
                                <div>
                                    <label className="block text-sm font-medium text-surface-200 mb-1.5">
                                        {col.name}
                                        {col.required && <span className="text-red-400 ml-1">*</span>}
                                    </label>
                                    <select
                                        value={formData[col.slug] || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [col.slug]: e.target.value,
                                        }))}
                                        className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    >
                                        <option value="">Select...</option>
                                        {(col.settings?.options as string[] || []).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <Input
                                    label={`${col.name}${col.required ? ' *' : ''}`}
                                    type={getInputType(col.type)}
                                    placeholder={`Enter ${col.name.toLowerCase()}`}
                                    value={formData[col.slug] || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        [col.slug]: e.target.value,
                                    }))}
                                    required={col.required}
                                />
                            )}
                            {errors[col.slug] && (
                                <p className="text-xs text-red-400 mt-1">{errors[col.slug]}</p>
                            )}
                        </div>
                    ))}
                </div>

                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={isLoading}>
                        <Save className="h-4 w-4" />
                        {record ? 'Save Changes' : 'Add Record'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
