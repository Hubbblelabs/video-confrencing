import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants';
import type {
  WaitingParticipant,
  WaitingParticipantJoinedEvent,
  ParticipantAdmittedEvent,
  ParticipantRejectedEvent,
  WaitingRoomUpdatedEvent,
} from '../types/waitingRoom.types';

interface UseWaitingRoomProps {
  socket: Socket | null;
  roomId: string;
  isHost: boolean;
}

export function useWaitingRoom({ socket, roomId, isHost }: UseWaitingRoomProps) {
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingRoomMessage, setWaitingRoomMessage] = useState<string>('');
  const [wasRejected, setWasRejected] = useState(false);

  // Join waiting room (for guests)
  const joinWaitingRoom = useCallback(() => {
    if (!socket || !roomId) return;

    socket.emit(WS_EVENTS.JOIN_WAITING_ROOM, { roomId }, (response: any) => {
      if (response.success) {
        setIsInWaitingRoom(true);
        setWaitingRoomMessage(response.message || 'Waiting for host approval...');
      }
    });
  }, [socket, roomId]);

  // Admit a participant (host only)
  const admitParticipant = useCallback((userId: string) => {
    if (!socket || !roomId || !isHost) return;

    socket.emit(WS_EVENTS.ADMIT_PARTICIPANT, { roomId, userId }, (response: any) => {
      if (!response.success) {
        console.error('Failed to admit participant:', response.error);
      }
    });
  }, [socket, roomId, isHost]);

  // Reject a participant (host only)
  const rejectParticipant = useCallback((userId: string) => {
    if (!socket || !roomId || !isHost) return;

    socket.emit(WS_EVENTS.REJECT_PARTICIPANT, { roomId, userId }, (response: any) => {
      if (!response.success) {
        console.error('Failed to reject participant:',response.error);
      }
    });
  }, [socket, roomId, isHost]);

  // Admit all participants (host only)
  const admitAll = useCallback(() => {
    if (!socket || !roomId || !isHost) return;

    socket.emit(WS_EVENTS.ADMIT_ALL, { roomId }, (response: any) => {
      if (!response.success) {
        console.error('Failed to admit all:', response.error);
      }
    });
  }, [socket, roomId, isHost]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    // Host receives notifications when someone joins waiting room
    const handleParticipantJoined = (data: WaitingParticipantJoinedEvent) => {
      if (isHost) {
        setWaitingParticipants(prev => [...prev, data.participant]);
      }
    };

    // Guest receives notification when admitted
    const handleAdmitted = (data: ParticipantAdmittedEvent) => {
      if (!isHost && data.roomId === roomId) {
        setIsInWaitingRoom(false);
        setWaitingRoomMessage('');
        // The main app will handle the actual room join
      }
    };

    // Guest receives notification when rejected
    const handleRejected = (data: ParticipantRejectedEvent) => {
      if (!isHost && data.roomId === roomId) {
        setIsInWaitingRoom(false);
        setWasRejected(true);
        setWaitingRoomMessage(data.message || 'Access denied');
      }
    };

    // Host receives updated waiting room list
    const handleWaitingRoomUpdated = (data: WaitingRoomUpdatedEvent) => {
      if (isHost) {
        setWaitingParticipants(data.participants);
      }
    };

    socket.on(WS_EVENTS.WAITING_PARTICIPANT_JOINED, handleParticipantJoined);
    socket.on(WS_EVENTS.PARTICIPANT_ADMITTED, handleAdmitted);
    socket.on(WS_EVENTS.PARTICIPANT_REJECTED, handleRejected);
    socket.on(WS_EVENTS.WAITING_ROOM_UPDATED, handleWaitingRoomUpdated);

    return () => {
      socket.off(WS_EVENTS.WAITING_PARTICIPANT_JOINED, handleParticipantJoined);
      socket.off(WS_EVENTS.PARTICIPANT_ADMITTED, handleAdmitted);
      socket.off(WS_EVENTS.PARTICIPANT_REJECTED, handleRejected);
      socket.off(WS_EVENTS.WAITING_ROOM_UPDATED, handleWaitingRoomUpdated);
    };
  }, [socket, roomId, isHost]);

  return {
    waitingParticipants,
    isInWaitingRoom,
    waitingRoomMessage,
    wasRejected,
    joinWaitingRoom,
    admitParticipant,
    rejectParticipant,
    admitAll,
  };
}
