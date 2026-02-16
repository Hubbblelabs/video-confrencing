import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { adminUsersApi } from '@/services/admin-users.service';
import type { AdminUser, UpdateAdminUserRequest } from '@/services/admin-users.service';
import type { UserRole } from '@/types/api.types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UserFormData {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    isActive: boolean;
}

export function UserManagement() {
    const token = useAuthStore((s) => s.token);
    const currentUserId = useAuthStore((s) => s.userId);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        email: '',
        password: '',
        displayName: '',
        role: 'STUDENT',
        isActive: true,
    });
    const [submitting, setSubmitting] = useState(false);

    const loadUsers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const role = filterRole === 'ALL' ? undefined : filterRole;
            const data = await adminUsersApi.getAll(token, role);
            setUsers(data);
        } catch (err) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [token, filterRole]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setSubmitting(true);
        try {
            if (editingUser) {
                const data: UpdateAdminUserRequest = {
                    displayName: formData.displayName,
                    isActive: formData.isActive,
                };

                if (formData.email !== editingUser.email) data.email = formData.email;
                if (formData.password) data.password = formData.password;

                await adminUsersApi.update(token, editingUser.id, data);
                if (formData.role !== editingUser.role) {
                    await adminUsersApi.updateRole(token, editingUser.id, { role: formData.role });
                }
                toast.success('User updated successfully');
            } else {
                await adminUsersApi.create(token, formData);
                toast.success('User created successfully');
            }
            setIsDialogOpen(false);
            resetForm();
            loadUsers();
        } catch (err: any) {
            toast.error(err.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (user: AdminUser) => {
        if (!token) return;
        if (user.id === currentUserId) {
            toast.error('You cannot delete your own account');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${user.displayName}?`)) return;

        try {
            await adminUsersApi.delete(token, user.id);
            toast.success('User deleted');
            loadUsers();
        } catch (err) {
            toast.error('Failed to delete user');
        }
    };

    const openCreateDialog = () => {
        setEditingUser(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (user: AdminUser) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            displayName: user.displayName,
            role: user.role,
            isActive: user.isActive,
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            displayName: '',
            role: 'STUDENT',
            isActive: true,
        });
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'ADMIN': return <Badge variant="destructive">Admin</Badge>;
            case 'TEACHER': return <Badge variant="secondary">Teacher</Badge>;
            case 'STUDENT': return <Badge variant="default">Student</Badge>;
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    const filteredUsers = users.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Roles</SelectItem>
                            <SelectItem value="STUDENT">Students</SelectItem>
                            <SelectItem value="TEACHER">Teachers</SelectItem>
                            <SelectItem value="ADMIN">Admins</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Create User
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                        Loading users...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                                {user.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.displayName}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <span className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></span>
                                                Inactive
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                {user.id !== currentUserId && (
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        onClick={() => handleDeleteUser(user)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                        <DialogDescription>
                            {editingUser ? 'Update user details and permissions.' : 'Add a new member to the platform.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                Password {editingUser && '(leave blank to keep current)'}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                                minLength={8}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                            >
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STUDENT">Student</SelectItem>
                                    <SelectItem value="TEACHER">Teacher</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                            />
                            <Label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
                                Active Account
                            </Label>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
