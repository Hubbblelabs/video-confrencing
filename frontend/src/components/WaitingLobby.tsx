import { useEffect, useState } from 'react';

interface WaitingLobbyProps {
  message: string;
  wasRejected: boolean;
  onLeave: () => void;
}

export function WaitingLobby({ message, wasRejected, onLeave }: WaitingLobbyProps) {
  const [dots, setDots] = useState('');

  // Animated dots effect
  useEffect(() => {
    if (wasRejected) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [wasRejected]);

  if (wasRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full glass-card p-10 rounded-3xl text-center relative z-10 animate-fade-in border-destructive/20 shadow-[0_0_50px_-10px_rgba(239,68,68,0.2)]">
          {/* Rejected Icon */}
          <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
            <svg className="w-12 h-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Rejected Message */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-3 font-heading">
              Access Denied
            </h2>
            <p className="text-muted-foreground text-lg">
              {message}
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={onLeave}
            className="w-full py-4 bg-muted/50 hover:bg-muted text-white rounded-2xl transition-all duration-300 font-medium hover:scale-[1.02] active:scale-[0.98]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />

      <div className="max-w-md w-full glass-card p-10 rounded-3xl text-center relative z-10 animate-fade-in border-primary/20 shadow-[0_0_60px_-15px_rgba(139,92,246,0.15)]">
        {/* Waiting Animation */}
        <div className="relative mx-auto w-40 h-40 mb-8">
          {/* Pulsing circles */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-8 rounded-full bg-primary/20 animate-pulse" />
          <div className="absolute inset-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Waiting Message */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-3 font-heading">
            Waiting Room<span className="w-8 inline-block text-left">{dots}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            {message}
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 text-left mb-10">
          <div className="p-4 bg-white/5 rounded-2xl flex items-start gap-4 border border-white/5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <InfoIcon />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white/90 text-sm mb-1">Host Reviewing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The meeting host has been notified of your arrival. You will be automatically admitted once approved.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onLeave}
          className="w-full py-4 text-muted-foreground hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-200 font-medium text-sm"
        >
          Leave Waiting Room
        </button>
      </div>
    </div>
  );
}

// SVG Icons

const InfoIcon = () => (
  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
