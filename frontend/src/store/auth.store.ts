import { create } from 'zustand';
import type { AuthState } from '../types';
import type { JwtPayload, UserRole } from '../types/api.types';

const TOKEN_KEY = 'vc_token';
const USERID_KEY = 'vc_userId';
const DISPLAYNAME_KEY = 'vc_displayName';
const ROLE_KEY = 'vc_role';

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

function readPersistedRole(): UserRole | null {
  try {
    return sessionStorage.getItem(ROLE_KEY) as UserRole | null;
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
  role: UserRole | null;
}

interface AuthStore extends AuthStoreState {
  setAuth: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: readPersistedToken(),
  userId: readPersistedUserId(),
  displayName: readPersistedDisplayName(),
  role: readPersistedRole(),

  setAuth: (token) => {
    const payload = decodeJwt(token);
    const userId = payload?.sub || null;
    const displayName = payload?.displayName || null;
    const role = payload?.role || null;

    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      if (userId) sessionStorage.setItem(USERID_KEY, userId);
      if (displayName) sessionStorage.setItem(DISPLAYNAME_KEY, displayName);
      if (role) sessionStorage.setItem(ROLE_KEY, role);
    } catch {
      // Private browsing — continue in-memory only
    }
    set({ token, userId, displayName, role });
  },

  clearAuth: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USERID_KEY);
      sessionStorage.removeItem(DISPLAYNAME_KEY);
      sessionStorage.removeItem(ROLE_KEY);
    } catch {
      // noop
    }
    set({ token: null, userId: null, displayName: null, role: null });
  },
}));

