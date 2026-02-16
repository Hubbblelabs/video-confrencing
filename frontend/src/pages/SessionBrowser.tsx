import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, SearchX, Compass } from 'lucide-react';
import { SessionCard } from '../components/sessions/SessionCard';
import { SessionFilters } from '../components/sessions/SessionFilters';
import { sessionsApi } from '../services/api.service';
import { useAuthStore } from '../store/auth.store';

interface SessionBrowserProps {
    onBack: () => void;
    onSessionDetails: (id: string) => void;
}

export function SessionBrowser({ onBack, onSessionDetails }: SessionBrowserProps) {
    const token = useAuthStore((s) => s.token);
    const [sessions, setSessions] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const limit = 12;

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

            if (isLoadMore) {
                setSessions(prev => [...prev, ...data.sessions]);
                setOffset(currentOffset);
            } else {
                setSessions(data.sessions);
                setOffset(0);
            }
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

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
            {/* Header / Navbar */}
            <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2.5 rounded-2xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                <Compass className="w-5 h-5 text-primary" />
                                Discovery
                            </h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                                {total} Sessions Available
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                            Live Learning
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero / Filter Section */}
            <div className="relative pt-12 pb-16 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-primary/10 blur-[120px] rounded-full opacity-50 pointer-events-none" />

                <div className="max-w-[1600px] mx-auto px-6 relative z-10">
                    <div className="text-center space-y-4 mb-12">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
                            Learn from the <span className="text-primary italic">Best.</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
                                        onClick={onSessionDetails}
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
