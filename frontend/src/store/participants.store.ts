import { create } from 'zustand';
import type { RemoteParticipant, RoomRole } from '../types';

interface ParticipantsState {
  participants: Map<string, RemoteParticipant>;
  activeSpeakerId: string | null;
}

interface ParticipantsActions {
  addParticipant: (userId: string, displayName: string, role: RoomRole) => void;
  removeParticipant: (userId: string) => void;
  setParticipantAudioTrack: (userId: string, track: MediaStreamTrack | null) => void;
  setParticipantVideoTrack: (userId: string, track: MediaStreamTrack | null) => void;
  setParticipantMuted: (userId: string, muted: boolean) => void;
  setParticipantVideoOff: (userId: string, videoOff: boolean) => void;
  setParticipantRole: (userId: string, role: RoomRole) => void;
  addConsumer: (userId: string, consumerId: string, consumer: import('mediasoup-client').types.Consumer) => void;
  removeConsumer: (userId: string, consumerId: string) => void;
  setActiveSpeaker: (userId: string | null) => void;
  syncParticipants: (serverParticipants: Array<{ userId: string; displayName: string; role: RoomRole; isMuted: boolean; isVideoOff: boolean }>, localUserId: string) => void;
  reset: () => void;
}

export const useParticipantsStore = create<ParticipantsState & ParticipantsActions>((set, get) => ({
  participants: new Map(),
  activeSpeakerId: null,

  addParticipant: (userId, displayName, role) => {
    const current = get().participants;
    if (current.has(userId)) return;
    const next = new Map(current);
    next.set(userId, {
      userId,
      displayName,
      role,
      audioTrack: null,
      videoTrack: null,
      isMuted: false,
      isVideoOff: false,
      consumers: new Map(),
    });
    set({ participants: next });
  },

  removeParticipant: (userId) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    // Close all consumers for this participant
    for (const consumer of participant.consumers.values()) {
      if (!consumer.closed) consumer.close();
    }

    const next = new Map(current);
    next.delete(userId);
    set({ participants: next });
  },

  setParticipantAudioTrack: (userId, track) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const next = new Map(current);
    next.set(userId, { ...participant, audioTrack: track });
    set({ participants: next });
  },

  setParticipantVideoTrack: (userId, track) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const next = new Map(current);
    next.set(userId, { ...participant, videoTrack: track });
    set({ participants: next });
  },

  setParticipantMuted: (userId, muted) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const next = new Map(current);
    next.set(userId, { ...participant, isMuted: muted });
    set({ participants: next });
  },

  setParticipantVideoOff: (userId, videoOff) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const next = new Map(current);
    next.set(userId, { ...participant, isVideoOff: videoOff });
    set({ participants: next });
  },

  setParticipantRole: (userId, role) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const next = new Map(current);
    next.set(userId, { ...participant, role });
    set({ participants: next });
  },

  addConsumer: (userId, consumerId, consumer) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const consumers = new Map(participant.consumers);
    consumers.set(consumerId, consumer);

    const next = new Map(current);
    next.set(userId, { ...participant, consumers });
    set({ participants: next });
  },

  removeConsumer: (userId, consumerId) => {
    const current = get().participants;
    const participant = current.get(userId);
    if (!participant) return;

    const consumer = participant.consumers.get(consumerId);
    if (consumer && !consumer.closed) consumer.close();

    const consumers = new Map(participant.consumers);
    consumers.delete(consumerId);

    const next = new Map(current);
    next.set(userId, { ...participant, consumers });
    set({ participants: next });
  },

  setActiveSpeaker: (userId) => set({ activeSpeakerId: userId }),

  syncParticipants: (serverParticipants, localUserId) => {
    const current = get().participants;
    const next = new Map(current);

    const serverIds = new Set(serverParticipants.map((p) => p.userId));

    // Add missing participants
    for (const sp of serverParticipants) {
      if (sp.userId === localUserId) continue;
      if (!next.has(sp.userId)) {
        next.set(sp.userId, {
          userId: sp.userId,
          displayName: sp.displayName,
          role: sp.role,
          audioTrack: null,
          videoTrack: null,
          isMuted: sp.isMuted,
          isVideoOff: sp.isVideoOff,
          consumers: new Map(),
        });
      } else {
        const existing = next.get(sp.userId)!;
        next.set(sp.userId, {
          ...existing,
          displayName: sp.displayName,
          role: sp.role,
          isMuted: sp.isMuted,
          isVideoOff: sp.isVideoOff,
        });
      }
    }

    // Remove participants that left
    for (const userId of current.keys()) {
      if (!serverIds.has(userId) && userId !== localUserId) {
        const p = next.get(userId);
        if (p) {
          for (const consumer of p.consumers.values()) {
            if (!consumer.closed) consumer.close();
          }
        }
        next.delete(userId);
      }
    }

    set({ participants: next });
  },

  reset: () => {
    // Close all consumers
    const current = get().participants;
    for (const p of current.values()) {
      for (const consumer of p.consumers.values()) {
        if (!consumer.closed) consumer.close();
      }
    }
    set({ participants: new Map(), activeSpeakerId: null });
  },
}));
