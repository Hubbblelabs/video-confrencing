import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, TypingIndicator } from '../types/chat.types';

interface ChatProps {
  messages: ChatMessage[];
  typingUsers: TypingIndicator[];
  currentUserId: string;
  participants: Array<{ userId: string; displayName: string }>;
  onSendMessage: (message: string) => void;
  onSendPrivateMessage: (targetUserId: string, message: string) => void;
  onSendFile: (file: File) => void;
  onTyping: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function Chat({
  messages,
  typingUsers,
  currentUserId,
  participants,
  onSendMessage,
  onSendPrivateMessage,
  onSendFile,
  onTyping,
  onExport,
  onClear,
}: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [privateMessageTarget, setPrivateMessageTarget] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (privateMessageTarget) {
      onSendPrivateMessage(privateMessageTarget, inputValue);
      setPrivateMessageTarget(null);
    } else {
      onSendMessage(inputValue);
    }

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    onTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      onSendFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startPrivateMessage = (userId: string) => {
    setPrivateMessageTarget(userId);
    setShowParticipants(false);
  };

  const cancelPrivateMessage = () => {
    setPrivateMessageTarget(null);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const downloadFile = (message: ChatMessage) => {
    if (!message.fileData) return;
    
    const a = document.createElement('a');
    a.href = message.fileData;
    a.download = message.fileName || 'download';
    a.click();
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📄';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const targetUser = privateMessageTarget 
    ? participants.find(p => p.userId === privateMessageTarget)
    : null;

  return (
    <div className="h-full w-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <ChatIcon />
          <h3 className="font-semibold text-foreground">Chat</h3>
          <span className="text-xs text-muted-foreground">
            ({messages.length} messages)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 rounded hover:bg-muted transition-colors"
            title="Participants"
          >
            <UsersIcon />
          </button>
          <button
            onClick={onExport}
            className="p-2 rounded hover:bg-muted transition-colors"
            title="Export Chat"
          >
            <ExportIcon />
          </button>
          <button
            onClick={onClear}
            className="p-2 rounded hover:bg-muted transition-colors"
            title="Clear Chat"
          >
            <ClearIcon />
          </button>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="p-2 bg-muted/30 border-b border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Participants ({participants.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {participants.map(participant => (
              <button
                key={participant.userId}
                onClick={() => startPrivateMessage(participant.userId)}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                disabled={participant.userId === currentUserId}
              >
                {participant.displayName}
                {participant.userId === currentUserId && ' (You)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Private Message Banner */}
      {privateMessageTarget && targetUser && (
        <div className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <LockIcon />
            <span>Private message to <strong>{targetUser.displayName}</strong></span>
          </div>
          <button
            onClick={cancelPrivateMessage}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <ChatIcon className="mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.userId === currentUserId;
            const isPrivate = message.type === 'private';
            const isFile = message.type === 'file';
            const isImage = isFile && message.fileType?.startsWith('image/');

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg p-2 ${
                    isOwn
                      ? 'bg-[var(--primary)] text-white'
                      : isPrivate
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {message.displayName}
                    </span>
                    {isPrivate && (
                      <span className="text-xs opacity-75 flex items-center gap-1">
                        <LockIcon size={10} />
                        Private
                      </span>
                    )}
                    <span className="text-xs opacity-75">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>

                  {/* Message Content */}
                  {isFile ? (
                    <div className="space-y-2">
                      {isImage && message.fileData ? (
                        <img
                          src={message.fileData}
                          alt={message.fileName}
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: '200px' }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-2xl">{getFileIcon(message.fileType)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{message.fileName}</div>
                            <div className="text-xs opacity-75">
                              {formatFileSize(message.fileSize)}
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => downloadFile(message)}
                        className={`text-xs px-2 py-1 rounded ${
                          isOwn
                            ? 'bg-white/20 hover:bg-white/30'
                            : 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/80'
                        }`}
                      >
                        📥 Download
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.message}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-muted-foreground italic">
            {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-card border-t border-border">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
            title="Attach File"
          >
            <AttachIcon />
          </button>
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={privateMessageTarget ? `Private message to ${targetUser?.displayName}...` : 'Type a message...'}
            className="flex-1 px-3 py-2 rounded bg-muted text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            rows={1}
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 rounded bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send Message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// SVG Icons

const ChatIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ExportIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const AttachIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
