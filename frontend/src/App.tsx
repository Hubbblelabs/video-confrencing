import { useCallback, useRef, useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
// import { AuthPage } from './pages/AuthPage';
// import { LobbyPage } from './pages/LobbyPage';
// import { RoomPage } from './pages/RoomPage';
import { WaitingLobby } from './components/WaitingLobby';
import { useAuthStore } from './store/auth.store';
import { useRoomStore } from './store/room.store';
import { useMediaStore } from './store/media.store';
import { useParticipantsStore } from './store/participants.store';
import { useSignaling } from './hooks/useSignaling';
import { WS_EVENTS } from './constants';
import type { NewProducerEvent } from './types';

// Lazy load pages
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const LobbyPage = lazy(() => import('./pages/LobbyPage').then(module => ({ default: module.LobbyPage })));
const RoomPage = lazy(() => import('./pages/RoomPage').then(module => ({ default: module.RoomPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AttendancePage = lazy(() => import('./pages/AttendancePage').then(module => ({ default: module.AttendancePage })));
const SessionBrowser = lazy(() => import('./pages/SessionBrowser').then(module => ({ default: module.SessionBrowser })));
const SessionDetailsPage = lazy(() => import('./pages/SessionDetailsPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

type AppView = 'auth' | 'lobby' | 'waiting' | 'room' | 'admin' | 'attendance' | 'browser' | 'session-details' | 'verify-email' | 'reset-password';

function App() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);
  const roomId = useRoomStore((s) => s.roomId);

  // Admin view state
  const [showAdminView, setShowAdminView] = useState(false);
  const [showAttendanceView, setShowAttendanceView] = useState(false);
  const [showBrowserView, setShowBrowserView] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [urlView, setUrlView] = useState<AppView | null>(null);
  const location = useLocation();

  const [existingProducers, setExistingProducers] = useState<
    Array<{ producerId: string; userId: string; kind: string }>
  >([]);

  // Waiting room state
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingRoomId, setWaitingRoomId] = useState<string | null>(null);
  const [wasRejected, setWasRejected] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');

  // Ref that RoomPage will populate with its consumeProducer handler
  const newProducerHandlerRef = useRef<((data: NewProducerEvent) => Promise<void>) | null>(null);

  // Track if we've attempted auto-rejoin
  const hasAttemptedRejoin = useRef(false);
  const hasRedirectedAdmin = useRef(false);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/verify-email') setUrlView('verify-email');
    if (path === '/reset-password') setUrlView('reset-password');
  }, [location]);

  // Auto-redirect admin to dashboard on login
  useEffect(() => {
    if (token && (role === 'ADMIN' || role === 'TEACHER') && !hasRedirectedAdmin.current && !roomId && !isInWaitingRoom) {
      setShowAdminView(true);
      hasRedirectedAdmin.current = true;
    }
  }, [token, role, roomId, isInWaitingRoom]);

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
      // Update participant state when their producer is paused
      const store = useParticipantsStore.getState();
      if (data.kind === 'audio') {
        store.setParticipantMuted(data.userId, true);
      } else if (data.kind === 'video') {
        store.setParticipantVideoOff(data.userId, true);
      }
    },
    onProducerResumed: (data) => {
      // Update participant state when their producer is resumed
      const store = useParticipantsStore.getState();
      if (data.kind === 'audio') {
        store.setParticipantMuted(data.userId, false);
      } else if (data.kind === 'video') {
        store.setParticipantVideoOff(data.userId, false);
      }
    },
    onHandRaised: (data) => {
      useParticipantsStore.getState().setParticipantHandRaised(data.userId, data.handRaised);
    },
    onReactionReceived: (data) => {
      useParticipantsStore.getState().setParticipantReaction(data.userId, data.reaction);
    },
    onError: (data) => {
      useRoomStore.getState().setError(data.message);
    },
  });

  // ─── Waiting room event listeners ─────────────────────────────

  useEffect(() => {
    const socket = signaling.socketRef.current;
    if (!socket) return;

    // Handle admission to room (completes the join flow)
    const handleAdmitted = async (data: { roomId: string; message: string }) => {
      if (!isInWaitingRoom || data.roomId !== waitingRoomId) return;

      try {
        // Now actually join the room
        const joined = await signaling.joinRoom(data.roomId);

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

        useRoomStore.getState().setRoom(joined.roomId, joined.roomCode, joined.role);

        // Clear waiting room state
        setIsInWaitingRoom(false);
        setWaitingRoomId(null);
      } catch (error) {
        console.error('Failed to join room after admission:', error);
        setIsInWaitingRoom(false);
        setWaitingRoomId(null);
        useRoomStore.getState().setError('Failed to join room');
      }
    };

    // Handle rejection from waiting room
    const handleRejected = (data: { roomId: string; message: string }) => {
      if (!isInWaitingRoom || data.roomId !== waitingRoomId) return;

      setIsInWaitingRoom(false);
      setWaitingRoomId(null);
      setWasRejected(true);
      setRejectionMessage(data.message || 'Access denied by host');

      // Disconnect socket
      signaling.disconnect();
    };

    socket.on(WS_EVENTS.PARTICIPANT_ADMITTED, handleAdmitted);
    socket.on(WS_EVENTS.PARTICIPANT_REJECTED, handleRejected);

    return () => {
      socket.off(WS_EVENTS.PARTICIPANT_ADMITTED, handleAdmitted);
      socket.off(WS_EVENTS.PARTICIPANT_REJECTED, handleRejected);
    };
  }, [signaling, isInWaitingRoom, waitingRoomId]);

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

    // Join waiting room first (backend will auto-admit hosts)
    // Note: id might be a code here, but we set it as waitingRoomId temporarily
    setWaitingRoomId(id);
    setIsInWaitingRoom(true);
    setWasRejected(false);
    setRejectionMessage('');

    socket.emit(WS_EVENTS.JOIN_WAITING_ROOM, { roomId: id }, (response: any) => {
      console.log('JOIN_WAITING_ROOM response:', response);
      if (!response.success) {
        setIsInWaitingRoom(false);
        setWaitingRoomId(null);
        useRoomStore.getState().setError(response.error || 'Failed to join waiting room');
      } else if (response.roomId) {
        // Update to the resolved room ID (UUID) so we match admission events correctly
        setWaitingRoomId(response.roomId);
      }
    });
  }, [signaling]);

  // ─── Auto-rejoin on refresh ───────────────────────────────────

  useEffect(() => {
    const path = location.pathname;
    // Handle deep linking for rooms
    const matchRoom = path.match(/^\/room\/([a-f0-9-]+)$/i);
    if (matchRoom && matchRoom[1]) {
      const targetRoomId = matchRoom[1];
      if (
        token &&
        targetRoomId !== roomId &&
        targetRoomId !== waitingRoomId &&
        !hasAttemptedRejoin.current
      ) {
        hasAttemptedRejoin.current = true;
        // Ensure we switch away from admin view
        setShowAdminView(false);
        setShowAttendanceView(false);
        setShowBrowserView(false);
        // Start join process
        handleJoinRoom(targetRoomId).catch(console.error);
      }
    }
  }, [token, roomId, waitingRoomId, handleJoinRoom, location]);

  useEffect(() => {
    // Only auto-rejoin once on mount if there's a persisted room but we're not connected
    const persistedRoomId = useRoomStore.getState().roomId;

    if (
      token &&
      persistedRoomId &&
      !roomId &&
      !isInWaitingRoom &&
      !hasAttemptedRejoin.current
    ) {
      hasAttemptedRejoin.current = true;

      // Automatically rejoin the room - we pass the ID which is fine, backend resolves it
      handleJoinRoom(persistedRoomId).catch((err) => {
        console.error('Auto-rejoin failed:', err);
        // Clear persisted room on failure
        useRoomStore.getState().reset();
      });
    }
  }, [token, roomId, isInWaitingRoom, handleJoinRoom]);

  const handleLeaveRoom = useCallback(() => {
    useParticipantsStore.getState().reset();
    useMediaStore.getState().reset();
    useRoomStore.getState().reset();
    setExistingProducers([]);
    setIsInWaitingRoom(false);
    setWaitingRoomId(null);
    setWasRejected(false);
    setRejectionMessage('');
    signaling.disconnect();
  }, [signaling]);

  const handleBackToLobby = useCallback(() => {
    setIsInWaitingRoom(false);
    setWaitingRoomId(null);
    setWasRejected(false);
    setRejectionMessage('');
    setShowAdminView(false);
    setShowAttendanceView(false);
    setShowBrowserView(false);
    setSelectedSessionId(null);
    signaling.disconnect();
  }, [signaling]);

  // ─── View routing ─────────────────────────────────────────────

  let view: AppView = 'auth';
  if (urlView) view = urlView;
  else if (token) view = 'lobby';
  if (token && !urlView && showAdminView && (role === 'ADMIN' || role === 'TEACHER')) view = 'admin';
  if (token && !urlView && showAttendanceView && (role === 'ADMIN' || role === 'TEACHER')) view = 'attendance';
  if (token && !urlView && showBrowserView) view = 'browser';
  if (token && !urlView && showBrowserView && selectedSessionId) view = 'session-details';
  if (token && !urlView && isInWaitingRoom) view = 'waiting';
  if (token && !urlView && roomId) view = 'room';

  const renderView = () => {
    switch (view) {
      case 'auth':
        return <AuthPage />;
      case 'lobby':
        return (
          <LobbyPage
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onShowAdmin={() => setShowAdminView(true)}
            onShowAttendance={() => setShowAttendanceView(true)}
            onShowBrowser={() => setShowBrowserView(true)}
          />
        );
      case 'admin':
        return <AdminDashboard />;
      case 'attendance':
        return <AttendancePage />;
      case 'browser':
        return (
          <SessionBrowser
            onBack={() => setShowBrowserView(false)}
            onSessionDetails={(id) => setSelectedSessionId(id)}
          />
        );
      case 'session-details':
        return (
          <SessionDetailsPage
            sessionId={selectedSessionId!}
            onBack={() => setSelectedSessionId(null)}
            onJoinRoom={handleJoinRoom}
          />
        );
      case 'waiting':
        return (
          <WaitingLobby
            message={wasRejected ? rejectionMessage : 'Waiting for host approval...'}
            wasRejected={wasRejected}
            onLeave={handleBackToLobby}
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
      case 'verify-email':
        return <VerifyEmailPage onComplete={() => {
          setUrlView(null);
          window.history.replaceState({}, '', '/');
        }} />;
      case 'reset-password':
        return <ResetPasswordPage onBack={() => {
          setUrlView(null);
          window.history.replaceState({}, '', '/');
        }} />;
    }
  };

  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-white text-sm font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    }>
      {renderView()}
    </Suspense>
  );
}

export default App
