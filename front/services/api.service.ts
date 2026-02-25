/**
 * API Service
 * 
 * Centralized API client with proper TypeScript types
 * All API calls should go through this service
 */

import { API_BASE_URL } from '../constants';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiError,
  CreateRoomRequest,
  JoinRoomRequest,
  Room,
  User,
} from '../types/api.types';

// ─────────────────────────────────────────────────────────────
// Base API Client
// ─────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make authenticated request with token
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError | null = await response.json().catch(() => null);
      const errorMessage = error?.message
        ? Array.isArray(error.message)
          ? error.message.join(', ')
          : error.message
        : `Request failed (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, token);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      token,
    );
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      token,
    );
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      token,
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, token);
  }
}

// ─────────────────────────────────────────────────────────────
// API Endpoints
// ─────────────────────────────────────────────────────────────

const client = new ApiClient(API_BASE_URL || 'http://localhost:3000');

// ─────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return client.post<AuthResponse>('/auth/login', data);
  },

  /**
   * Register new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return client.post<AuthResponse>('/auth/register', data);
  },

  /**
   * Verify token
   */
  verify: async (token: string): Promise<{ valid: boolean }> => {
    return client.get<{ valid: boolean }>('/auth/verify', token);
  },

  /**
   * Request password reset link
   */
  forgotPassword: async (email: string): Promise<void> => {
    return client.post<void>('/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: any): Promise<void> => {
    return client.post<void>('/auth/reset-password', data);
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string): Promise<void> => {
    return client.post<void>('/auth/verify-email', { token });
  },

  /**
   * Resend verification email
   */
  resendVerification: async (email: string): Promise<void> => {
    return client.post<void>('/auth/resend-verification', { email });
  },
  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<RegisterRequest>, token: string): Promise<{ user: User; accessToken: string }> => {
    return client.patch<{ user: User; accessToken: string }>('/profile', data, token);
  },
};

// ─────────────────────────────────────────────────────────────
// Room API
// ─────────────────────────────────────────────────────────────

export const roomApi = {
  /**
   * Create a new room
   */
  create: async (data: CreateRoomRequest, token: string): Promise<Room> => {
    return client.post<Room>('/rooms', data, token);
  },

  /**
   * Join existing room
   */
  join: async (data: JoinRoomRequest, token: string): Promise<Room> => {
    return client.post<Room>('/rooms/join', data, token);
  },

  /**
   * Get room by ID
   */
  getById: async (roomId: string, token: string): Promise<Room> => {
    return client.get<Room>(`/rooms/${roomId}`, token);
  },

  /**
   * Get room by code
   */
  getByCode: async (roomCode: string, token: string): Promise<Room> => {
    return client.get<Room>(`/rooms/code/${roomCode}`, token);
  },

  /**
   * Leave room
   */
  leave: async (roomId: string, token: string): Promise<void> => {
    return client.post<void>(`/rooms/${roomId}/leave`, {}, token);
  },

  /**
   * End room (host only)
   */
  end: async (roomId: string, token: string): Promise<void> => {
    return client.post<void>(`/rooms/${roomId}/end`, {}, token);
  },
};

// ─────────────────────────────────────────────────────────────
// Health API
// ─────────────────────────────────────────────────────────────

export const healthApi = {
  /**
   * Check server health
   */
  check: async (): Promise<{ status: string; timestamp: string }> => {
    return client.get<{ status: string; timestamp: string }>('/health');
  },
};

// ─────────────────────────────────────────────────────────────
// Sessions API (Discovery)
// ─────────────────────────────────────────────────────────────

export const sessionsApi = {
  /**
   * Get all sessions with filters
   */
  getSessions: async (params: any, token?: string): Promise<{ sessions: any[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return client.get<{ sessions: any[]; total: number }>(`/sessions?${query.toString()}`, token);
  },

  /**
   * Get session by ID
   */
  getSession: async (id: string, token?: string): Promise<any> => {
    return client.get<any>(`/sessions/${id}`, token);
  },

  /**
   * Get teacher profile
   */
  getTeacher: async (id: string, token?: string): Promise<any> => {
    return client.get<any>(`/sessions/teacher/${id}`, token);
  },
};

// ─────────────────────────────────────────────────────────────
// Utility: Decode JWT
// ─────────────────────────────────────────────────────────────

export function decodeJWT<T = Record<string, unknown>>(token: string): T {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}
