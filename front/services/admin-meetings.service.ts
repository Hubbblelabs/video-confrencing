// Admin API endpoints for meeting management

export interface AdminMeeting {
    id: string;
    title: string;
    roomCode: string;
    hostId: string;
    status: string;
    maxParticipants: number;
    startedAt: string | null;
    endedAt: string | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    peakParticipants: number;
    createdAt: string;
    updatedAt: string;
    host?: {
        displayName: string;
        email: string;
    };
}

export interface MeetingHistoryResponse {
    meetings: AdminMeeting[];
    total: number;
}

export interface ScheduleMeetingRequest {
    title: string;
    scheduledStart: string;
    scheduledEnd: string;
    maxParticipants?: number;
    allowScreenShare?: boolean;
    allowWhiteboard?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export const adminMeetingsApi = {
    // Get meeting history
    getHistory: async (
        token: string,
        filters: { startDate?: string; endDate?: string; limit?: number; offset?: number } = {}
    ): Promise<MeetingHistoryResponse> => {
        const url = new URL(`${API_BASE}/admin/meetings/history`);
        if (filters.startDate) url.searchParams.append('startDate', filters.startDate);
        if (filters.endDate) url.searchParams.append('endDate', filters.endDate);
        if (filters.limit) url.searchParams.append('limit', String(filters.limit));
        if (filters.offset) url.searchParams.append('offset', String(filters.offset));

        const response = await fetch(url.toString(), {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch history' }));
            throw new Error(error.message || 'Failed to fetch history');
        }

        return response.json();
    },

    // Get scheduled meetings
    getSchedule: async (
        token: string,
        filters: { startDate?: string; endDate?: string } = {}
    ): Promise<AdminMeeting[]> => {
        const url = new URL(`${API_BASE}/admin/meetings/schedule`);
        if (filters.startDate) url.searchParams.append('startDate', filters.startDate);
        if (filters.endDate) url.searchParams.append('endDate', filters.endDate);

        const response = await fetch(url.toString(), {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch schedule' }));
            throw new Error(error.message || 'Failed to fetch schedule');
        }

        return response.json();
    },

    // Schedule a meeting
    schedule: async (token: string, data: ScheduleMeetingRequest): Promise<AdminMeeting> => {
        const response = await fetch(`${API_BASE}/admin/meetings/schedule`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to schedule meeting' }));
            throw new Error(error.message || 'Failed to schedule meeting');
        }

        return response.json();
    },

    // Create instant meeting
    createInstantMeeting: async (token: string, options?: { allowScreenShare?: boolean; allowWhiteboard?: boolean }): Promise<{ roomId: string; roomCode: string }> => {
        const response = await fetch(`${API_BASE}/admin/meetings/create`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: options ? JSON.stringify(options) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to create meeting' }));
            throw new Error(error.message || 'Failed to create meeting');
        }

        return response.json();
    },

    // Start a scheduled meeting (activate it in Redis)
    startMeeting: async (token: string, meetingId: string): Promise<{ roomId: string; roomCode: string }> => {
        const response = await fetch(`${API_BASE}/admin/meetings/${meetingId}/start`, {
            method: 'POST',
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to start meeting' }));
            throw new Error(error.message || 'Failed to start meeting');
        }

        return response.json();
    },
};
