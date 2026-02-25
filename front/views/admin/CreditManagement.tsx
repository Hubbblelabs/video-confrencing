"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { adminCreditsApi, type StudentWallet } from '@/services/admin-credits.service';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Coins, Wallet, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export function CreditManagement() {
    const token = useAuthStore((s) => s.token);
    const [students, setStudents] = useState<StudentWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentWallet | null>(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await adminCreditsApi.getStudentWallets(token, search || undefined);
            setStudents(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch students');
        } finally {
            setLoading(false);
        }
    }, [token, search]);

    useEffect(() => {
        const timer = setTimeout(() => fetchStudents(), 300);
        return () => clearTimeout(timer);
    }, [fetchStudents]);

    const handleAddCredits = async () => {
        if (!token || !selectedStudent || !creditAmount) return;

        const amount = parseInt(creditAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid positive number');
            return;
        }

        setSubmitting(true);
        try {
            await adminCreditsApi.addCredits(token, selectedStudent.userId, amount);
            toast.success(`Added ${amount} credits to ${selectedStudent.displayName}`);
            setDialogOpen(false);
            setCreditAmount('');
            setSelectedStudent(null);
            fetchStudents();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add credits');
        } finally {
            setSubmitting(false);
        }
    };

    const openAddDialog = (student: StudentWallet) => {
        setSelectedStudent(student);
        setCreditAmount('');
        setDialogOpen(true);
    };

    // Stats
    const totalStudents = students.length;
    const totalCredits = students.reduce((sum, s) => sum + s.balance, 0);
    const avgCredits = totalStudents > 0 ? Math.round(totalCredits / totalStudents) : 0;
    const lowBalanceCount = students.filter(s => s.balance < 5).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Credit Management</h2>
                <p className="text-muted-foreground">
                    Manage student credits. 1 credit = 1 minute of meeting time.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCredits}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg per Student</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgCredits}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{lowBalanceCount}</div>
                        <p className="text-xs text-muted-foreground">Below 5 credits</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Student Wallets</CardTitle>
                    <CardDescription>View and manage credits for all students</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Search */}
                    <div className="mb-4 flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {search ? 'No students found matching your search.' : 'No students found.'}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-center">Balance</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.userId}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {student.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium">{student.displayName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {student.email}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={student.balance < 5 ? "destructive" : student.balance < 20 ? "secondary" : "default"}
                                                    className="tabular-nums"
                                                >
                                                    <Coins className="mr-1 h-3 w-3" />
                                                    {student.balance}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openAddDialog(student)}
                                                    className="gap-1"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add Credits
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Credits Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Credits</DialogTitle>
                        <DialogDescription>
                            Add credits to <span className="font-semibold text-foreground">{selectedStudent?.displayName}</span>.
                            Each credit equals 1 minute of meeting time.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground w-28">Current Balance:</div>
                            <Badge variant="secondary" className="tabular-nums">
                                <Coins className="mr-1 h-3 w-3" />
                                {selectedStudent?.balance ?? 0}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground w-28">Credits to Add:</div>
                            <Input
                                type="number"
                                min="1"
                                placeholder="Enter amount..."
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                                className="flex-1"
                                autoFocus
                            />
                        </div>
                        {creditAmount && parseInt(creditAmount) > 0 && (
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground w-28">New Balance:</div>
                                <Badge className="tabular-nums">
                                    <Coins className="mr-1 h-3 w-3" />
                                    {(selectedStudent?.balance ?? 0) + parseInt(creditAmount || '0')}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    ({parseInt(creditAmount)} min of meeting time)
                                </span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCredits}
                            disabled={submitting || !creditAmount || parseInt(creditAmount) <= 0}
                        >
                            {submitting ? 'Adding...' : 'Add Credits'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
