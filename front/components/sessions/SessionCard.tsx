import { motion } from 'framer-motion';
import { Calendar, Users, ChevronRight, Tag } from 'lucide-react';

interface SessionCardProps {
    session: {
        id: string;
        title: string;
        description: string;
        thumbnailUrl?: string;
        price: number;
        category?: string;
        scheduledStart?: string;
        peakParticipants: number;
        host: {
            displayName: string;
            profilePictureUrl?: string;
        };
    };
    onClick: (id: string) => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
    const formatTime = (dateStr?: string) => {
        if (!dateStr) return 'TBD';
        const date = new Date(dateStr);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            onClick={() => onClick(session.id)}
            className="group cursor-pointer bg-card hover:bg-accent/5 transition-all duration-300 rounded-3xl overflow-hidden border border-border flex flex-col h-full shadow-sm hover:shadow-xl hover:shadow-primary/5"
        >
            {/* Thumbnail */}
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {session.thumbnailUrl ? (
                    <img
                        src={session.thumbnailUrl}
                        alt={session.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <Tag className="w-12 h-12 text-primary/20" />
                    </div>
                )}

                {/* Price Badge */}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-full text-sm font-bold border border-white/10 flex items-center gap-1.5 shadow-lg">
                    <span className="text-primary">{session.price}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Credits</span>
                </div>

                {/* Category Badge */}
                {session.category && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-primary/90 text-primary-foreground backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        {session.category}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-1">
                <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
                        {session.title}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl w-fit">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                            {session.host.profilePictureUrl ? (
                                <img src={session.host.profilePictureUrl} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-bold text-primary">
                                    {(session.host.displayName || 'U').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="font-medium">{session.host.displayName}</span>
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                        {session.description || 'Join this interactive session and learn more about this topic through live video collaboration.'}
                    </p>
                </div>

                {/* Footer Stats */}
                <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Scheduled Start">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatTime(session.scheduledStart)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Participants">
                            <Users className="w-3.5 h-3.5" />
                            <span>{session.peakParticipants || 0}</span>
                        </div>
                    </div>

                    <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
