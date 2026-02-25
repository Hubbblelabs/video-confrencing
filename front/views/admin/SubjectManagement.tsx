"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { subjectsApi } from '@/services/subjects.service';
import { adminUsersApi } from '@/services/admin-users.service';
import type { Subject } from '@/services/subjects.service';
import type { AdminUser } from '@/services/admin-users.service';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    BookOpen,
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Users,
    GraduationCap,
    UserPlus,
    UserMinus,
    X,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

export function SubjectManagement() {
    const token = useAuthStore((s) => s.token);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Create/edit dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '#3b82f6' });

    // Manage teachers dialog
    const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [allTeachers, setAllTeachers] = useState<AdminUser[]>([]);
    const [teachersLoading, setTeachersLoading] = useState(false);

    // Manage students dialog
    const [studentDialogOpen, setStudentDialogOpen] = useState(false);
    const [allStudents, setAllStudents] = useState<AdminUser[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);

    const loadSubjects = useCallback(async () => {
        if (!token) return;
        try {
            const data = await subjectsApi.getAll(token);
            setSubjects(data);
        } catch (err) {
            toast.error('Failed to load subjects');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadSubjects(); }, [loadSubjects]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !formData.name) return;

        try {
            if (editingSubject) {
                await subjectsApi.update(token, editingSubject.id, formData);
                toast.success('Subject updated');
            } else {
                await subjectsApi.create(token, formData);
                toast.success('Subject created');
            }
            setDialogOpen(false);
            resetForm();
            loadSubjects();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save subject');
        }
    };

    const handleDelete = async (subject: Subject) => {
        if (!token) return;
        try {
            await subjectsApi.delete(token, subject.id);
            toast.success(`"${subject.name}" deleted`);
            loadSubjects();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    const openCreateDialog = () => {
        resetForm();
        setEditingSubject(null);
        setDialogOpen(true);
    };

    const openEditDialog = (subject: Subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            description: subject.description || '',
            icon: subject.icon || '',
            color: subject.color || '#3b82f6',
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', icon: '', color: '#3b82f6' });
    };

    // ─── TEACHER MANAGEMENT ──────────────────────

    const openTeacherDialog = async (subject: Subject) => {
        if (!token) return;
        setSelectedSubject(subject);
        setTeacherDialogOpen(true);
        setTeachersLoading(true);
        try {
            const teachers = await adminUsersApi.getAll(token, 'TEACHER' as any);
            setAllTeachers(teachers);
        } catch {
            toast.error('Failed to load teachers');
        } finally {
            setTeachersLoading(false);
        }
    };

    const handleAssignTeacher = async (teacherId: string) => {
        if (!token || !selectedSubject) return;
        try {
            await subjectsApi.assignTeacher(token, selectedSubject.id, teacherId);
            toast.success('Teacher assigned');
            loadSubjects();
            // Refresh selected subject data
            const updated = await subjectsApi.getAll(token);
            const found = updated.find(s => s.id === selectedSubject.id);
            if (found) setSelectedSubject(found);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to assign');
        }
    };

    const handleRemoveTeacher = async (teacherId: string) => {
        if (!token || !selectedSubject) return;
        try {
            await subjectsApi.removeTeacher(token, selectedSubject.id, teacherId);
            toast.success('Teacher removed');
            loadSubjects();
            const updated = await subjectsApi.getAll(token);
            const found = updated.find(s => s.id === selectedSubject.id);
            if (found) setSelectedSubject(found);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    // ─── STUDENT MANAGEMENT ──────────────────────

    const openStudentDialog = async (subject: Subject) => {
        if (!token) return;
        setSelectedSubject(subject);
        setStudentDialogOpen(true);
        setStudentsLoading(true);
        try {
            const students = await adminUsersApi.getAll(token, 'STUDENT' as any);
            setAllStudents(students);
        } catch {
            toast.error('Failed to load students');
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleGrantAccess = async (studentId: string) => {
        if (!token || !selectedSubject) return;
        try {
            await subjectsApi.grantStudentAccess(token, selectedSubject.id, studentId);
            toast.success('Access granted');
            loadSubjects();
            const updated = await subjectsApi.getAll(token);
            const found = updated.find(s => s.id === selectedSubject.id);
            if (found) setSelectedSubject(found);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to grant access');
        }
    };

    const handleRevokeAccess = async (studentId: string) => {
        if (!token || !selectedSubject) return;
        try {
            await subjectsApi.revokeStudentAccess(token, selectedSubject.id, studentId);
            toast.success('Access revoked');
            loadSubjects();
            const updated = await subjectsApi.getAll(token);
            const found = updated.find(s => s.id === selectedSubject.id);
            if (found) setSelectedSubject(found);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to revoke access');
        }
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const isTeacherAssigned = (teacherId: string) =>
        selectedSubject?.teachers?.some(t => t.teacherId === teacherId) ?? false;

    const isStudentGranted = (studentId: string) =>
        selectedSubject?.students?.some(s => s.studentId === studentId) ?? false;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subject Management</h1>
                    <p className="text-muted-foreground">Create subjects, assign teachers, and control student access</p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2 shrink-0">
                    <Plus className="h-4 w-4" />
                    New Subject
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search subjects..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Teachers</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        {subjects.length === 0 ? 'No subjects yet — create one to get started' : 'No subjects match your search'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubjects.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `${subject.color || '#3b82f6'}20`, color: subject.color || '#3b82f6' }}
                                                >
                                                    <BookOpen className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{subject.name}</div>
                                                    {subject.description && (
                                                        <div className="text-xs text-muted-foreground line-clamp-1">{subject.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1.5 text-muted-foreground hover:text-foreground"
                                                onClick={() => openTeacherDialog(subject)}
                                            >
                                                <GraduationCap className="h-3.5 w-3.5" />
                                                {subject._count?.teachers || 0}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1.5 text-muted-foreground hover:text-foreground"
                                                onClick={() => openStudentDialog(subject)}
                                            >
                                                <Users className="h-3.5 w-3.5" />
                                                {subject._count?.students || 0}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={subject.isActive ? "default" : "secondary"}>
                                                {subject.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openTeacherDialog(subject)}>
                                                        <GraduationCap className="h-4 w-4 mr-2" /> Manage Teachers
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openStudentDialog(subject)}>
                                                        <Users className="h-4 w-4 mr-2" /> Manage Students
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(subject)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
                        <DialogDescription>
                            {editingSubject ? 'Update the subject details below.' : 'Add a new subject to the platform.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="subject-name">Name</Label>
                            <Input
                                id="subject-name"
                                placeholder="e.g. Mathematics"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject-desc">Description</Label>
                            <Textarea
                                id="subject-desc"
                                placeholder="Brief description of the subject..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`w-8 h-8 rounded-lg border-2 transition-all ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setFormData({ ...formData, color: c })}
                                    />
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">{editingSubject ? 'Save Changes' : 'Create Subject'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Teachers Dialog */}
            <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            Teachers — {selectedSubject?.name}
                        </DialogTitle>
                        <DialogDescription>Assign or remove teachers for this subject.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[400px] overflow-auto py-2">
                        {teachersLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : allTeachers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No teachers found in the system</p>
                        ) : (
                            allTeachers.map((teacher) => {
                                const assigned = isTeacherAssigned(teacher.id);
                                return (
                                    <div key={teacher.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                {teacher.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{teacher.displayName}</div>
                                                <div className="text-xs text-muted-foreground">{teacher.email}</div>
                                            </div>
                                        </div>
                                        {assigned ? (
                                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleRemoveTeacher(teacher.id)}>
                                                <UserMinus className="h-3.5 w-3.5" /> Remove
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAssignTeacher(teacher.id)}>
                                                <UserPlus className="h-3.5 w-3.5" /> Assign
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Students Dialog */}
            <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Student Access — {selectedSubject?.name}
                        </DialogTitle>
                        <DialogDescription>Control which students can see this subject.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[400px] overflow-auto py-2">
                        {studentsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : allStudents.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No students found in the system</p>
                        ) : (
                            allStudents.map((student) => {
                                const granted = isStudentGranted(student.id);
                                return (
                                    <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-xs font-bold">
                                                {student.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{student.displayName}</div>
                                                <div className="text-xs text-muted-foreground">{student.email}</div>
                                            </div>
                                        </div>
                                        {granted ? (
                                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleRevokeAccess(student.id)}>
                                                <X className="h-3.5 w-3.5" /> Revoke
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleGrantAccess(student.id)}>
                                                <UserPlus className="h-3.5 w-3.5" /> Grant
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
