import { useEffect, useState } from 'react';

interface WaitingLobbyProps {
  message: string;
  wasRejected: boolean;
  onLeave: () => void;
}

export function WaitingLobby({ message, wasRejected, onLeave }: WaitingLobbyProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (wasRejected) return;
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [wasRejected]);

  if (wasRejected) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden p-4">
        {/* Background Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-destructive/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-card border border-destructive/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-destructive/5 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-destructive/20">
              <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-3">Access Denied</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">{message}</p>

            <button
              onClick={onLeave}
              className="w-full py-3.5 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-all font-medium border border-border/50 hover:border-border"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Dynamic Background matching Dashboard warmth */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card border border-border/50 rounded-[2rem] p-8 md:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-700">

          {/* Animated Radar/Pulse Effect */}
          <div className="relative mx-auto w-32 h-32 mb-10 flex items-center justify-center">
            {/* Outer Rings - Subtle Orange/Primary */}
            <div className="absolute inset-0 border border-primary/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute inset-0 border border-primary/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }} />

            {/* Core Gradient */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-primary/10 to-orange-100 rounded-full flex items-center justify-center ring-1 ring-primary/20 shadow-lg shadow-primary/5">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-full shadow-md flex items-center justify-center text-white">
                <svg className="w-8 h-8 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4 mb-12">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">
                Waiting Room
              </h2>
              <div className="flex items-center justify-center gap-1 text-primary font-bold text-sm uppercase tracking-widest">
                <span>Connecting</span>
                <span className="w-4 text-left">{dots}</span>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed text-sm max-w-[280px] mx-auto">
              We've notified the host that you're here. You'll be admitted automatically once approved.
            </p>
          </div>

          {/* Info Badge */}
          <div className="bg-muted/50 border border-border/50 rounded-2xl p-4 mb-8 flex items-start gap-4 text-left">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold mb-1">Host is reviewing</h3>
              <p className="text-xs text-muted-foreground">Your video and audio will be automatically enabled when you join.</p>
            </div>
          </div>

          <button
            onClick={onLeave}
            className="w-full py-4 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center justify-center gap-2 group"
          >
            <span>Leave Waiting Room</span>
            <svg className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
