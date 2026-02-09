import { useCallback, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { useAuthStore } from './store/auth.store';
import { useRoomStore } from './store/room.store';
import { useMediaStore } from './store/media.store';
import { useParticipantsStore } from './store/participants.store';
import { useSignaling } from './hooks/useSignaling';
import type { NewProducerEvent } from './types';

type AppView = 'auth' | 'lobby' | 'room';

function App() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.userId);
  const roomId = useRoomStore((s) => s.roomId);

  const [existingProducers, setExistingProducers] = useState<
    Array<{ producerId: string; userId: string; kind: string }>
  >([]);

  // Ref that RoomPage will populate with its consumeProducer handler
  const newProducerHandlerRef = useRef<((data: NewProducerEvent) => Promise<void>) | null>(null);

  // ─── Signaling with event listeners ───────────────────────────

  const signaling = useSignaling({
    onUserJoined: (data) => {
      useParticipantsStore.getState().addParticipant(data.userId, data.displayName, data.role);
    },
    onUserLeft: (data) => {
      useParticipantsStore.getState().removeParticipant(data.userId);
    },
    onRoomClosed: () => {
      handleLeaveRoom();
    },
    onUserKicked: (data) => {
      useRoomStore.getState().setKicked(data.reason);
      handleLeaveRoom();
    },
    onAllMuted: () => {
      // Mute local mic
      const stream = useMediaStore.getState().localStream;
      if (stream) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
      }
      useMediaStore.getState().setMicOn(false);
    },
    onRoleChanged: (data) => {
      if (data.userId === userId) {
        useRoomStore.getState().setRole(data.newRole);
      } else {
        useParticipantsStore.getState().setParticipantRole(data.userId, data.newRole);
      }
    },
    onNewProducer: (data) => {
      // Forward to RoomPage's consume handler
      newProducerHandlerRef.current?.(data);
    },
    onProducerClosed: (data) => {
      useParticipantsStore.getState().removeConsumer(data.userId, data.producerId);
    },
    onProducerPaused: (data) => {
      // Update participant mute state when their audio producer is paused
      const participant = useParticipantsStore.getState().participants.get(data.userId);
      if (participant && participant.audioTrack) {
        useParticipantsStore.getState().setParticipantMuted(data.userId, true);
      }
    },
    onProducerResumed: (data) => {
      // Update participant mute state when their audio producer is resumed
      const participant = useParticipantsStore.getState().participants.get(data.userId);
      if (participant && participant.audioTrack) {
        useParticipantsStore.getState().setParticipantMuted(data.userId, false);
      }
    },
    onError: (data) => {
      useRoomStore.getState().setError(data.message);
    },
  });

  // ─── Room lifecycle ───────────────────────────────────────────

  const handleCreateRoom = useCallback(async (title: string) => {
    const socket = signaling.connect();
    if (!socket) throw new Error('Failed to connect');

    // Wait for socket to connect AND authenticate
    await new Promise<void>((resolve, reject) => {
      const checkReady = () => {
        if (socket.connected && (socket as Socket & { isAuthenticated?: boolean }).isAuthenticated) {
          cleanup();
          resolve();
          return true;
        }
        return false;
      };
      
      if (checkReady()) return;
      
      const onConnect = () => checkReady();
      const onAuthenticated = () => checkReady();
      const onError = (err: Error) => { cleanup(); reject(err); };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('authenticated', onAuthenticated);
        socket.off('connect_error', onError);
      };
      
      socket.on('connect', onConnect);
      socket.on('authenticated', onAuthenticated);
      socket.on('connect_error', onError);
      
      // Check immediately in case already ready
      checkReady();
    });

    const created = await signaling.createRoom(title);
    const joined = await signaling.joinRoom(created.roomId);

    // Sync participants
    const localId = useAuthStore.getState().userId ?? '';
    useParticipantsStore.getState().syncParticipants(
      joined.participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        isMuted: p.isMuted,
        isVideoOff: p.isVideoOff,
      })),
      localId,
    );

    setExistingProducers(
      joined.existingProducers.map((p) => ({ ...p, kind: p.kind })),
    );

    useRoomStore.getState().setRoom(created.roomId, created.roomCode, joined.role);
  }, [signaling]);

  const handleJoinRoom = useCallback(async (id: string) => {
    const socket = signaling.connect();
    if (!socket) throw new Error('Failed to connect');

    // Wait for socket to connect AND authenticate
    await new Promise<void>((resolve, reject) => {
      const checkReady = () => {
        if (socket.connected && (socket as Socket & { isAuthenticated?: boolean }).isAuthenticated) {
          cleanup();
          resolve();
          return true;
        }
        return false;
      };
      
      if (checkReady()) return;
      
      const onConnect = () => checkReady();
      const onAuthenticated = () => checkReady();
      const onError = (err: Error) => { cleanup(); reject(err); };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('authenticated', onAuthenticated);
        socket.off('connect_error', onError);
      };
      
      socket.on('connect', onConnect);
      socket.on('authenticated', onAuthenticated);
      socket.on('connect_error', onError);
      
      // Check immediately in case already ready
      checkReady();
    });

    const joined = await signaling.joinRoom(id);

    // Use the actual room ID returned from the server (may be different if auto-created)
    const actualRoomId = joined.roomId;

    const localId = useAuthStore.getState().userId ?? '';
    useParticipantsStore.getState().syncParticipants(
      joined.participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        isMuted: p.isMuted,
        isVideoOff: p.isVideoOff,
      })),
      localId,
    );

    setExistingProducers(
      joined.existingProducers.map((p) => ({ ...p, kind: p.kind })),
    );

    useRoomStore.getState().setRoom(actualRoomId, null, joined.role);
  }, [signaling]);

  const handleLeaveRoom = useCallback(() => {
    useParticipantsStore.getState().reset();
    useMediaStore.getState().reset();
    useRoomStore.getState().reset();
    setExistingProducers([]);
    signaling.disconnect();
  }, [signaling]);

  // ─── View routing ─────────────────────────────────────────────

  let view: AppView = 'auth';
  if (token) view = 'lobby';
  if (token && roomId) view = 'room';

  switch (view) {
    case 'auth':
      return <AuthPage />;
    case 'lobby':
      return (
        <LobbyPage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      );
    case 'room':
      return (
        <RoomPage
          signaling={signaling}
          existingProducers={existingProducers}
          onNewProducerRef={newProducerHandlerRef}
          onLeave={handleLeaveRoom}
        />
      );
  }
}

export default App
