export type MessageType = 'text' | 'private' | 'file' | 'image';

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message?: string;
  type: MessageType;
  timestamp: string;
  targetUserId?: string; // For private messages
  fileName?: string;
  fileType?: string;
  fileData?: string;
  fileSize?: number;
}

export interface TypingIndicator {
  userId: string;
  displayName: string;
  isTyping: boolean;
}

export interface ChatUser {
  userId: string;
  displayName: string;
}

export interface SendMessagePayload {
  roomId: string;
  message: string;
}

export interface SendPrivateMessagePayload {
  roomId: string;
  targetUserId: string;
  message: string;
}

export interface SendFilePayload {
  roomId: string;
  fileName: string;
  fileType: string;
  fileData: string;
  fileSize: number;
}

export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

export interface Question {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  profilePictureUrl?: string; // Add if available
  content: string;
  upvotes: number;
  isUpvoted: boolean;
  isAnswered: boolean;
  timestamp: string;
}

export interface AskQuestionPayload {
  roomId: string;
  content: string;
}

export interface UpvoteQuestionPayload {
  roomId: string; // needed for broadcasting
  questionId: string;
}

export interface AnswerQuestionPayload {
  roomId: string;
  questionId: string;
}

export interface DeleteQuestionPayload {
  roomId: string;
  questionId: string;
}
