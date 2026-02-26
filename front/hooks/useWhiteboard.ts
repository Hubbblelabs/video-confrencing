import { useCallback, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants';
import type { WhiteboardCursor } from '../types/whiteboard.types';

interface UseWhiteboardProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  displayName?: string;
  onStateChange?: (active: boolean) => void;
}

export function useWhiteboard({ socket, roomId, userId, displayName = 'User', onStateChange }: UseWhiteboardProps) {
  // Listeners for direct cursor updates (bypass React state for performance)
  const cursorListenersRef = useRef<Set<(data: WhiteboardCursor) => void>>(new Set());

  // Full Excalidraw elements from remote peers (replaces remoteObjects)
  const [remoteElements, setRemoteElements] = useState<readonly any[]>([]);

  // Debounce ref for broadcasting
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard to not re-apply our own broadcast
  const isBroadcastingRef = useRef(false);

  // Subscribe to cursor updates
  const onCursorUpdate = useCallback((callback: (data: WhiteboardCursor) => void) => {
    cursorListenersRef.current.add(callback);
    return () => {
      cursorListenersRef.current.delete(callback);
    };
  }, []);

  // Send full Excalidraw elements state (debounced 80ms)
  const sendElements = useCallback(
    (elements: readonly any[]) => {
      if (!socket || !roomId) return;

      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current);
      }

      broadcastTimerRef.current = setTimeout(() => {
        isBroadcastingRef.current = true;
        socket.emit(WS_EVENTS.WHITEBOARD_DRAW, { roomId, elements });
        // Reset flag after a short delay to allow the echo to be ignored
        setTimeout(() => { isBroadcastingRef.current = false; }, 100);
      }, 80);
    },
    [socket, roomId],
  );

  // Send cursor position
  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (!socket || !roomId) return;
      socket.emit(WS_EVENTS.WHITEBOARD_CURSOR, { roomId, x, y, displayName });
    },
    [socket, roomId, displayName],
  );

  // Send clear
  const sendClear = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_CLEAR, { roomId });
  }, [socket, roomId]);

  // Send whiteboard visible state
  const sendState = useCallback(
    (active: boolean) => {
      if (!socket || !roomId) return;
      socket.emit(WS_EVENTS.WHITEBOARD_STATE, { roomId, active });
    },
    [socket, roomId],
  );

  // ─── Remote event handlers ──────────────────────────────────────

  const handleRemoteDraw = useCallback(
    (data: { userId: string; elements: readonly any[] }) => {
      if (data.userId === userId) return; // ignore own echo
      setRemoteElements(data.elements);
    },
    [userId],
  );

  const handleRemoteCursor = useCallback(
    (data: { userId: string; displayName: string; x: number; y: number }) => {
      if (data.userId === userId) return;
      const color = generateUserColor(data.userId);
      const cursorData: WhiteboardCursor = {
        userId: data.userId,
        displayName: data.displayName,
        x: data.x,
        y: data.y,
        color,
      };
      cursorListenersRef.current.forEach((listener) => listener(cursorData));
    },
    [userId],
  );

  const handleRemoteClear = useCallback(
    (data: { userId: string }) => {
      if (data.userId === userId) return;
      setRemoteElements([]);
    },
    [userId],
  );

  const handleRemoteState = useCallback(
    (data: { userId: string; active: boolean }) => {
      if (data.userId === userId) return;
      onStateChange?.(data.active);
    },
    [userId, onStateChange],
  );

  // Setup socket listeners
  const setupListeners = useCallback(() => {
    if (!socket) return;

    socket.on(WS_EVENTS.WHITEBOARD_DRAW, handleRemoteDraw);
    socket.on(WS_EVENTS.WHITEBOARD_CURSOR, handleRemoteCursor);
    socket.on(WS_EVENTS.WHITEBOARD_CLEAR, handleRemoteClear);
    socket.on(WS_EVENTS.WHITEBOARD_STATE, handleRemoteState);

    return () => {
      socket.off(WS_EVENTS.WHITEBOARD_DRAW, handleRemoteDraw);
      socket.off(WS_EVENTS.WHITEBOARD_CURSOR, handleRemoteCursor);
      socket.off(WS_EVENTS.WHITEBOARD_CLEAR, handleRemoteClear);
      socket.off(WS_EVENTS.WHITEBOARD_STATE, handleRemoteState);
    };
  }, [socket, handleRemoteDraw, handleRemoteCursor, handleRemoteClear, handleRemoteState]);

  return {
    remoteElements,
    onCursorUpdate,
    sendElements,
    sendCursorPosition,
    sendClear,
    sendState,
    setupListeners,
  };
}

// Generate consistent color for a user based on their ID
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
