import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreHorizontal,
    Database,
    Edit,
    Trash2,
    Download,
    Upload,
    Table2,
    ArrowRight,
    Calendar,
    Rows3,
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
import { DatasetImportModal, DatasetExportModal } from './DatasetImportExport';
import { listDatasets, createDataset, updateDataset, deleteDataset, exportDataset } from '../../api/datasets';
import type { Dataset, DatasetColumn } from '../../types';

// Helper to extract column names from schema
function getColumnNames(schema: Record<string, unknown> | DatasetColumn[]): string[] {
    if (Array.isArray(schema)) {
        return schema.map((col: any) => col.name || col.label || col.slug || 'Unknown');
    }
    return Object.keys(schema);
}

function getColumnCount(schema: Record<string, unknown> | DatasetColumn[]): number {
    if (Array.isArray(schema)) return schema.length;
    return Object.keys(schema).length;
}

export function DatasetsPage() {
    const navigate = useNavigate();
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
    const [deletingDataset, setDeletingDataset] = useState<Dataset | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Import/Export states
    const [importingDataset, setImportingDataset] = useState<Dataset | null>(null);
    const [exportingDataset, setExportingDataset] = useState<Dataset | null>(null);

    // Load datasets from API
    const loadDatasets = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listDatasets({
                limit: 100,
                search: searchQuery || undefined,
            });
            setDatasets(response.items);
            setTotalCount(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load datasets');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        loadDatasets();
    }, [loadDatasets]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = () => setOpenDropdown(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Filter datasets (client-side for additional filtering)
    const filteredDatasets = datasets.filter((dataset) => {
        return (
            dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleCreate = useCallback(async (datasetData: { name: string; description?: string }) => {
        try {
            const newDataset = await createDataset(datasetData);
            setDatasets(prev => [...prev, newDataset]);
            setIsCreateModalOpen(false);
        } catch (err) {
            throw err;
        }
    }, []);

    const handleUpdate = useCallback(async (datasetId: string, datasetData: { name?: string; description?: string }) => {
        try {
            const updatedDataset = await updateDataset(datasetId, datasetData);
            setDatasets(prev => prev.map(d => d.id === updatedDataset.id ? updatedDataset : d));
            setEditingDataset(null);
        } catch (err) {
            throw err;
        }
    }, []);

    const handleDelete = useCallback(async () => {
        if (deletingDataset) {
            try {
                await deleteDataset(deletingDataset.id);
                setDatasets(prev => prev.filter(d => d.id !== deletingDataset.id));
                setDeletingDataset(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete dataset');
            }
        }
    }, [deletingDataset]);

    const handleImport = useCallback(async (data: Record<string, unknown>[], _columnMapping: Record<string, string>) => {
        if (importingDataset) {
            setDatasets(prev => prev.map(d =>
                d.id === importingDataset.id
                    ? { ...d, rowCount: d.rowCount + data.length, updatedAt: new Date().toISOString() }
                    : d
            ));
        }
    }, [importingDataset]);

    const handleExport = useCallback(async (_format: 'csv' | 'excel'): Promise<Blob> => {
        if (exportingDataset) {
            return await exportDataset(exportingDataset.id);
        }
        throw new Error('No dataset selected for export');
    }, [exportingDataset]);

    const formatRowCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toString();
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Datasets</h1>
                    <p className="mt-1 text-surface-400">Manage your data tables and records — {totalCount} datasets</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => datasets.length > 0 && setImportingDataset(datasets[0])}>
                        <Upload className="h-4 w-4" />
                        Import
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Create Dataset
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="py-4">
                    <Input
                        placeholder="Search datasets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-4 w-4" />}
                    />
                </CardContent>
            </Card>

            {/* Datasets grid (cards) */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-3 text-surface-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
                        Loading datasets...
                    </div>
                </div>
            ) : filteredDatasets.length === 0 ? (
                <Card>
                    <CardContent className="py-16">
                        <div className="flex flex-col items-center gap-3">
                            <Database className="h-12 w-12 text-surface-600" />
                            <div className="text-center">
                                <p className="text-surface-300 font-medium">No datasets found</p>
                                <p className="text-sm text-surface-500 mt-1">
                                    {searchQuery
                                        ? 'Try a different search query'
                                        : 'Create your first dataset to start managing data'}
                                </p>
                            </div>
                            {!searchQuery && (
                                <Button onClick={() => setIsCreateModalOpen(true)} className="mt-2">
                                    <Plus className="h-4 w-4" />
                                    Create Dataset
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDatasets.map((dataset) => {
                        const colNames = getColumnNames(dataset.schema);
                        const colCount = getColumnCount(dataset.schema);

                        return (
                            <Card
                                key={dataset.id}
                                className="group cursor-pointer hover:border-primary-500/30 transition-all duration-200"
                                onClick={() => navigate(`/datasets/${dataset.id}`)}
                            >
                                <CardContent className="p-5">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                                <Table2 className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-surface-100 truncate group-hover:text-primary-400 transition-colors">
                                                    {dataset.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdown(openDropdown === dataset.id ? null : dataset.id);
                                                }}
                                                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            {openDropdown === dataset.id && (
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 animate-fade-in">
                                                    <div className="p-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingDataset(dataset);
                                                                setOpenDropdown(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setExportingDataset(dataset);
                                                                setOpenDropdown(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Export
                                                        </button>
                                                        <hr className="my-1 border-surface-700" />
                                                        <button
                                                            onClick={() => {
                                                                setDeletingDataset(dataset);
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

                                    {/* Description */}
                                    <p className="text-sm text-surface-400 line-clamp-2 mb-4 min-h-[40px]">
                                        {dataset.description || 'No description'}
                                    </p>

                                    {/* Columns preview */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {colNames.slice(0, 4).map((col) => (
                                            <Badge key={col} variant="info">{col}</Badge>
                                        ))}
                                        {colCount > 4 && (
                                            <Badge variant="info">+{colCount - 4} more</Badge>
                                        )}
                                        {colCount === 0 && (
                                            <span className="text-xs text-surface-500">No columns defined</span>
                                        )}
                                    </div>

                                    {/* Footer stats */}
                                    <div className="flex items-center justify-between pt-3 border-t border-surface-700/50">
                                        <div className="flex items-center gap-4 text-xs text-surface-400">
                                            <span className="flex items-center gap-1.5">
                                                <Rows3 className="h-3.5 w-3.5" />
                                                {formatRowCount(dataset.rowCount)} records
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(dataset.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-surface-600 group-hover:text-primary-400 transition-colors transform group-hover:translate-x-1 duration-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Dataset Modal */}
            <DatasetModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreate}
            />

            {/* Edit Dataset Modal */}
            <DatasetModal
                isOpen={!!editingDataset}
                onClose={() => setEditingDataset(null)}
                onSave={handleCreate}
                onUpdate={handleUpdate}
                dataset={editingDataset || undefined}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingDataset}
                onClose={() => setDeletingDataset(null)}
                title="Delete Dataset"
                description={`Are you sure you want to delete "${deletingDataset?.name}"? This will permanently delete all ${deletingDataset?.rowCount} records.`}
            >
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeletingDataset(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Dataset
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Import Modal */}
            <DatasetImportModal
                isOpen={!!importingDataset}
                onClose={() => setImportingDataset(null)}
                datasetName={importingDataset?.name || ''}
                existingColumns={importingDataset ? getColumnNames(importingDataset.schema) : []}
                onImport={handleImport}
            />

            {/* Export Modal */}
            <DatasetExportModal
                isOpen={!!exportingDataset}
                onClose={() => setExportingDataset(null)}
                datasetName={exportingDataset?.name || ''}
                recordCount={exportingDataset?.rowCount || 0}
                onExport={handleExport}
            />
        </div>
    );
}

// Dataset Create/Edit Modal
interface DatasetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (datasetData: { name: string; description?: string }) => Promise<void>;
    onUpdate?: (datasetId: string, datasetData: { name?: string; description?: string }) => Promise<void>;
    dataset?: Dataset;
}

function DatasetModal({ isOpen, onClose, onSave, onUpdate, dataset }: DatasetModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [_error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (dataset) {
            setFormData({
                name: dataset.name,
                description: dataset.description || '',
            });
        } else {
            setFormData({ name: '', description: '' });
        }
        setError(null);
    }, [dataset, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (dataset && onUpdate) {
                await onUpdate(dataset.id, formData);
            } else {
                await onSave(formData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save dataset');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={dataset ? 'Edit Dataset' : 'Create New Dataset'}
            description={dataset ? 'Update dataset details' : 'Create a new data table'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Dataset Name"
                    placeholder="e.g., Customers"
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
                        placeholder="Describe the data in this table..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {dataset ? 'Save Changes' : 'Create Dataset'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
