// Attendance API service

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roomId: string;
  roomTitle: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  durationSeconds: number | null;
  durationMinutes: number | null;
  isKicked: boolean;
}

export interface AttendanceStatistics {
  totalSessions: number;
  totalMinutes: number;
  averageMinutesPerSession: number;
  uniqueUsers: number;
  uniqueRooms: number;
}

export interface UserAttendanceSummary {
  userId: string;
  userName: string;
  userEmail: string;
  totalSessions: number;
  totalMinutes: number;
  lastAttended: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const attendanceApi = {
  // Get all attendance records
  getRecords: async (
    token: string,
    filters?: {
      userId?: string;
      roomId?: string;
      startDate?: string;
      endDate?: string;
      role?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ records: AttendanceRecord[]; total: number }> => {
    const url = new URL(`${API_BASE}/attendance`);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch attendance records' }));
      throw new Error(error.message || 'Failed to fetch attendance records');
    }

    return response.json();
  },

  // Get attendance statistics
  getStatistics: async (
    token: string,
    filters?: {
      userId?: string;
      roomId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<AttendanceStatistics> => {
    const url = new URL(`${API_BASE}/attendance/statistics`);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch statistics' }));
      throw new Error(error.message || 'Failed to fetch statistics');
    }

    return response.json();
  },

  // Get user attendance summary
  getSummary: async (
    token: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ users: UserAttendanceSummary[]; total: number }> => {
    const url = new URL(`${API_BASE}/attendance/summary`);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch summary' }));
      throw new Error(error.message || 'Failed to fetch summary');
    }

    return response.json();
  },

  // Get active sessions
  getActiveSessions: async (token: string): Promise<AttendanceRecord[]> => {
    const response = await fetch(`${API_BASE}/attendance/active`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch active sessions' }));
      throw new Error(error.message || 'Failed to fetch active sessions');
    }

    return response.json();
  },

  // Get attendance by room
  getByRoom: async (token: string, roomId: string): Promise<AttendanceRecord[]> => {
    const response = await fetch(`${API_BASE}/attendance/room/${roomId}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch room attendance' }));
      throw new Error(error.message || 'Failed to fetch room attendance');
    }

    return response.json();
  },
};
