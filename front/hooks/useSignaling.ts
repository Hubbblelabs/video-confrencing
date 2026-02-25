import { useRef, useCallback, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { WS_URL, WS_EVENTS } from '../constants';
import { useAuthStore } from '../store/auth.store';
import { useRoomStore } from '../store/room.store';
import type {
  CreateRoomResponse,
  JoinRoomResponse,
  TransportCreatedResponse,
  ProduceResponse,
  ConsumeResponse,
  UserJoinedEvent,
  UserLeftEvent,
  UserKickedEvent,
  AllMutedEvent,
  RoleChangedEvent,
  NewProducerEvent,
  ProducerClosedEvent,
  ProducerPausedEvent,
  ProducerResumedEvent,
  HandRaisedEvent,
  ReactionEvent,
} from '../types';
import type { types as mediasoupTypes } from 'mediasoup-client';

// ─── Callback types for event listeners ───────────────────────────

interface SignalingListeners {
  onUserJoined?: (data: UserJoinedEvent) => void;
  onUserLeft?: (data: UserLeftEvent) => void;
  onRoomClosed?: (data: { roomId: string }) => void;
  onUserKicked?: (data: UserKickedEvent) => void;
  onAllMuted?: (data: AllMutedEvent) => void;
  onRoleChanged?: (data: RoleChangedEvent) => void;
  onNewProducer?: (data: NewProducerEvent) => void;
  onProducerClosed?: (data: ProducerClosedEvent) => void;
  onProducerPaused?: (data: ProducerPausedEvent) => void;
  onProducerResumed?: (data: ProducerResumedEvent) => void;
  onHandRaised?: (data: HandRaisedEvent) => void;
  onReactionReceived?: (data: ReactionEvent) => void;
  onPeerMediaUpdate?: (data: { userId: string; audioEnabled: boolean; videoEnabled: boolean }) => void;
  onError?: (data: { message: string }) => void;
}

// ─── Typed emit wrapper ───────────────────────────────────────────

function emitWithAck<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Socket event "${event}" timed out after 10s`));
    }, 10_000);

    socket.emit(event, payload, (response: T | { status: string; message: string }) => {
      clearTimeout(timeout);
      if (response && typeof response === 'object' && 'status' in response && response.status === 'error') {
        reject(new Error((response as { message: string }).message));
      } else {
        resolve(response as T);
      }
    });
  });
}

export function useSignaling(listeners: SignalingListeners = {}) {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  const token = useAuthStore((s) => s.token);
  const setConnectionState = useRoomStore((s) => s.setConnectionState);
  const setError = useRoomStore((s) => s.setError);

  // ─── Connect ──────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;
    if (!token) {
      setError('Not authenticated');
      return null;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setConnectionState('connected');
      setError(null);
    });

    socket.on(WS_EVENTS.AUTHENTICATED, () => {
      // Mark socket as ready for operations
      (socket as Socket & { isAuthenticated?: boolean }).isAuthenticated = true;
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        setConnectionState('disconnected');
      } else {
        setConnectionState('reconnecting');
      }
    });

    socket.on('connect_error', (err) => {
      setConnectionState('failed');
      setError(`Connection failed: ${err.message}`);
    });

    socket.io.on('reconnect', () => {
      setConnectionState('connected');
      setError(null);
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('failed');
      setError('Reconnection failed after maximum attempts');
    });

    // ─── Server → Client event listeners ──────────────────────

    socket.on(WS_EVENTS.USER_JOINED, (data: UserJoinedEvent) => {
      listenersRef.current.onUserJoined?.(data);
    });

    socket.on(WS_EVENTS.USER_LEFT, (data: UserLeftEvent) => {
      listenersRef.current.onUserLeft?.(data);
    });

    socket.on(WS_EVENTS.ROOM_CLOSED, (data: { roomId: string }) => {
      listenersRef.current.onRoomClosed?.(data);
    });

    socket.on(WS_EVENTS.USER_KICKED, (data: UserKickedEvent) => {
      listenersRef.current.onUserKicked?.(data);
    });

    socket.on(WS_EVENTS.ALL_MUTED, (data: AllMutedEvent) => {
      listenersRef.current.onAllMuted?.(data);
    });

    socket.on(WS_EVENTS.ROLE_CHANGED, (data: RoleChangedEvent) => {
      listenersRef.current.onRoleChanged?.(data);
    });

    socket.on(WS_EVENTS.NEW_PRODUCER, (data: NewProducerEvent) => {
      listenersRef.current.onNewProducer?.(data);
    });

    socket.on(WS_EVENTS.PRODUCER_CLOSED, (data: ProducerClosedEvent) => {
      listenersRef.current.onProducerClosed?.(data);
    });

    socket.on(WS_EVENTS.PRODUCER_PAUSED, (data: ProducerPausedEvent) => {
      listenersRef.current.onProducerPaused?.(data);
    });

    socket.on(WS_EVENTS.PRODUCER_RESUMED, (data: ProducerResumedEvent) => {
      listenersRef.current.onProducerResumed?.(data);
    });

    socket.on(WS_EVENTS.HAND_RAISED, (data: HandRaisedEvent) => {
      listenersRef.current.onHandRaised?.(data);
    });

    socket.on(WS_EVENTS.REACTION_RECEIVED, (data: ReactionEvent) => {
      listenersRef.current.onReactionReceived?.(data);
    });

    socket.on(WS_EVENTS.PEER_MEDIA_UPDATE, (data: { userId: string; audioEnabled: boolean; videoEnabled: boolean }) => {
      console.log('CLIENT RECEIVE peer-media-update', data);
      listenersRef.current.onPeerMediaUpdate?.(data);
    });

    socket.on(WS_EVENTS.ERROR, (data: { message: string }) => {
      listenersRef.current.onError?.(data);
    });

    setConnectionState('connecting');
    socketRef.current = socket;
    return socket;
  }, [token, setConnectionState, setError]);

  // ─── Disconnect ───────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionState('disconnected');
    }
  }, [setConnectionState]);

  // ─── Room operations ──────────────────────────────────────────

  const createRoom = useCallback(async (title: string, maxParticipants?: number): Promise<CreateRoomResponse> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    return emitWithAck<CreateRoomResponse>(socket, WS_EVENTS.CREATE_ROOM, { title, maxParticipants });
  }, []);

  const joinRoom = useCallback(async (roomId: string): Promise<JoinRoomResponse> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    return emitWithAck<JoinRoomResponse>(socket, WS_EVENTS.JOIN_ROOM, { roomId });
  }, []);

  const leaveRoom = useCallback(async (roomId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ success: boolean }>(socket, WS_EVENTS.LEAVE_ROOM, { roomId });
  }, []);

  const closeRoom = useCallback(async (roomId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ success: boolean }>(socket, WS_EVENTS.CLOSE_ROOM, { roomId });
  }, []);

  const kickUser = useCallback(async (roomId: string, targetUserId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ success: boolean }>(socket, WS_EVENTS.KICK_USER, { roomId, targetUserId });
  }, []);

  const muteAll = useCallback(async (roomId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ success: boolean; mutedCount: number }>(socket, WS_EVENTS.MUTE_ALL, { roomId });
  }, []);

  const sendHandRaise = useCallback(async (roomId: string): Promise<{ success: boolean; handRaised: boolean }> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    return emitWithAck<{ success: boolean; handRaised: boolean }>(socket, WS_EVENTS.HAND_RAISE, { roomId });
  }, []);

  const sendReaction = useCallback(async (roomId: string, reaction: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ success: boolean }>(socket, WS_EVENTS.REACTION, { roomId, reaction });
  }, []);

  // ─── Media signaling operations ───────────────────────────────

  const getRouterCapabilities = useCallback(async (roomId: string): Promise<mediasoupTypes.RtpCapabilities> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    const data = await emitWithAck<{ rtpCapabilities: mediasoupTypes.RtpCapabilities }>(
      socket, WS_EVENTS.GET_ROUTER_CAPABILITIES, { roomId },
    );
    return data.rtpCapabilities;
  }, []);

  const createTransport = useCallback(async (roomId: string, direction: 'send' | 'recv'): Promise<TransportCreatedResponse> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    return emitWithAck<TransportCreatedResponse>(socket, WS_EVENTS.CREATE_TRANSPORT, { roomId, direction });
  }, []);

  const connectTransport = useCallback(async (transportId: string, dtlsParameters: mediasoupTypes.DtlsParameters): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    await emitWithAck<{ connected: boolean }>(socket, WS_EVENTS.CONNECT_TRANSPORT, { transportId, dtlsParameters });
  }, []);

  const produce = useCallback(async (params: {
    roomId: string;
    transportId: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
    appData?: Record<string, unknown>;
  }): Promise<ProduceResponse> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    return emitWithAck<ProduceResponse>(socket, WS_EVENTS.PRODUCE, params);
  }, []);

  const consume = useCallback(async (params: {
    roomId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: mediasoupTypes.RtpCapabilities;
  }): Promise<ConsumeResponse> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    return emitWithAck<ConsumeResponse>(socket, WS_EVENTS.CONSUME, params);
  }, []);

  const resumeConsumer = useCallback(async (consumerId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Socket not connected');
    await emitWithAck<{ resumed: boolean }>(socket, WS_EVENTS.RESUME_CONSUMER, { consumerId });
  }, []);

  const closeProducer = useCallback(async (roomId: string, producerId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ closed: boolean }>(socket, WS_EVENTS.CLOSE_PRODUCER, { roomId, producerId });
  }, []);

  const pauseProducer = useCallback(async (producerId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ paused: boolean }>(socket, WS_EVENTS.PAUSE_PRODUCER, { producerId });
  }, []);

  const resumeProducer = useCallback(async (producerId: string): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await emitWithAck<{ resumed: boolean }>(socket, WS_EVENTS.RESUME_PRODUCER, { producerId });
  }, []);

  const emitMediaState = useCallback(async (roomId: string, audioEnabled: boolean, videoEnabled: boolean): Promise<void> => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    console.log('CLIENT EMIT media-state-change', { roomId, audioEnabled, videoEnabled });
    await emitWithAck<{ success: boolean }>(socket, WS_EVENTS.MEDIA_STATE_CHANGE, { roomId, audioEnabled, videoEnabled });
  }, []);

  // ─── Cleanup on unmount ───────────────────────────────────────

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socketRef,
    connect,
    disconnect,
    // Room
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    kickUser,
    muteAll,
    sendHandRaise,
    sendReaction,
    // Media signaling
    getRouterCapabilities,
    createTransport,
    connectTransport,
    produce,
    consume,
    resumeConsumer,
    closeProducer,
    pauseProducer,
    resumeProducer,
    emitMediaState,
  };
}
