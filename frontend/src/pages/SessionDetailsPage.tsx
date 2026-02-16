import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Users, Clock, Tag, Shield, Globe, PlayCircle, Loader2 } from 'lucide-react';
import { sessionsApi } from '../services/api.service';
import { useAuthStore } from '../store/auth.store';

interface SessionDetailsPageProps {
    sessionId: string;
    onBack: () => void;
    onJoinRoom: (roomCode: string) => Promise<void>;
}

export default function SessionDetailsPage({ sessionId, onBack, onJoinRoom }: SessionDetailsPageProps) {
    const token = useAuthStore((s) => s.token);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const data = await sessionsApi.getSession(sessionId, token || undefined);
                setSession(data);
            } catch (err) {
                console.error('Failed to fetch session details', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [sessionId, token]);

    const handleJoin = async () => {
        if (!session?.roomCode) return;
        setJoining(true);
        try {
            await onJoinRoom(session.roomCode);
        } catch (err) {
            console.error('Failed to join room', err);
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground animate-pulse">Fetching session intelligence...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
                <p className="text-muted-foreground mb-8">This session might have been cancelled or moved.</p>
                <button onClick={onBack} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold">
                    Back to Catalog
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans">
            {/* Header */}
            <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all font-bold"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                            <Globe className="w-3 h-3" />
                            Live Session
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1200px] mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left: Content */}
                    <div className="lg:col-span-7 space-y-12">
                        {/* Hero Section */}
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {session.category && (
                                    <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {session.category}
                                    </span>
                                )}
                                {session.tags?.split(',').map((tag: string) => (
                                    <span key={tag} className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-[10px] font-bold uppercase tracking-widest border border-border">
                                        #{tag.trim()}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                                {session.title}
                            </h1>

                            <div className="flex items-center gap-4 py-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-500 p-0.5 shadow-xl">
                                    <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center overflow-hidden">
                                        {session.host.profilePictureUrl ? (
                                            <img src={session.host.profilePictureUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-black text-primary">
                                                {(session.host.displayName || 'U').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Session Host</p>
                                    <h4 className="text-xl font-bold">{session.host.displayName}</h4>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <Tag className="w-6 h-6 text-primary" />
                                About this session
                            </h3>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {session.description || 'Welcome to this interactive learning experience. In this session, we will deep dive into the core concepts and practical applications of this topic. Join us for a live video collaboration where you can ask questions and interact with the host in real-time.'}
                                </p>
                            </div>
                        </div>

                        {/* What you will learn */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                'Live interactive video collaboration',
                                'Expert insights and professional guidance',
                                'Real-time Q&A with the session host',
                                'Complimentary access to resources'
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 rounded-3xl bg-muted/30 border border-border">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                                        <Shield className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Sidebar / Purchase Card */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-32">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-card border-2 border-primary/20 rounded-[2.5rem] p-8 shadow-2xl space-y-8 overflow-hidden relative"
                            >
                                {/* Glow Effect */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full -mr-16 -mt-16" />

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Session Access</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black tracking-tight">{session.price}</span>
                                        <span className="text-xl font-bold text-muted-foreground">Credits</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                                        <div className="flex items-center gap-3 text-sm font-bold">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            Scheduled
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground">
                                            {session.scheduledStart ? new Date(session.scheduledStart).toLocaleDateString() : 'Instant Join'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                                        <div className="flex items-center gap-3 text-sm font-bold">
                                            <Clock className="w-4 h-4 text-primary" />
                                            Time
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground">
                                            {session.scheduledStart ? new Date(session.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Always Open'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                                        <div className="flex items-center gap-3 text-sm font-bold">
                                            <Users className="w-4 h-4 text-primary" />
                                            Active Capacity
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground">
                                            {session.peakParticipants} / {session.maxParticipants}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleJoin}
                                    disabled={joining}
                                    className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                                >
                                    {joining ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            JOIN SESSION NOW
                                        </>
                                    )}
                                </button>

                                <div className="text-center space-y-4">
                                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Secure Entry Guaranteed</p>
                                    <div className="flex justify-center gap-4 text-muted-foreground/30">
                                        <Shield className="w-5 h-5" />
                                        <Shield className="w-5 h-5" />
                                        <Shield className="w-5 h-5" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
