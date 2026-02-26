export type ExcalidrawElement = any;
export type AppState = any;

export interface WhiteboardCursor {
  userId: string;
  displayName: string;
  x: number;
  y: number;
  color: string;
}

export interface WhiteboardSyncPayload {
  elements: readonly ExcalidrawElement[];
}

export interface WhiteboardDrawEvent {
  roomId: string;
  userId: string;
  elements: readonly ExcalidrawElement[];
}

export interface WhiteboardCursorEvent {
  roomId: string;
  userId: string;
  displayName: string;
  x: number;
  y: number;
}

export interface WhiteboardClearEvent {
  roomId: string;
  userId: string;
}

export interface WhiteboardStateEvent {
  roomId: string;
  userId: string;
  active: boolean;
}
