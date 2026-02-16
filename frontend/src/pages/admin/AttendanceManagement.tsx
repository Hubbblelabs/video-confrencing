import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { attendanceApi } from '@/services/attendance.service';
import type { AttendanceRecord, UserAttendanceSummary } from '@/services/attendance.service';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, Video, UserCircle } from "lucide-react";
import { toast } from "sonner";

export function AttendanceManagement() {
    const token = useAuthStore((s) => s.token);

    const [activeTab, setActiveTab] = useState('records');
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [userSummaries, setUserSummaries] = useState<UserAttendanceSummary[]>([]);
    const [activeSessions, setActiveSessions] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchEmail, setSearchEmail] = useState('');

    const loadData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const filters = {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };

            if (activeTab === 'records') {
                const data = await attendanceApi.getRecords(token, { ...filters, limit: 100 });
                setRecords(data.records);
            } else if (activeTab === 'summary') {
                const data = await attendanceApi.getSummary(token, { ...filters, limit: 50 });
                setUserSummaries(data.users);
            } else if (activeTab === 'active') {
                const data = await attendanceApi.getActiveSessions(token);
                setActiveSessions(data);
            }
        } catch (err) {
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, activeTab, startDate, endDate]);

    const formatDuration = (seconds: number | null) => {
        if (seconds === null) return 'In Progress';
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours > 0) return `${hours}h ${remainingMinutes}m`;
        return `${minutes}m`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filteredRecords = searchEmail
        ? records.filter((r) => r.userEmail.toLowerCase().includes(searchEmail.toLowerCase()))
        : records;

    const filteredSummaries = searchEmail
        ? userSummaries.filter((u) => u.userEmail.toLowerCase().includes(searchEmail.toLowerCase()))
        : userSummaries;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Filter Results</CardTitle>
                    <CardDescription>Narrow down attendance data by date or user email</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="start-date">Start Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="start-date"
                                    type="date"
                                    className="pl-9"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date">End Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="end-date"
                                    type="date"
                                    className="pl-9"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="search">Search User</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="email@example.com"
                                    className="pl-9"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="records" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-3">
                    <TabsTrigger value="records">Records</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                </TabsList>

                <div className="mt-4 rounded-md border bg-card">
                    <TabsContent value="records" className="m-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Room</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined / Left</TableHead>
                                    <TableHead>Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
                                ) : filteredRecords.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-10">No records found</TableCell></TableRow>
                                ) : (
                                    filteredRecords.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{record.userName}</span>
                                                    <span className="text-xs text-muted-foreground">{record.userEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <Video className="h-3.5 w-3.5 text-primary" />
                                                    {record.roomTitle || 'General Room'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{record.role.toLowerCase()}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(record.joinedAt)}</span>
                                                    {record.leftAt && <span className="flex items-center gap-1"><LogOutIcon className="h-3 w-3" /> {formatDate(record.leftAt)}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatDuration(record.durationSeconds)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="summary" className="m-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-center">Sessions</TableHead>
                                    <TableHead>Total Time</TableHead>
                                    <TableHead>Last Attended</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                                ) : filteredSummaries.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10">No summaries found</TableCell></TableRow>
                                ) : (
                                    filteredSummaries.map((summary) => (
                                        <TableRow key={summary.userId}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <UserCircle className="h-8 w-8 text-muted-foreground/50" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{summary.userName}</span>
                                                        <span className="text-xs text-muted-foreground">{summary.userEmail}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {summary.totalSessions}
                                            </TableCell>
                                            <TableCell className="font-medium text-primary">
                                                {summary.totalMinutes}m
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {summary.lastAttended ? formatDate(summary.lastAttended) : 'Never'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="active" className="m-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Room</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                                ) : activeSessions.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No active sessions</TableCell></TableRow>
                                ) : (
                                    activeSessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{session.userName}</span>
                                                    <span className="text-xs text-muted-foreground">{session.userEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{session.roomTitle || 'Default'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{formatDate(session.joinedAt)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-xs font-semibold text-green-500 uppercase">Live</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function LogOutIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
    )
}
