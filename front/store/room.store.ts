import { create } from 'zustand';
import type { RoomRole, ConnectionState } from '../types';

const ROOM_ID_KEY = 'vc_roomId';
const ROOM_CODE_KEY = 'vc_roomCode';
const ROOM_ROLE_KEY = 'vc_roomRole';

function readPersistedRoomId(): string | null {
  try {
    return sessionStorage.getItem(ROOM_ID_KEY);
  } catch {
    return null;
  }
}

function readPersistedRoomCode(): string | null {
  try {
    return sessionStorage.getItem(ROOM_CODE_KEY);
  } catch {
    return null;
  }
}

function readPersistedRoomRole(): RoomRole | null {
  try {
    const role = sessionStorage.getItem(ROOM_ROLE_KEY);
    return role as RoomRole | null;
  } catch {
    return null;
  }
}

interface RoomState {
  roomId: string | null;
  roomCode: string | null;
  role: RoomRole | null;
  connectionState: ConnectionState;
  error: string | null;
  isKicked: boolean;
  kickReason: string | null;
  allowScreenShare: boolean;
  allowWhiteboard: boolean;
}

interface RoomActions {
  setRoom: (roomId: string, roomCode: string | null, role: RoomRole, allowScreenShare?: boolean, allowWhiteboard?: boolean) => void;
  setConnectionState: (state: ConnectionState) => void;
  setError: (error: string | null) => void;
  setKicked: (reason: string) => void;
  setRole: (role: RoomRole) => void;
  setRoomSettings: (settings: { allowScreenShare?: boolean; allowWhiteboard?: boolean }) => void;
  reset: () => void;
}

const initialState: RoomState = {
  roomId: readPersistedRoomId(),
  roomCode: readPersistedRoomCode(),
  role: readPersistedRoomRole(),
  connectionState: 'disconnected',
  error: null,
  isKicked: false,
  kickReason: null,
  allowScreenShare: true,
  allowWhiteboard: true,
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  setRoom: (roomId, roomCode, role, allowScreenShare = true, allowWhiteboard = true) => {
    try {
      sessionStorage.setItem(ROOM_ID_KEY, roomId);
      if (roomCode) sessionStorage.setItem(ROOM_CODE_KEY, roomCode);
      sessionStorage.setItem(ROOM_ROLE_KEY, role);
    } catch {
      // Private browsing — continue in-memory only
    }
    set({ roomId, roomCode, role, error: null, isKicked: false, kickReason: null, allowScreenShare, allowWhiteboard });
  },

  setConnectionState: (connectionState) => set({ connectionState }),

  setError: (error) => set({ error }),

  setKicked: (reason) => set({ isKicked: true, kickReason: reason }),

  setRole: (role) => {
    try {
      sessionStorage.setItem(ROOM_ROLE_KEY, role);
    } catch {
      // Private browsing
    }
    set({ role });
  },

  setRoomSettings: (settings) => set((state) => ({ ...state, ...settings })),

  reset: () => {
    try {
      sessionStorage.removeItem(ROOM_ID_KEY);
      sessionStorage.removeItem(ROOM_CODE_KEY);
      sessionStorage.removeItem(ROOM_ROLE_KEY);
    } catch {
      // Private browsing
    }
    set({ ...initialState, roomId: null, roomCode: null, role: null });
  },
}));
