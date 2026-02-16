import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { adminMeetingsApi } from '@/services/admin-meetings.service';
import type { AdminMeeting } from '@/services/admin-meetings.service';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, User } from "lucide-react";
import { toast } from "sonner";

export function MeetingHistory() {
    const token = useAuthStore((s) => s.token);
    const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const loadHistory = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await adminMeetingsApi.getHistory(token, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            setMeetings(data.meetings);
        } catch (err) {
            toast.error('Failed to load meeting history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [token, startDate, endDate]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const formatDuration = (start: string | null, end: string | null) => {
        if (!start || !end) return '-';
        const durationMs = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(durationMs / 60000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) return `${hours}h ${remainingMinutes}m`;
        return `${minutes}m`;
    };

    const filteredMeetings = meetings.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.roomCode.toLowerCase().includes(search.toLowerCase()) ||
        m.host?.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Meeting History</h2>
                    <p className="text-muted-foreground">Detailed records of all past communication sessions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search meetings or hosts..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">From</span>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">To</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Past Meetings</CardTitle>
                    <CardDescription>
                        A comprehensive list of ended sessions and their engagement metrics.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Meeting Info</TableHead>
                                    <TableHead>Host</TableHead>
                                    <TableHead>Started At</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="text-right">Peak Users</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Loading history...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredMeetings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No meeting records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMeetings.map((meeting) => (
                                        <TableRow key={meeting.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{meeting.title}</span>
                                                    <span className="text-xs text-muted-foreground">{meeting.roomCode}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">{meeting.host?.displayName || 'Unknown'}</span>
                                                        <span className="text-xs text-muted-foreground">{meeting.host?.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatDate(meeting.startedAt)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    {formatDuration(meeting.startedAt, meeting.endedAt)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary">
                                                    {meeting.peakParticipants}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
