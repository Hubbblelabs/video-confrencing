import { useRoomStore } from '../store/room.store';

/**
 * Overlay banners for connection status, errors, and kick notifications.
 */
export function StatusBanner() {
  const connectionState = useRoomStore((s) => s.connectionState);
  const error = useRoomStore((s) => s.error);
  const isKicked = useRoomStore((s) => s.isKicked);
  const kickReason = useRoomStore((s) => s.kickReason);

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

  if (error && connectionState === 'connected') {
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
      return 'bg-[var(--destructive)] text-[var(--destructive-foreground)] border-[var(--destructive)]';
    }
    return 'bg-[var(--secondary)] text-[var(--secondary-foreground)] border-[var(--secondary)]';
  };

  const getIcon = () => {
    if (icon === 'reconnecting') {
      return (
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    if (icon === 'kicked') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div 
      className={`absolute top-0 inset-x-0 z-50 flex items-center justify-center gap-3 px-6 py-4 text-center text-sm font-semibold border-b-2 backdrop-blur-md animate-in slide-in-from-top duration-300 ${getStyles()}`}
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      {getIcon()}
      <span>{children}</span>
    </div>
  );
}
