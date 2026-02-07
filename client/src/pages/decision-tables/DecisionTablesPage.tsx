/**
 * DecisionTablesPage - Lists all decision tables with CRUD actions
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
    Upload,
    Table,
    CheckCircle,
    XCircle,
    Loader2,
    Filter,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import { listTables, createTable, deleteTable, publishTable, unpublishTable } from '../../api/decision-tables';
import type { DecisionTable, HitPolicy } from '../../types';

const HIT_POLICY_LABELS: Record<HitPolicy, string> = {
    'first': 'First',
    'unique': 'Unique',
    'any': 'Any',
    'priority': 'Priority',
    'collect': 'Collect',
    'collect-sum': 'Sum',
    'collect-min': 'Min',
    'collect-max': 'Max',
    'collect-count': 'Count',
};

export function DecisionTablesPage() {
    const navigate = useNavigate();
    const [tables, setTables] = useState<DecisionTable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Load tables
    useEffect(() => {
        async function loadTables() {
            try {
                const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
                const result = await listTables({ status: statusParam, search: searchQuery || undefined });
                setTables(result.tables || []);
            } catch (error) {
                console.error('Failed to load decision tables:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadTables();
    }, [statusFilter, searchQuery]);

    // Actions
    const handleCreate = async (name: string, hitPolicy: HitPolicy) => {
        try {
            const table = await createTable({ name, hitPolicy });
            navigate(`/decision-tables/${table.id}/edit`);
        } catch (error) {
            console.error('Failed to create table:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this decision table?')) return;
        try {
            await deleteTable(id);
            setTables((prev) => prev.filter((t) => t.id !== id));
        } catch (error) {
            console.error('Failed to delete table:', error);
        }
    };

    const handlePublish = async (table: DecisionTable) => {
        try {
            if (table.status === 'published') {
                const updated = await unpublishTable(table.id);
                setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            } else {
                const updated = await publishTable(table.id);
                setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            }
        } catch (error) {
            console.error('Failed to publish/unpublish table:', error);
        }
    };

    // Filter
    const filteredTables = tables.filter((table) => {
        if (searchQuery && !table.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (statusFilter !== 'all' && table.status !== statusFilter) return false;
        return true;
    });

    const statusColors = {
        draft: 'bg-amber-500/20 text-amber-400',
        published: 'bg-green-500/20 text-green-400',
        archived: 'bg-surface-500/20 text-surface-400',
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Decision Tables</h1>
                    <p className="text-surface-400 mt-1">Create business rules with spreadsheet-like logic</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Table
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <Input
                        placeholder="Search tables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-surface-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-200 text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            {/* Tables List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="text-center py-16">
                    <Table className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No decision tables yet</h3>
                    <p className="text-surface-500 mb-6">Create your first decision table to get started</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Table
                    </Button>
                </div>
            ) : (
                <div className="bg-surface-900 border border-surface-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-surface-800/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Name</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Hit Policy</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Inputs/Outputs</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Rules</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Updated</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700">
                            {filteredTables.map((table) => (
                                <tr
                                    key={table.id}
                                    className="hover:bg-surface-800/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/decision-tables/${table.id}/edit`)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center">
                                                <Table className="w-4 h-4 text-primary-400" />
                                            </div>
                                            <div>
                                                <p className="text-surface-100 font-medium">{table.name}</p>
                                                {table.description && (
                                                    <p className="text-surface-500 text-sm truncate max-w-xs">
                                                        {table.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-surface-300 text-sm">
                                            {HIT_POLICY_LABELS[table.hitPolicy]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-surface-300 text-sm">
                                            {table.inputs.length} / {table.outputs.length}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-surface-300 text-sm">{table.rules.length}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'px-2 py-1 rounded text-xs font-medium',
                                            statusColors[table.status]
                                        )}>
                                            {table.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-surface-500 text-sm">
                                            {new Date(table.updatedAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === table.id ? null : table.id);
                                                }}
                                                className="p-1 rounded hover:bg-surface-700 text-surface-400"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {activeMenu === table.id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-800 border border-surface-600 rounded-lg shadow-lg z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/decision-tables/${table.id}/edit`);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePublish(table);
                                                            setActiveMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                                                    >
                                                        {table.status === 'published' ? (
                                                            <>
                                                                <XCircle className="w-4 h-4" />
                                                                Unpublish
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4" />
                                                                Publish
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // TODO: Implement duplicate
                                                            setActiveMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </button>
                                                    <hr className="border-surface-600 my-1" />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(table.id);
                                                            setActiveMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateTableModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}

// Create Modal
function CreateTableModal({
    onClose,
    onCreate,
}: {
    onClose: () => void;
    onCreate: (name: string, hitPolicy: HitPolicy) => void;
}) {
    const [name, setName] = useState('');
    const [hitPolicy, setHitPolicy] = useState<HitPolicy>('first');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold text-surface-100 mb-6">Create Decision Table</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-surface-400 mb-1.5">Table Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Loan Approval Rules"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-surface-400 mb-1.5">Hit Policy</label>
                        <select
                            value={hitPolicy}
                            onChange={(e) => setHitPolicy(e.target.value as HitPolicy)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-200"
                        >
                            <option value="first">First - Return first matching rule</option>
                            <option value="unique">Unique - Only one rule matches</option>
                            <option value="any">Any - All matching rules return same output</option>
                            <option value="priority">Priority - Use rule priority order</option>
                            <option value="collect">Collect - Return all matching outputs</option>
                            <option value="collect-sum">Collect Sum - Sum numeric outputs</option>
                            <option value="collect-min">Collect Min - Get minimum value</option>
                            <option value="collect-max">Collect Max - Get maximum value</option>
                            <option value="collect-count">Collect Count - Count matches</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onCreate(name, hitPolicy)} disabled={!name.trim()}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Table
                    </Button>
                </div>
            </div>
        </div>
    );
}
