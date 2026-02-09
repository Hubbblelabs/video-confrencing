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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Rejected Icon */}
          <div className="mx-auto w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Rejected Message */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Access Denied
            </h2>
            <p className="text-muted-foreground">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onLeave}
              className="w-full px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors font-medium"
            >
              Return to Home
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Contact the meeting host if you believe this is an error
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Waiting Animation */}
        <div className="relative mx-auto w-32 h-32">
          {/* Pulsing circles */}
          <div className="absolute inset-0 rounded-full bg-[var(--primary)]/20 animate-ping" />
          <div className="absolute inset-4 rounded-full bg-[var(--primary)]/30 animate-pulse" />
          <div className="absolute inset-8 rounded-full bg-[var(--primary)]/40 flex items-center justify-center">
            <svg className="w-12 h-12 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Waiting Message */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            You're in the Waiting Room{dots}
          </h2>
          <p className="text-muted-foreground">
            {message}
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-3 text-left">
          <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <InfoIcon />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground text-sm mb-1">What's happening?</h3>
              <p className="text-xs text-muted-foreground">
                The meeting host is reviewing your request to join. You'll be admitted shortly.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckIcon />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground text-sm mb-1">Ready to go</h3>
              <p className="text-xs text-muted-foreground">
                Your audio and video settings are ready. You'll join automatically when admitted.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onLeave}
            className="w-full px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
          >
            Leave Waiting Room
          </button>
        </div>

        <div className="text-xs text-muted-foreground">
          💡 Tip: Keep this tab open to join when admitted
        </div>
      </div>
    </div>
  );
}

// SVG Icons

const InfoIcon = () => (
  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
