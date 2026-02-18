import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, Mail, UserCheck, UserX, Trash2 } from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardContent,
    Badge,
    Avatar,
    Modal,
    ModalFooter,
    Pagination
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { listUsers, createUser, updateUserStatus, deleteUser, resendInvitation } from '../../api/users';
import type { User } from '../../types';

const statusVariants: Record<User['status'], 'success' | 'warning' | 'error' | 'info'> = {
    ACTIVE: 'success',
    PENDING: 'warning',
    INACTIVE: 'info',
    SUSPENDED: 'error',
};

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Load users from API
    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listUsers({
                page,
                limit,
                status: statusFilter !== 'all' ? statusFilter as User['status'] : undefined,
                search: searchQuery || undefined,
            });
            setUsers(response.items);
            setTotalCount(response.total);
            setTotalPages(response.totalPages);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchQuery, page, limit]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Reset to page 1 when filters change
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(1);
    };

    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(status);
        setPage(1);
    };

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
        setPage(1);
    };

    const handleStatusChange = async (userId: string, newStatus: User['status']) => {
        try {
            await updateUserStatus(userId, newStatus);
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update status');
        }
        setOpenDropdown(null);
    };

    const handleResendInvite = async (userId: string) => {
        try {
            await resendInvitation(userId);
            // Show success feedback (could add toast notification)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invite');
        }
        setOpenDropdown(null);
    };

    const handleDelete = async (userId: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await deleteUser(userId);
                setUsers(users.filter(u => u.id !== userId));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete user');
            }
        }
        setOpenDropdown(null);
    };

    const handleAddUser = async (userData: { email: string; firstName: string; lastName: string }) => {
        try {
            const newUser = await createUser(userData);
            setUsers([...users, newUser]);
            setIsAddModalOpen(false);
        } catch (err) {
            throw err; // Let modal handle error
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Users</h1>
                    <p className="mt-1 text-surface-400">Manage your team members and their permissions</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                leftIcon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusFilterChange(status)}
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

            {/* Users table */}
            <Card>
                <CardHeader title={`${totalCount} users`} />
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-700/50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                                    Joined
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
                                        Loading users...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-surface-400">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-surface-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={`${user.firstName} ${user.lastName}`} />
                                                <div>
                                                    <p className="font-medium text-surface-100">
                                                        {user.firstName} {user.lastName}
                                                    </p>
                                                    <p className="text-sm text-surface-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={statusVariants[user.status]}>
                                                {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-surface-200">{user.roles?.[0] || 'User'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-surface-400 text-sm">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                                    className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                                {openDropdown === user.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 animate-fade-in">
                                                        <div className="p-1">
                                                            <button
                                                                onClick={() => handleResendInvite(user.id)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                                            >
                                                                <Mail className="h-4 w-4" />
                                                                Send invite
                                                            </button>
                                                            {user.status !== 'ACTIVE' && (
                                                                <button
                                                                    onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <UserCheck className="h-4 w-4" />
                                                                    Activate
                                                                </button>
                                                            )}
                                                            {user.status === 'ACTIVE' && (
                                                                <button
                                                                    onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <UserX className="h-4 w-4" />
                                                                    Suspend
                                                                </button>
                                                            )}
                                                            <hr className="my-1 border-surface-700" />
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
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
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={totalCount}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={handleLimitChange}
                />
            </Card>

            {/* Add User Modal */}
            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddUser}
            />
        </div>
    );
}

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (userData: { email: string; firstName: string; lastName: string }) => Promise<void>;
}

function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await onAdd(formData);
            setFormData({ email: '', firstName: '', lastName: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New User"
            description="Send an invitation to join your workspace"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                    />
                    <Input
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                    />
                </div>
                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        Send Invitation
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
