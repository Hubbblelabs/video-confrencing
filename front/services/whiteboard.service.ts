import { API_BASE_URL } from '../constants';

export interface SlideData {
  slideIndex: number;
  elements: unknown[];
  thumbnailDataUrl: string | null;
}

export interface WhiteboardSession {
  id: string;
  meetingId: string;
  hostId: string;
  title: string | null;
  slideCount: number;
  slidesData: SlideData[];
  pdfBase64: string | null;
  createdAt: string;
  updatedAt: string;
  host?: { id: string; displayName: string; email: string };
}

export interface SaveWhiteboardRequest {
  meetingId: string;
  title?: string;
  slidesData: SlideData[];
  pdfBase64: string;
}

class WhiteboardApiService {
  private baseUrl = API_BASE_URL;

  private getHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async saveWhiteboard(data: SaveWhiteboardRequest, token: string): Promise<WhiteboardSession> {
    const res = await fetch(`${this.baseUrl}/whiteboard/save`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `Failed to save whiteboard (${res.status})`);
    }
    return res.json();
  }

  async getWhiteboardsForMeeting(meetingId: string, token: string): Promise<WhiteboardSession[]> {
    const res = await fetch(`${this.baseUrl}/whiteboard/meeting/${meetingId}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to fetch whiteboards');
    return res.json();
  }

  async getWhiteboardById(id: string, token: string): Promise<WhiteboardSession> {
    const res = await fetch(`${this.baseUrl}/whiteboard/${id}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to fetch whiteboard');
    return res.json();
  }

  async getMyWhiteboards(token: string): Promise<WhiteboardSession[]> {
    const res = await fetch(`${this.baseUrl}/whiteboard/teacher/my`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to fetch whiteboards');
    return res.json();
  }

  async getAllWhiteboards(token: string): Promise<WhiteboardSession[]> {
    const res = await fetch(`${this.baseUrl}/whiteboard/admin/all`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to fetch all whiteboards');
    return res.json();
  }
}

export const whiteboardService = new WhiteboardApiService();
