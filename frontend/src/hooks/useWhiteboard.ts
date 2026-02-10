import { useCallback, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants';
import type { WhiteboardCursor } from '../types/whiteboard.types';

interface UseWhiteboardProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  onStateChange?: (active: boolean) => void;
}

export function useWhiteboard({ socket, roomId, userId, onStateChange }: UseWhiteboardProps) {
  const [remoteCursors, setRemoteCursors] = useState<Map<string, WhiteboardCursor>>(new Map());
  const [remoteObjects, setRemoteObjects] = useState<any[]>([]);
  const cursorTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Send object added
  const sendObjectAdded = useCallback((object: any) => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_DRAW, { roomId, object });
  }, [socket, roomId]);

  // Send object modified
  const sendObjectModified = useCallback((object: any) => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_OBJECT_MODIFIED, { roomId, object });
  }, [socket, roomId]);

  // Send object removed
  const sendObjectRemoved = useCallback((objectId: string) => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_OBJECT_REMOVED, { roomId, objectId });
  }, [socket, roomId]);

  // Send cursor position
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_CURSOR, { roomId, x, y });
  }, [socket, roomId]);

  // Send clear
  const sendClear = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_CLEAR, { roomId });
  }, [socket, roomId]);

  // Send state
  const sendState = useCallback((active: boolean) => {
    if (!socket || !roomId) return;
    socket.emit(WS_EVENTS.WHITEBOARD_STATE, { roomId, active });
  }, [socket, roomId]);

  // Handle remote cursor
  const handleRemoteCursor = useCallback((data: { userId: string; displayName: string; x: number; y: number }) => {
    if (data.userId === userId) return;

    // Clear existing timeout for this user
    const existingTimeout = cursorTimeoutRef.current.get(data.userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Generate consistent color for user
    const color = generateUserColor(data.userId);

    setRemoteCursors(prev => {
      const next = new Map(prev);
      next.set(data.userId, {
        userId: data.userId,
        displayName: data.displayName,
        x: data.x,
        y: data.y,
        color,
      });
      return next;
    });

    // Remove cursor after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      cursorTimeoutRef.current.delete(data.userId);
    }, 3000);

    cursorTimeoutRef.current.set(data.userId, timeout);
  }, [userId]);

  // Handle remote object added
  const handleRemoteObjectAdded = useCallback((data: { userId: string; object: any }) => {
    if (data.userId === userId) return;
    setRemoteObjects(prev => [...prev, { ...data.object, remote: true }]);
  }, [userId]);

  // Handle remote object modified
  const handleRemoteObjectModified = useCallback((data: { userId: string; object: any }) => {
    if (data.userId === userId) return;
    setRemoteObjects(prev =>
      prev.map(obj => obj.id === data.object.id ? { ...data.object, remote: true } : obj)
    );
  }, [userId]);

  // Handle remote object removed
  const handleRemoteObjectRemoved = useCallback((data: { userId: string; objectId: string }) => {
    if (data.userId === userId) return;
    setRemoteObjects(prev => prev.filter(obj => obj.id !== data.objectId));
  }, [userId]);

  // Handle remote clear
  const handleRemoteClear = useCallback((data: { userId: string }) => {
    if (data.userId === userId) return;
    setRemoteObjects([]);
  }, [userId]);

  // Handle remote state
  const handleRemoteState = useCallback((data: { userId: string; active: boolean }) => {
    if (data.userId === userId) return;
    onStateChange?.(data.active);
  }, [userId, onStateChange]);

  // Setup listeners
  const setupListeners = useCallback(() => {
    if (!socket) return;

    socket.on(WS_EVENTS.WHITEBOARD_CURSOR, handleRemoteCursor);
    socket.on(WS_EVENTS.WHITEBOARD_OBJECT_ADDED, handleRemoteObjectAdded);
    socket.on(WS_EVENTS.WHITEBOARD_OBJECT_MODIFIED, handleRemoteObjectModified);
    socket.on(WS_EVENTS.WHITEBOARD_OBJECT_REMOVED, handleRemoteObjectRemoved);
    socket.on(WS_EVENTS.WHITEBOARD_CLEAR, handleRemoteClear);
    socket.on(WS_EVENTS.WHITEBOARD_STATE, handleRemoteState);

    return () => {
      socket.off(WS_EVENTS.WHITEBOARD_CURSOR, handleRemoteCursor);
      socket.off(WS_EVENTS.WHITEBOARD_OBJECT_ADDED, handleRemoteObjectAdded);
      socket.off(WS_EVENTS.WHITEBOARD_OBJECT_MODIFIED, handleRemoteObjectModified);
      socket.off(WS_EVENTS.WHITEBOARD_OBJECT_REMOVED, handleRemoteObjectRemoved);
      socket.off(WS_EVENTS.WHITEBOARD_CLEAR, handleRemoteClear);
      socket.off(WS_EVENTS.WHITEBOARD_STATE, handleRemoteState);
    };
  }, [socket, handleRemoteCursor, handleRemoteObjectAdded, handleRemoteObjectModified, handleRemoteObjectRemoved, handleRemoteClear, handleRemoteState]);

  return {
    remoteCursors: Array.from(remoteCursors.values()),
    remoteObjects,
    sendObjectAdded,
    sendObjectModified,
    sendObjectRemoved,
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
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
