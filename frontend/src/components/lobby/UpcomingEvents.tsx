import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Calendar, Clock, Video, ChevronRight } from 'lucide-react';

interface Meeting {
    id: string;
    title: string;
    roomCode: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
    host?: {
        displayName: string;
    };
}

export function UpcomingEvents({ onJoinRoom }: { onJoinRoom: (code: string) => void }) {
    const token = useAuthStore((s) => s.token);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        const fetchUpcoming = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/meetings/upcoming`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setMeetings(data);
                }
            } catch (err) {
                console.error('Failed to fetch upcoming meetings', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUpcoming();
    }, [token]);

    if (loading) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold px-1">Upcoming Sessions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl border border-border/50"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (meetings.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-normal tracking-tight font-heading">Upcoming Sessions</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Your schedule</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meetings.map((meeting) => {
                    const startDate = new Date(meeting.scheduledStart);
                    const isToday = startDate.toDateString() === new Date().toDateString();

                    return (
                        <div
                            key={meeting.id}
                            className="group relative bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isToday ? 'bg-orange-500/10 text-orange-600' : 'bg-primary/10 text-primary'
                                        }`}>
                                        {isToday ? 'Today' : startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-medium text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                        {meeting.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        with {meeting.host?.displayName || 'Teacher'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => onJoinRoom(meeting.roomCode)}
                                className="mt-6 w-full py-2.5 rounded-xl bg-muted/30 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <Video className="w-4 h-4" />
                                Join meeting
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
