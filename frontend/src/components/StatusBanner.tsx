import { useEffect, useState } from 'react';
import { useRoomStore } from '../store/room.store';

export function StatusBanner() {
  const connectionState = useRoomStore((s) => s.connectionState);
  const error = useRoomStore((s) => s.error);
  const kickReason = useRoomStore((s) => s.kickReason);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const isReconnecting = connectionState === 'reconnecting';
  const isFailed = connectionState === 'failed';

  if (!isReconnecting && !isFailed && !showError && !kickReason) {
    return null;
  }

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      {/* Reconnecting */}
      {isReconnecting && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/15 border border-amber-500/20 rounded-lg shadow-lg backdrop-blur-sm">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-amber-400 text-sm font-medium">Reconnecting...</span>
        </div>
      )}

      {/* Failed */}
      {isFailed && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-500/15 border border-red-500/20 rounded-lg shadow-lg backdrop-blur-sm">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-400 text-sm font-medium">Connection lost</span>
        </div>
      )}

      {/* Error */}
      {showError && error && !isFailed && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-500/10 border border-red-500/15 rounded-lg shadow-lg backdrop-blur-sm">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-red-400 text-sm font-medium">{error}</span>
          <button
            onClick={() => setShowError(false)}
            className="ml-2 p-0.5 rounded hover:bg-white/10 text-red-400/60 hover:text-red-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Kicked */}
      {kickReason && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-500/15 border border-red-500/20 rounded-lg shadow-lg backdrop-blur-sm">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-red-400 text-sm font-medium">{kickReason}</span>
        </div>
      )}
    </div>
  );
}
