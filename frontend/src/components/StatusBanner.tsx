import { useRoomStore } from '../store/room.store';
import { useEffect, useState } from 'react';

/**
 * Overlay banners for connection status, errors, and kick notifications.
 */
export function StatusBanner() {
  const connectionState = useRoomStore((s) => s.connectionState);
  const error = useRoomStore((s) => s.error);
  const isKicked = useRoomStore((s) => s.isKicked);
  const kickReason = useRoomStore((s) => s.kickReason);

  // Auto-dismiss error after 5 seconds if connected
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (error && connectionState === 'connected') {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, connectionState]);

  if (isKicked) {
    return (
      <Banner type="error" icon="kicked">
        You were removed from the room{kickReason ? `: ${kickReason}` : '.'}
      </Banner>
    );
  }

  if (connectionState === 'reconnecting') {
    return <Banner type="warn" icon="reconnecting">Reconnecting to the room...</Banner>;
  }

  if (connectionState === 'failed') {
    return (
      <Banner type="error" icon="error">
        {error ?? 'Connection lost. Please rejoin the room.'}
      </Banner>
    );
  }

  if (error && connectionState === 'connected' && visible) {
    return <Banner type="error" icon="error">{error}</Banner>;
  }

  return null;
}

function Banner({
  type,
  icon,
  children
}: {
  type: 'warn' | 'error';
  icon: 'error' | 'warn' | 'reconnecting' | 'kicked';
  children: React.ReactNode
}) {
  const getStyles = () => {
    if (type === 'error') {
      return 'bg-destructive/10 text-destructive border-destructive/20 shadow-destructive/10';
    }
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10';
  };

  const getIcon = () => {
    if (icon === 'reconnecting') {
      return (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    if (icon === 'kicked') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto ${getStyles()}`}
      >
        {getIcon()}
        <span className="text-sm font-semibold whitespace-nowrap">{children}</span>
      </div>
    </div>
  );
}
