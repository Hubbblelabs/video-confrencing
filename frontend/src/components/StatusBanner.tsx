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
      <Banner type="error">
        You were removed from the room{kickReason ? `: ${kickReason}` : '.'}
      </Banner>
    );
  }

  if (connectionState === 'reconnecting') {
    return <Banner type="warn">Reconnecting...</Banner>;
  }

  if (connectionState === 'failed') {
    return (
      <Banner type="error">
        {error ?? 'Connection lost. Please rejoin.'}
      </Banner>
    );
  }

  if (error && connectionState === 'connected') {
    return <Banner type="error">{error}</Banner>;
  }

  return null;
}

function Banner({ type, children }: { type: 'warn' | 'error'; children: React.ReactNode }) {
  const bg = type === 'error' ? 'bg-white text-black' : 'bg-neutral-700 text-white';
  return (
    <div className={`absolute top-0 inset-x-0 z-50 px-4 py-2 text-center text-sm font-medium ${bg}`}>
      {children}
    </div>
  );
}
