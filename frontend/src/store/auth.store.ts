import { create } from 'zustand';
import type { AuthState } from '../types';
import type { JwtPayload } from '../types/api.types';

const TOKEN_KEY = 'vc_token';
const USERID_KEY = 'vc_userId';
const DISPLAYNAME_KEY = 'vc_displayName';

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

function readPersistedDisplayName(): string | null {
  try {
    return sessionStorage.getItem(DISPLAYNAME_KEY);
  } catch {
    return null;
  }
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

interface AuthStoreState extends AuthState {
  displayName: string | null;
}

interface AuthStore extends AuthStoreState {
  setAuth: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: readPersistedToken(),
  userId: readPersistedUserId(),
  displayName: readPersistedDisplayName(),

  setAuth: (token) => {
    const payload = decodeJwt(token);
    const userId = payload?.sub || null;
    const displayName = payload?.displayName || null;

    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      if (userId) sessionStorage.setItem(USERID_KEY, userId);
      if (displayName) sessionStorage.setItem(DISPLAYNAME_KEY, displayName);
    } catch {
      // Private browsing — continue in-memory only
    }
    set({ token, userId, displayName });
  },

  clearAuth: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USERID_KEY);
      sessionStorage.removeItem(DISPLAYNAME_KEY);
    } catch {
      // noop
    }
    set({ token: null, userId: null, displayName: null });
  },
}));
