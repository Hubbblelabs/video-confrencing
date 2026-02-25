import type { types as mediasoupTypes } from 'mediasoup-client';

// Re-export API types for convenience
export type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  JwtPayload,
  User,
  CreateRoomRequest,
  JoinRoomRequest,
  Room,
  ApiError,
} from './api.types';

export { ValidationRules } from './api.types';

// ─── Enums ────────────────────────────────────────────────────────

export type RoomRole = 'host' | 'co_host' | 'participant';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export type MediaDeviceKind = 'audioinput' | 'videoinput' | 'audiooutput';

// ─── Backend payloads (mirrored from gateway) ─────────────────────

export interface ServerParticipant {
  userId: string;
  displayName: string;
  socketId: string;
  role: RoomRole;
  joinedAt: number;
  producerIds: string[];
  isMuted: boolean;
  isVideoOff: boolean;
  handRaised?: boolean;
}

export interface JoinRoomResponse {
  roomId: string; // The actual room ID (may differ from requested if auto-created)
  roomCode: string;
  role: RoomRole;
  participants: ServerParticipant[];
  rtpCapabilities: mediasoupTypes.RtpCapabilities;
  existingProducers: Array<{
    producerId: string;
    userId: string;
    kind: mediasoupTypes.MediaKind;
  }>;
  allowScreenShare?: boolean;
  allowWhiteboard?: boolean;
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
}

export interface TransportCreatedResponse {
  id: string;
  iceParameters: mediasoupTypes.IceParameters;
  iceCandidates: mediasoupTypes.IceCandidate[];
  dtlsParameters: mediasoupTypes.DtlsParameters;
}

export interface ProduceResponse {
  producerId: string;
}

export interface ConsumeResponse {
  consumerId: string;
  producerId: string;
  kind: mediasoupTypes.MediaKind;
  rtpParameters: mediasoupTypes.RtpParameters;
}

export interface NewProducerEvent {
  producerId: string;
  userId: string;
  kind: mediasoupTypes.MediaKind;
}

export interface ProducerClosedEvent {
  producerId: string;
  userId: string;
}

export interface ProducerPausedEvent {
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
}

export interface ProducerResumedEvent {
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
}

export interface UserJoinedEvent {
  userId: string;
  displayName: string;
  role: RoomRole;
  participants: ServerParticipant[];
}

export interface UserLeftEvent {
  userId: string;
  kicked?: boolean;
  participants: ServerParticipant[];
}

export interface UserKickedEvent {
  roomId: string;
  reason: string;
}

export interface AllMutedEvent {
  roomId: string;
  mutedBy: string;
}

export interface RoleChangedEvent {
  userId: string;
  newRole: RoomRole;
}

export interface HandRaisedEvent {
  userId: string;
  handRaised: boolean;
}

export interface ReactionEvent {
  userId: string;
  reaction: string;
}

// ─── Client-side participant model ────────────────────────────────

export interface RemoteParticipant {
  userId: string; displayName: string; role: RoomRole;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  isMuted: boolean;
  isVideoOff: boolean;
  /** consumerId → Consumer for cleanup */
  consumers: Map<string, mediasoupTypes.Consumer>;
  handRaised?: boolean;
  reaction?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────

export interface AuthState {
  token: string | null;
  userId: string | null;
}
