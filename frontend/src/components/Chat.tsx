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
  privateMessageTarget: string | null;
  onCancelPrivateMessage: () => void;
  onStartPrivateMessage: (userId: string) => void;
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
  privateMessageTarget,
  onCancelPrivateMessage,
  onStartPrivateMessage,
}: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  // privateMessageTarget lifted to parent
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
      // Don't close private mode automatically, or do? 
      // User might want to send multiple messages.
      // previous logic: setPrivateMessageTarget(null); -> this closed it after one message.
      // Let's keep it open for better UX? Or stick to previous behavior?
      // "private message is unavailable" -> usually means "hard to access".
      // If I send a DM, I expect to stay in DM mode until I cancel.
      // But for now, let's stick to closing it to match previous logic, or maybe keep it open.
      // Let's keep it open! It's better UX.
      // But wait, the original code closed it: setPrivateMessageTarget(null);
      // Let's keep it open.
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

  // Use the prop directly for target
  const startPrivateMessage = (userId: string) => {
    onStartPrivateMessage(userId);
    setShowParticipants(false);
  };
  const cancelPrivateMessage = () => {
    onCancelPrivateMessage();
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
    <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-border shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg border border-white/5">
            <ChatIcon className="text-primary w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm font-heading">Live Chat</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              {messages.length} MESSAGES
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-2 rounded-lg transition-all ${showParticipants ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-muted-foreground hover:text-foreground'}`}
            title="Private Message"
          >
            <UsersIcon />
          </button>
          <button
            onClick={onExport}
            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            title="Export Chat"
          >
            <ExportIcon />
          </button>
          <button
            onClick={onClear}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            title="Clear Chat"
          >
            <ClearIcon />
          </button>
        </div>
      </div>

      {/* Participants Panel Overlay */}
      {showParticipants && (
        <div className="absolute top-[72px] inset-x-0 z-20 p-2 bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-white/10 animate-fade-in shadow-2xl">
          <div className="text-xs font-bold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Select User to Message
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-white/10">
            {participants.map(participant => (
              participant.userId !== currentUserId && (
                <button
                  key={participant.userId}
                  onClick={() => startPrivateMessage(participant.userId)}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/30 text-foreground transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary text-[9px] flex items-center justify-center font-bold text-white shadow-sm">
                    {participant.displayName.charAt(0)}
                  </div>
                  {participant.displayName}
                </button>
              )
            ))}
            {participants.length <= 1 && (
              <div className="text-xs text-muted-foreground px-2 py-1">No other participants</div>
            )}
          </div>
        </div>
      )}

      {/* Private Message Banner */}
      {privateMessageTarget && targetUser && (
        <div className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-blue-500/20 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wide">
            <LockIcon />
            <span>Private to <span className="text-foreground border-b border-blue-500/30">{targetUser.displayName}</span></span>
          </div>
          <button
            onClick={cancelPrivateMessage}
            className="text-muted-foreground hover:text-foreground transition-colors w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center backdrop-blur-sm border border-white/5">
              <ChatIcon className="w-8 h-8 opacity-40 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground/80">No messages yet</p>
              <p className="text-xs mt-1 opacity-50">Be the first to say hello!</p>
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
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group animate-slide-up`}
              >
                <div className="flex items-center gap-2 mb-1 px-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {!isOwn && (
                    <span className="text-[10px] font-bold text-foreground tracking-wide">
                      {message.displayName}
                    </span>
                  )}
                  {isPrivate && (
                    <span className="text-[9px] text-blue-400 flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded-full border border-blue-500/20 font-bold tracking-wider">
                      <LockIcon size={8} />
                      PRIVATE
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm backdrop-blur-sm border ${isOwn
                    ? 'bg-gradient-to-br from-primary/90 to-primary/80 text-white rounded-tr-sm border-primary/50 shadow-primary/10'
                    : isPrivate
                      ? 'bg-blue-500/10 border-blue-500/20 text-foreground rounded-tl-sm'
                      : 'bg-white/10 text-foreground border-white/10 rounded-tl-sm hover:bg-white/15 transition-colors'
                    }`}
                >
                  {/* Message Content */}
                  {isFile ? (
                    <div className="space-y-2">
                      {isImage && message.fileData ? (
                        <div className="relative group/image overflow-hidden rounded-lg border border-white/10">
                          <img
                            src={message.fileData}
                            alt={message.fileName}
                            className="max-w-full h-auto object-cover transition-transform duration-500 group-hover/image:scale-105"
                            style={{ maxHeight: '200px' }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                            <button
                              onClick={() => downloadFile(message)}
                              className="p-2 bg-white/20 rounded-full hover:bg-primary hover:text-white backdrop-blur-md transition-all text-white border border-white/20"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-white/5 hover:bg-black/30 transition-colors">
                          <span className="text-2xl drop-shadow-md">{getFileIcon(message.fileType)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{message.fileName}</div>
                            <div className="text-[10px] opacity-70 font-mono mt-0.5">
                              {formatFileSize(message.fileSize)}
                            </div>
                          </div>
                          <button
                            onClick={() => downloadFile(message)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
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
          <div className="flex items-center gap-2 px-2 animate-fade-in bg-white/5 w-fit p-2 rounded-full border border-white/5">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
              {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-muted/30 border-t border-border backdrop-blur-md">
        <div className="flex items-end gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 focus-within:bg-black/40 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title="Attach File"
          >
            <AttachIcon />
          </button>
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={privateMessageTarget ? `Message ${targetUser?.displayName}...` : 'Type a message...'}
            className="flex-1 max-h-24 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 resize-none focus:ring-0 py-2.5 px-1 text-sm scrollbar-hide font-medium leading-relaxed"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`p-2.5 rounded-xl transition-all duration-300 ${inputValue.trim()
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95'
              : 'bg-white/5 text-muted-foreground/50 cursor-not-allowed'
              }`}
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
  <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
