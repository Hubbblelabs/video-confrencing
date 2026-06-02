import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Calendar, Clock, Video, ChevronRight, Radio } from 'lucide-react';
import { sessionsApi } from '../../services/api.service';
import type { Session } from '../../types/api.types';

export function UpcomingEvents({ onJoinRoom }: { onJoinRoom: (code: string) => void }) {
    const token = useAuthStore((s) => s.token);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        const fetchUpcoming = async () => {
            try {
                const data = await sessionsApi.getSessions({
                    sortBy: 'date',
                    order: 'ASC',
                    limit: 6,
                    offset: 0,
                }, token);

                const now = new Date();
                const relevant = data.sessions.filter((s) => {
                    if (s.status === 'active' || s.status === 'waiting') return true;
                    if (s.status === 'scheduled') {
                        if (!s.scheduledStart) return true;
                        return new Date(s.scheduledStart) >= now;
                    }
                    return false;
                });

                setSessions(relevant);
            } catch {
                // Silently ignore — component shows empty state
            } finally {
                setLoading(false);
            }
        };

        fetchUpcoming();
        // Poll every 30 s so ended meetings disappear without a manual refresh
        const interval = setInterval(fetchUpcoming, 30_000);
        return () => clearInterval(interval);
    }, [token]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl border border-border/50" />
                ))}
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No upcoming classes scheduled.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Browse the catalog to find and join live sessions.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
                const isLive = session.status === 'active' || session.status === 'waiting';
                const startDate = session.scheduledStart ? new Date(session.scheduledStart) : null;
                const isToday = startDate ? startDate.toDateString() === new Date().toDateString() : false;

                return (
                    <div
                        key={session.id}
                        className="group relative bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col justify-between"
                    >
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                {isLive ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600">
                                        <Radio className="w-3 h-3 animate-pulse" />
                                        Live Now
                                    </div>
                                ) : (
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isToday ? 'bg-orange-500/10 text-orange-600' : 'bg-primary/10 text-primary'}`}>
                                        {isToday ? 'Today' : startDate ? startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Upcoming'}
                                    </div>
                                )}
                                {startDate && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-medium text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                    {session.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    with {session.host?.displayName || 'Teacher'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => session.roomCode && onJoinRoom(session.roomCode)}
                            disabled={!session.roomCode}
                            className="mt-6 w-full py-2.5 rounded-xl bg-muted/30 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Video className="w-4 h-4" />
                            {isLive ? 'Join Now' : 'Join Session'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
