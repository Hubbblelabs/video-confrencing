export interface WaitingParticipant {
  userId: string;
  displayName: string;
  socketId: string;
  joinedAt: number;
}

export interface WaitingRoomState {
  participants: WaitingParticipant[];
  waitingCount: number;
}

export interface JoinWaitingRoomResponse {
  success: boolean;
  message?: string;
  position?: number;
}

export interface AdmitParticipantPayload {
  roomId: string;
  userId: string;
}

export interface RejectParticipantPayload {
  roomId: string;
  userId: string;
}

export interface AdmitAllPayload {
  roomId: string;
}

export interface WaitingParticipantJoinedEvent {
  participant: WaitingParticipant;
  waitingCount: number;
}

export interface ParticipantAdmittedEvent {
  roomId: string;
}

export interface ParticipantRejectedEvent {
  roomId: string;
  message: string;
}

export interface WaitingRoomUpdatedEvent {
  participants: WaitingParticipant[];
  waitingCount: number;
}
