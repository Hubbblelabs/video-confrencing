import type { RoomRole } from '../enums';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedSocket {
  id: string;
  userId: string;
  email: string;
  roomId?: string;
  role?: RoomRole;
}

export interface RoomParticipant {
  userId: string;
  socketId: string;
  role: RoomRole;
  joinedAt: number;
  producerIds: string[];
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface RedisRoomState {
  roomId: string;
  hostUserId: string;
  status: string;
  createdAt: number;
  maxParticipants: number;
  routerId: string;
  participants: Record<string, RoomParticipant>;
}

export interface TransportOptions {
  id: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: Record<string, unknown>;
}

export interface ProduceOptions {
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: Record<string, unknown>;
  appData: Record<string, unknown>;
}

export interface ConsumeOptions {
  producerId: string;
  rtpCapabilities: Record<string, unknown>;
}
