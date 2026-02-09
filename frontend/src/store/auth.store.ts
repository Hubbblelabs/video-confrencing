import { create } from 'zustand';
import type { AuthState } from '../types';

const TOKEN_KEY = 'vc_token';
const USERID_KEY = 'vc_userId';

function readPersistedToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function readPersistedUserId(): string | null {
  try {
    return sessionStorage.getItem(USERID_KEY);
  } catch {
    return null;
  }
}

interface AuthStore extends AuthState {
  setAuth: (token: string, userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: readPersistedToken(),
  userId: readPersistedUserId(),

  setAuth: (token, userId) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USERID_KEY, userId);
    } catch {
      // Private browsing — continue in-memory only
    }
    set({ token, userId });
  },

  clearAuth: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USERID_KEY);
    } catch {
      // noop
    }
    set({ token: null, userId: null });
  },
}));
