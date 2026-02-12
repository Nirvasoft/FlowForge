/**
 * FormSubmissionsPage - View all submissions for a given form
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Loader2,
    FileText,
    ChevronDown,
    ChevronRight,
    Trash2,
    Calendar,
    User,
    Inbox,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpDown,
    Send,
} from 'lucide-react';
import {
    Button,
    Card,
    CardContent,
    Modal,
    ModalFooter,
} from '../../components/ui';
import { getForm, getFormSubmissions, deleteFormSubmission } from '../../api/forms';
import type { Form } from '../../types';

interface Submission {
    id: string;
    formId: string;
    data: Record<string, unknown>;
    createdBy?: string;
    createdAt: string;
    updatedAt?: string;
}

export function FormSubmissionsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState<Form | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [deletingSub, setDeletingSub] = useState<Submission | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load form info & submissions
    const loadData = useCallback(async (page = 1) => {
        if (!id) return;
        try {
            setIsLoading(true);
            setLoadError(null);

            const [formData, subsData] = await Promise.all([
                form ? Promise.resolve(form) : getForm(id),
                getFormSubmissions(id, { page, limit: 20, sortOrder }),
            ]);

            if (!form) setForm(formData);
            setSubmissions(subsData.data);
            setPagination(subsData.pagination);
        } catch (err) {
            console.error('Failed to load submissions:', err);
            setLoadError('Failed to load submissions. The form may not exist.');
        } finally {
            setIsLoading(false);
        }
    }, [id, form, sortOrder]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePageChange = (page: number) => {
        loadData(page);
    };

    const handleToggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const handleDelete = async () => {
        if (!deletingSub || !id) return;
        setIsDeleting(true);
        try {
            await deleteFormSubmission(id, deletingSub.id);
            setSubmissions(prev => prev.filter(s => s.id !== deletingSub.id));
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
            setDeletingSub(null);
        } catch (err) {
            console.error('Failed to delete submission:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Get the field columns from form definition
    const fieldColumns = (form?.fields || []).slice(0, 5); // Show up to 5 columns in table

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    // Loading state
    if (isLoading && !submissions.length) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-surface-400 text-sm">Loading submissions...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-surface-400 mb-4">{loadError}</p>
                    <Button onClick={() => navigate('/forms')}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Forms
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-surface-100">
                            {form?.name || 'Form'} — Submissions
                        </h1>
                        <p className="mt-0.5 text-surface-400">
                            {pagination.total} submission{pagination.total !== 1 ? 's' : ''} total
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleToggleSort}>
                        <ArrowUpDown className="h-4 w-4" />
                        {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/forms/${id}/fill`)}>
                        <Send className="h-4 w-4" />
                        New Submission
                    </Button>
                </div>
            </div>

            {/* Submissions Table */}
            {submissions.length === 0 ? (
                <Card>
                    <CardContent className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="p-4 rounded-full bg-surface-800/50 mb-4">
                                <Inbox className="h-8 w-8 text-surface-500" />
                            </div>
                            <h3 className="text-lg font-medium text-surface-200">No submissions yet</h3>
                            <p className="mt-1 text-surface-400 max-w-sm">
                                This form hasn't received any submissions. Submissions will appear here once users fill out the form.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-700">
                                    <th className="w-10 px-4 py-3" />
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                                        #
                                    </th>
                                    {fieldColumns.map((field) => (
                                        <th
                                            key={field.id}
                                            className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider"
                                        >
                                            {field.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Submitted
                                        </div>
                                    </th>
                                    <th className="w-16 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-800">
                                {submissions.map((sub, index) => {
                                    const isExpanded = expandedRow === sub.id;
                                    const rowNumber = (pagination.page - 1) * pagination.limit + index + 1;

                                    return (
                                        <>
                                            <tr
                                                key={sub.id}
                                                className="group hover:bg-surface-800/30 transition-colors cursor-pointer"
                                                onClick={() => setExpandedRow(isExpanded ? null : sub.id)}
                                            >
                                                <td className="px-4 py-3">
                                                    {isExpanded
                                                        ? <ChevronDown className="h-4 w-4 text-primary-400" />
                                                        : <ChevronRight className="h-4 w-4 text-surface-500" />}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono text-surface-500">
                                                        {rowNumber}
                                                    </span>
                                                </td>
                                                {fieldColumns.map((field) => (
                                                    <td key={field.id} className="px-4 py-3">
                                                        <span className="text-sm text-surface-200 truncate block max-w-[200px]">
                                                            {formatValue(sub.data?.[field.name])}
                                                        </span>
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-surface-400">
                                                        {formatDate(sub.createdAt)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingSub(sub);
                                                        }}
                                                        className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expanded Detail Row */}
                                            {isExpanded && (
                                                <tr key={`${sub.id}-detail`} className="bg-surface-800/20">
                                                    <td colSpan={fieldColumns.length + 4} className="px-6 py-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {Object.entries(sub.data || {}).map(([key, value]) => {
                                                                const fieldDef = form?.fields?.find(f => f.name === key);
                                                                return (
                                                                    <div
                                                                        key={key}
                                                                        className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50"
                                                                    >
                                                                        <p className="text-xs font-medium text-surface-400 mb-1">
                                                                            {fieldDef?.label || key}
                                                                        </p>
                                                                        <p className="text-sm text-surface-100 break-words">
                                                                            {formatValue(value)}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="mt-3 flex items-center gap-4 text-xs text-surface-500">
                                                            <span className="flex items-center gap-1">
                                                                <FileText className="h-3.5 w-3.5" />
                                                                ID: {sub.id.slice(0, 8)}...
                                                            </span>
                                                            {sub.createdBy && (
                                                                <span className="flex items-center gap-1">
                                                                    <User className="h-3.5 w-3.5" />
                                                                    Submitted by: {sub.createdBy.slice(0, 8)}...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                            <p className="text-sm text-surface-400">
                                Showing {(pagination.page - 1) * pagination.limit + 1}–
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={pagination.page <= 1}
                                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="px-3 py-1 text-sm text-surface-300">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.totalPages)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingSub}
                onClose={() => setDeletingSub(null)}
                title="Delete Submission"
                description="Are you sure you want to delete this submission? This action cannot be undone."
            >
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeletingSub(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                        Delete Submission
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
