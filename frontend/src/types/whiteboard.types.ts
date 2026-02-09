export type DrawingTool = 'pen' | 'line' | 'rect' | 'circle' | 'text' | 'eraser' | 'select';

export interface WhiteboardObject {
  type: string;
  left: number;
  top: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  radius?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  path?: any;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
}

export interface WhiteboardCursor {
  userId: string;
  displayName: string;
  x: number;
  y: number;
  color: string;
}

export interface WhiteboardDrawEvent {
  roomId: string;
  object: WhiteboardObject;
  userId: string;
}

export interface WhiteboardCursorEvent {
  roomId: string;
  userId: string;
  x: number;
  y: number;
}

export interface WhiteboardClearEvent {
  roomId: string;
}

export interface WhiteboardUndoEvent {
  roomId: string;
}

export interface WhiteboardStateEvent {
  roomId: string;
  state: string; // JSON serialized canvas state
}
