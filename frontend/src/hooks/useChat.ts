import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants';
import type { ChatMessage, TypingIndicator } from '../types/chat.types';

interface UseChatProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
}

export function useChat({ socket, roomId }: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Send text message
  const sendMessage = useCallback((message: string) => {
    if (!socket || !message.trim()) return;

    socket.emit(WS_EVENTS.CHAT_MESSAGE, {
      roomId,
      message: message.trim(),
    });
  }, [socket, roomId]);

  // Send private message
  const sendPrivateMessage = useCallback((targetUserId: string, message: string) => {
    if (!socket || !message.trim()) return;

    socket.emit(WS_EVENTS.CHAT_PRIVATE_MESSAGE, {
      roomId,
      targetUserId,
      message: message.trim(),
    });
  }, [socket, roomId]);

  // Send file
  const sendFile = useCallback((file: File) => {
    if (!socket) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      
      socket.emit(WS_EVENTS.CHAT_FILE_UPLOAD, {
        roomId,
        fileName: file.name,
        fileType: file.type,
        fileData,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  }, [socket, roomId]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!socket) return;

    socket.emit(WS_EVENTS.CHAT_TYPING, {
      roomId,
      isTyping,
    });
  }, [socket, roomId]);

  // Handle typing with auto-stop after 3 seconds
  const handleTyping = useCallback(() => {
    sendTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 3000);
  }, [sendTyping]);

  // Export messages as JSON
  const exportMessages = useCallback(() => {
    const exportData = {
      roomId,
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        ...msg,
        // Don't include file data in export (too large)
        fileData: msg.type === 'file' ? undefined : msg.fileData,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${roomId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, roomId]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
    };

    const handlePrivateMessageReceived = (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
    };

    const handleFileReceived = (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
    };

    const handleUserTyping = (data: TypingIndicator) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (data.isTyping) {
          newMap.set(data.userId, data);
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            setTypingUsers(current => {
              const updated = new Map(current);
              updated.delete(data.userId);
              return updated;
            });
          }, 3000);
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    };

    socket.on(WS_EVENTS.CHAT_MESSAGE_RECEIVED, handleMessageReceived);
    socket.on(WS_EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVED, handlePrivateMessageReceived);
    socket.on(WS_EVENTS.CHAT_FILE_RECEIVED, handleFileReceived);
    socket.on(WS_EVENTS.CHAT_USER_TYPING, handleUserTyping);

    return () => {
      socket.off(WS_EVENTS.CHAT_MESSAGE_RECEIVED, handleMessageReceived);
      socket.off(WS_EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVED, handlePrivateMessageReceived);
      socket.off(WS_EVENTS.CHAT_FILE_RECEIVED, handleFileReceived);
      socket.off(WS_EVENTS.CHAT_USER_TYPING, handleUserTyping);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket]);

  return {
    messages,
    typingUsers: Array.from(typingUsers.values()),
    sendMessage,
    sendPrivateMessage,
    sendFile,
    handleTyping,
    exportMessages,
    clearMessages,
  };
}
