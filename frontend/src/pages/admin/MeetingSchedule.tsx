import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, User, Video, Play } from "lucide-react";
import { toast } from "sonner";

export function MeetingSchedule() {
    const token = useAuthStore((s) => s.token);
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        scheduledStart: '',
        scheduledEnd: '',
        maxParticipants: 100,
    });

    const loadSchedule = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await adminMeetingsApi.getSchedule(token);
            setMeetings(data);
        } catch (err) {
            toast.error('Failed to load meeting schedule');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedule();
    }, [token]);

    const handleMeetNow = async () => {
        if (!token) return;
        try {
            const { roomId } = await adminMeetingsApi.createInstantMeeting(token);
            navigate(`/room/${roomId}`);
            toast.success('Instant meeting started');
        } catch (err) {
            toast.error('Failed to start instant meeting');
        }
    };

    const handleStartMeeting = async (meetingId: string) => {
        if (!token) return;
        try {
            const { roomId } = await adminMeetingsApi.startMeeting(token, meetingId);
            navigate(`/room/${roomId}`);
            toast.success('Meeting started — you are now the host');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to start meeting');
        }
    };

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            // Basic validation
            if (!formData.title || !formData.scheduledStart || !formData.scheduledEnd) {
                toast.error('Please fill in all fields');
                return;
            }

            await adminMeetingsApi.schedule(token, {
                title: formData.title,
                scheduledStart: new Date(formData.scheduledStart).toISOString(),
                scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
                maxParticipants: formData.maxParticipants,
            });

            toast.success('Meeting scheduled successfully');
            setOpen(false);
            setFormData({
                title: '',
                scheduledStart: '',
                scheduledEnd: '',
                maxParticipants: 100,
            });
            loadSchedule();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to schedule meeting');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Meeting Schedule</h2>
                    <p className="text-muted-foreground">Plan and manage upcoming specialized sessions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" className="gap-2" onClick={handleMeetNow}>
                        <Video className="h-4 w-4" />
                        Meet Now
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Schedule Meeting
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Schedule New Meeting</DialogTitle>
                                <DialogDescription>
                                    Fill in the details below to broadcast a future session to authorized users.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSchedule} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Meeting Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="Weekly Strategy Session"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start">Start Date & Time</Label>
                                        <Input
                                            id="start"
                                            type="datetime-local"
                                            value={formData.scheduledStart}
                                            onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end">End Date & Time</Label>
                                        <Input
                                            id="end"
                                            type="datetime-local"
                                            value={formData.scheduledEnd}
                                            onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="participants">Max Participants</Label>
                                    <Input
                                        id="participants"
                                        type="number"
                                        value={formData.maxParticipants}
                                        onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button type="submit">Schedule Session</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Sessions</CardTitle>
                    <CardDescription>
                        A list of all meetings scheduled for the future.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Meeting Details</TableHead>
                                    <TableHead>Host</TableHead>
                                    <TableHead>Scheduled Period</TableHead>
                                    <TableHead className="text-right">Max Users</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Loading schedule...
                                        </TableCell>
                                    </TableRow>
                                ) : meetings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No upcoming meetings scheduled.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    meetings.map((meeting) => (
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
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        <span>{formatDate(meeting.scheduledStart)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                                        <Clock className="h-3 w-3" />
                                                        <span>To {formatDate(meeting.scheduledEnd)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline">
                                                    {meeting.maxParticipants}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => handleStartMeeting(meeting.id)}
                                                >
                                                    <Play className="h-3.5 w-3.5" />
                                                    Start
                                                </Button>
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
