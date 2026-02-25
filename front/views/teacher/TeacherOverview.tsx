"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Video,
    Clock,
    Users,
    Calendar,
    Plus,
    Play,
    BookOpen,
    TrendingUp,
    ChevronRight,
    Zap,
} from "lucide-react";
import { useAuthStore } from '@/store/auth.store';
import { attendanceApi } from '@/services/attendance.service';
import { adminMeetingsApi } from '@/services/admin-meetings.service';
import type { AdminMeeting } from '@/services/admin-meetings.service';
import type { AttendanceStatistics } from '@/services/attendance.service';
import { toast } from "sonner";

export function TeacherOverview() {
    const token = useAuthStore((s) => s.token);
    const displayName = useAuthStore((s) => s.displayName);
    const router = useRouter();

    const [attendanceStats, setAttendanceStats] = useState<AttendanceStatistics | null>(null);
    const [upcomingMeetings, setUpcomingMeetings] = useState<AdminMeeting[]>([]);
    const [recentMeetings, setRecentMeetings] = useState<AdminMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        scheduledStart: '',
        scheduledEnd: '',
        maxParticipants: 50,
        allowScreenShare: true,
        allowWhiteboard: true,
    });

    useEffect(() => {
        async function loadData() {
            if (!token) return;
            try {
                const [aStats, schedule, history] = await Promise.all([
                    attendanceApi.getStatistics(token),
                    adminMeetingsApi.getSchedule(token),
                    adminMeetingsApi.getHistory(token, { limit: 5 }),
                ]);
                setAttendanceStats(aStats);
                setUpcomingMeetings(schedule);
                setRecentMeetings(history.meetings.slice(0, 5));
            } catch (err) {
                console.error('Failed to load teacher dashboard data', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [token]);

    const handleMeetNow = async () => {
        if (!token) return;
        try {
            const { roomId } = await adminMeetingsApi.createInstantMeeting(token);
            router.push(`/room/${roomId}`);
            toast.success('Class started — students can join now!');
        } catch (err) {
            toast.error('Failed to start instant class');
        }
    };

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (!formData.title || !formData.scheduledStart || !formData.scheduledEnd) {
            toast.error('Please fill in all fields');
            return;
        }
        try {
            await adminMeetingsApi.schedule(token, {
                title: formData.title,
                scheduledStart: new Date(formData.scheduledStart).toISOString(),
                scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
                maxParticipants: formData.maxParticipants,
                allowScreenShare: formData.allowScreenShare,
                allowWhiteboard: formData.allowWhiteboard,
            });
            toast.success('Class scheduled successfully!');
            setScheduleOpen(false);
            setFormData({ title: '', scheduledStart: '', scheduledEnd: '', maxParticipants: 50, allowScreenShare: true, allowWhiteboard: true });
            // Reload schedule
            const schedule = await adminMeetingsApi.getSchedule(token);
            setUpcomingMeetings(schedule);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to schedule class');
        }
    };

    const handleStartMeeting = async (meetingId: string) => {
        if (!token) return;
        try {
            const { roomId } = await adminMeetingsApi.startMeeting(token, meetingId);
            router.push(`/room/${roomId}`);
            toast.success('Class started — you are now the host');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to start class');
        }
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
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

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Filter today's upcoming meetings
    const todayMeetings = upcomingMeetings.filter(m => {
        if (!m.scheduledStart) return false;
        return new Date(m.scheduledStart).toDateString() === new Date().toDateString();
    });

    const totalTeachingHours = attendanceStats ? Math.round((attendanceStats.totalMinutes || 0) / 60) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {greeting()},{' '}
                        <span className="text-primary">
                            {displayName?.split(' ')[0] || 'Teacher'}
                        </span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's your teaching workspace for today.
                    </p>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Instant Class */}
                <Card className="group relative overflow-hidden border-dashed hover:border-primary/40 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/5" onClick={handleMeetNow}>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="relative p-6 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <Zap className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold">Start Instant Class</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Create a live room and start teaching right away
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardContent>
                </Card>

                {/* Schedule a Class */}
                <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                    <DialogTrigger asChild>
                        <Card className="group relative overflow-hidden border-dashed hover:border-orange-500/40 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-orange-500/5">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardContent className="relative p-6 flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-110 transition-transform duration-300">
                                    <Plus className="w-7 h-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold">Schedule a Class</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Plan a future session for your students
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Schedule a New Class</DialogTitle>
                            <DialogDescription>
                                Plan a future session. Students will see this on their dashboard.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSchedule} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="class-title">Class Title</Label>
                                <Input
                                    id="class-title"
                                    placeholder="e.g. Mathematics — Chapter 5"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="class-start">Start</Label>
                                    <Input
                                        id="class-start"
                                        type="datetime-local"
                                        value={formData.scheduledStart}
                                        onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class-end">End</Label>
                                    <Input
                                        id="class-end"
                                        type="datetime-local"
                                        value={formData.scheduledEnd}
                                        onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class-max">Max Students</Label>
                                <Input
                                    id="class-max"
                                    type="number"
                                    value={formData.maxParticipants}
                                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowScreenShare}
                                        onChange={(e) => setFormData({ ...formData, allowScreenShare: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 focus:ring-blue-500"
                                    />
                                    Allow Participant Screen Share
                                </Label>
                                <Label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowWhiteboard}
                                        onChange={(e) => setFormData({ ...formData, allowWhiteboard: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 focus:ring-blue-500"
                                    />
                                    Allow Participant Whiteboard
                                </Label>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                                <Button type="submit">Schedule Class</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Sessions</CardTitle>
                        <Video className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats?.totalSessions || 0}</div>
                        <p className="text-xs text-muted-foreground">Total classes hosted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Students Reached</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats?.uniqueRooms || 0}</div>
                        <p className="text-xs text-muted-foreground">Unique class rooms</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teaching Hours</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTeachingHours}h</div>
                        <p className="text-xs text-muted-foreground">
                            {attendanceStats?.totalMinutes || 0} minutes total
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
                        <p className="text-xs text-muted-foreground">Scheduled classes</p>
                    </CardContent>
                </Card>
            </div>

            {/* Two-column layout: Today's Schedule + Recent Classes */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Today's Schedule */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Today's Schedule
                        </CardTitle>
                        <CardDescription>
                            {todayMeetings.length > 0
                                ? `You have ${todayMeetings.length} class${todayMeetings.length > 1 ? 'es' : ''} today`
                                : 'No classes scheduled for today'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {todayMeetings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Calendar className="w-7 h-7 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground text-sm">Your day is free — start an instant class or schedule one!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayMeetings.map((meeting) => (
                                    <div
                                        key={meeting.id}
                                        className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-primary leading-none">
                                                    {formatTime(meeting.scheduledStart)}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-medium truncate">{meeting.title}</h4>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTime(meeting.scheduledStart)} – {formatTime(meeting.scheduledEnd)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        Max {meeting.maxParticipants}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="gap-1.5 shrink-0"
                                            onClick={() => handleStartMeeting(meeting.id)}
                                        >
                                            <Play className="h-3.5 w-3.5" />
                                            Start
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Classes */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Recent Classes
                        </CardTitle>
                        <CardDescription>Your last few completed sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentMeetings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Video className="w-7 h-7 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground text-sm">No classes completed yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentMeetings.map((meeting) => (
                                    <div key={meeting.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                            <Video className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">{meeting.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDate(meeting.startedAt)} · {formatDuration(meeting.startedAt, meeting.endedAt)}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="shrink-0 tabular-nums">
                                            <Users className="h-3 w-3 mr-1" />
                                            {meeting.peakParticipants}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
