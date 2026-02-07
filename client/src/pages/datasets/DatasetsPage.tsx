import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Search,
    MoreHorizontal,
    Database,
    Edit,
    Trash2,
    Download,
    Upload,
    Table2
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
import type { Dataset } from '../../types';

export function DatasetsPage() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
    const [deletingDataset, setDeletingDataset] = useState<Dataset | null>(null);
    const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null);
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
                search: searchQuery || undefined,
            });
            setDatasets(response.items);
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
        // TODO: Implement import API when available
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
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toString();
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Datasets</h1>
                    <p className="mt-1 text-surface-400">Manage your data tables and records</p>
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

            {/* Datasets table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-700/50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Dataset
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Columns
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Records
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Last Updated
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-surface-400">
                                        Loading datasets...
                                    </td>
                                </tr>
                            ) : filteredDatasets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <Database className="h-8 w-8 text-surface-500 mb-2" />
                                            <p className="text-surface-400">No datasets found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDatasets.map((dataset) => (
                                    <tr
                                        key={dataset.id}
                                        className="hover:bg-surface-800/30 transition-colors cursor-pointer"
                                        onClick={() => setViewingDataset(dataset)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                    <Table2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-surface-100">{dataset.name}</p>
                                                    <p className="text-sm text-surface-400 line-clamp-1">
                                                        {dataset.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.keys(dataset.schema || {}).slice(0, 3).map((col) => (
                                                    <Badge key={col} variant="info">{col}</Badge>
                                                ))}
                                                {Object.keys(dataset.schema || {}).length > 3 && (
                                                    <Badge variant="info">
                                                        +{Object.keys(dataset.schema || {}).length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-surface-200 font-medium">
                                                {formatRowCount(dataset.rowCount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-surface-400 text-sm">
                                            {new Date(dataset.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdown(openDropdown === dataset.id ? null : dataset.id);
                                                    }}
                                                    className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

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

            {/* View Dataset Modal (Simple Preview) */}
            <Modal
                isOpen={!!viewingDataset}
                onClose={() => setViewingDataset(null)}
                title={viewingDataset?.name || 'Dataset'}
                description={viewingDataset?.description}
                size="lg"
            >
                {viewingDataset && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-surface-400">Records:</span>
                                <span className="ml-2 text-surface-100">{viewingDataset.rowCount}</span>
                            </div>
                            <div>
                                <span className="text-surface-400">Columns:</span>
                                <span className="ml-2 text-surface-100">{Object.keys(viewingDataset.schema).length}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-surface-200 mb-2">Schema</h4>
                            <div className="bg-surface-800/50 rounded-lg p-3 space-y-1">
                                {Object.entries(viewingDataset.schema).map(([name, type]) => (
                                    <div key={name} className="flex justify-between text-sm">
                                        <span className="text-surface-300">{name}</span>
                                        <Badge variant="info">{String(type)}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setViewingDataset(null)}>
                                Close
                            </Button>
                            <Button onClick={() => {
                                setEditingDataset(viewingDataset);
                                setViewingDataset(null);
                            }}>
                                Edit Dataset
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Import Modal */}
            <DatasetImportModal
                isOpen={!!importingDataset}
                onClose={() => setImportingDataset(null)}
                datasetName={importingDataset?.name || ''}
                existingColumns={importingDataset ? Object.keys(importingDataset.schema) : []}
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
