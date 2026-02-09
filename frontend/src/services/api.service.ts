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
   * DELETE request
   */
  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, token);
  }
}

// ─────────────────────────────────────────────────────────────
// API Endpoints
// ─────────────────────────────────────────────────────────────

const client = new ApiClient(API_BASE_URL);

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
