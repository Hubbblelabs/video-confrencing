"use client";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, SearchX, Compass } from 'lucide-react';
import { SessionCard } from '../components/sessions/SessionCard';
import { SessionFilters } from '../components/sessions/SessionFilters';
import { sessionsApi } from '../services/api.service';
import { useAuthStore } from '../store/auth.store';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export function SessionBrowser() {
    const router = useRouter();
    const token = useAuthStore((s) => s.token);
    const [sessions, setSessions] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const limit = 24; // Increased limit for client-side filtering

    const [filters, setFilters] = useState({
        query: '',
        category: '',
        sortBy: 'date',
        order: 'DESC' as 'ASC' | 'DESC',
    });

    const [categories] = useState(['Development', 'Design', 'Marketing', 'Business', 'Lifestyle', 'Music']);

    const loadSessions = useCallback(async (isLoadMore = false) => {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);

        try {
            const currentOffset = isLoadMore ? offset + limit : 0;
            const data = await sessionsApi.getSessions({
                q: filters.query || undefined,
                category: filters.category || undefined,
                sortBy: filters.sortBy,
                order: filters.order,
                limit,
                offset: currentOffset,
            }, token || undefined);

            const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
            const activeSessions = data.sessions.filter((session: any) => {
                if (session.status === 'ENDED' || session.status === 'CANCELLED') return false;
                if (!session.scheduledStart) return true;
                return new Date(session.scheduledStart) > fourHoursAgo;
            });

            if (isLoadMore) {
                setSessions(prev => [...prev, ...activeSessions]);
                setOffset(currentOffset);
            } else {
                setSessions(activeSessions);
                setOffset(0);
            }
            // Ideally total would be filtered too, but we use backend total to know if there's more data
            setTotal(data.total);
        } catch (err) {
            console.error('Failed to load sessions', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filters, offset, token]);

    useEffect(() => {
        loadSessions();
    }, [filters.query, filters.category, filters.sortBy, filters.order]);

    // ... (existing imports)

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
            {/* Header / Navbar */}
            <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all group border border-transparent hover:border-border"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Compass className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight leading-none">
                                    Discovery
                                </h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">
                                    {total} Sessions Available
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                            Live Learning
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Hero / Filter Section */}
            <div className="relative pt-16 pb-12 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-primary/5 blur-[100px] rounded-full opacity-60 pointer-events-none" />

                <div className="max-w-[1600px] mx-auto px-6 relative z-10">
                    <div className="text-center space-y-6 mb-16">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-foreground">
                            Learn from the <span className="italic relative inline-block">
                                Best.
                                <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0 50 Q 50 100 100 50" stroke="currentColor" strokeWidth="20" fill="none" />
                                </svg>
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
                            Join high-quality interactive sessions hosted by expert teachers from around the world.
                        </p>
                    </div>

                    <SessionFilters
                        categories={categories}
                        onSearch={(q) => setFilters(f => ({ ...f, query: q }))}
                        onCategoryChange={(c) => setFilters(f => ({ ...f, category: c }))}
                        onSortChange={(s) => setFilters(f => ({ ...f, sortBy: s as any }))}
                    />
                </div>
            </div>

            {/* Grid Section */}
            <main className="max-w-[1600px] mx-auto px-6 pb-24 flex-1">
                {loading && !loadingMore ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-muted-foreground font-medium animate-pulse">Syncing catalog...</p>
                    </div>
                ) : sessions.length > 0 ? (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            <AnimatePresence mode="popLayout">
                                {sessions.map((session) => (
                                    <SessionCard
                                        key={session.id}
                                        session={session}
                                        onClick={(id) => router.push(`/sessions/${id}`)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Load More */}
                        {sessions.length < total && (
                            <div className="flex justify-center pt-8">
                                <button
                                    onClick={() => loadSessions(true)}
                                    disabled={loadingMore}
                                    className="px-10 py-4 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-2xl border-2 border-border transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <span>Load More Sessions</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                            <SearchX className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">No sessions found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            We couldn't find any sessions matching your current filters. Try adjusting your search query or categories.
                        </p>
                        <button
                            onClick={() => setFilters({ query: '', category: '', sortBy: 'date', order: 'DESC' })}
                            className="mt-8 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all"
                        >
                            Reset all filters
                        </button>
                    </motion.div>
                )}
            </main>

            {/* Footer Ambience */}
            <footer className="py-12 border-t border-border/50 bg-muted/5">
                <div className="max-w-[1600px] mx-auto px-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Showing {sessions.length} of {total} available sessions
                    </p>
                </div>
            </footer>
        </div>
    );
}
