import { create } from 'zustand';
import type { RoomRole, ConnectionState } from '../types';

interface RoomState {
  roomId: string | null;
  roomCode: string | null;
  role: RoomRole | null;
  connectionState: ConnectionState;
  error: string | null;
  isKicked: boolean;
  kickReason: string | null;
}

interface RoomActions {
  setRoom: (roomId: string, roomCode: string | null, role: RoomRole) => void;
  setConnectionState: (state: ConnectionState) => void;
  setError: (error: string | null) => void;
  setKicked: (reason: string) => void;
  setRole: (role: RoomRole) => void;
  reset: () => void;
}

const initialState: RoomState = {
  roomId: null,
  roomCode: null,
  role: null,
  connectionState: 'disconnected',
  error: null,
  isKicked: false,
  kickReason: null,
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  setRoom: (roomId, roomCode, role) =>
    set({ roomId, roomCode, role, error: null, isKicked: false, kickReason: null }),

  setConnectionState: (connectionState) => set({ connectionState }),

  setError: (error) => set({ error }),

  setKicked: (reason) => set({ isKicked: true, kickReason: reason }),

  setRole: (role) => set({ role }),

  reset: () => set(initialState),
}));
