/**
 * Backend API Types
 * 
 * These types match the backend DTOs exactly
 * Keep in sync with backend/src/auth/dto/auth.dto.ts
 */

// ─────────────────────────────────────────────────────────────
// User Roles
// ─────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

// ─────────────────────────────────────────────────────────────
// Auth DTOs
// ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

export interface AuthResponse {
  accessToken: string;
}

// ─────────────────────────────────────────────────────────────
// JWT Payload
// ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;        // User ID
  email: string;
  displayName: string;
  role: UserRole;
  iat: number;        // Issued at
  exp: number;        // Expires at
}

// ─────────────────────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Room Types (for future use)
// ─────────────────────────────────────────────────────────────

export interface CreateRoomRequest {
  title: string;
  maxParticipants?: number;
  isPrivate?: boolean;
}

export interface JoinRoomRequest {
  roomCode: string;
}

export interface Room {
  id: string;
  roomCode: string;
  title: string;
  ownerId: string;
  maxParticipants: number;
  status: 'CREATED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// API Error Types
// ─────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Constraints (for frontend validation)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Auth DTOs (extended)
// ─────────────────────────────────────────────────────────────

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────
// Session Types
// ─────────────────────────────────────────────────────────────

export type SessionStatus = 'scheduled' | 'active' | 'waiting' | 'ended' | 'cancelled';

export interface Session {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  status: SessionStatus;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  hostId: string;
  host?: {
    displayName: string;
    profilePictureUrl?: string;
  };
  hostName?: string;
  roomId?: string;
  roomCode?: string;
  maxParticipants?: number;
  participantCount?: number;
  peakParticipants?: number;
  price?: number;
  isPublic?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface SessionsParams {
  q?: string;
  category?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
}

export interface TeacherProfile {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  sessions?: Session[];
}

export const ValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 8,
    maxLength: 128,
    required: true,
    message: 'Password must be at least 8 characters',
  },
  displayName: {
    minLength: 1,
    maxLength: 100,
    required: true,
    message: 'Display name is required',
  },
} as const;
