import { useState, useRef, useEffect, useMemo } from 'react';
import type { ChatMessage } from '../types/chat.types';
import type { Question } from '../types/chat.types';
import { QnA } from './QnA';

/**
 * Chat + QnA side panel for the meeting room.
 * All messaging, file sharing, typing indicators, and Q&A functionality preserved.
 */

interface ChatProps {
  messages: ChatMessage[];
  typingUsers: string[];
  currentUserId: string;
  participants: Array<{ userId: string; displayName: string }>;
  onSendMessage: (message: string) => void;
  onSendPrivateMessage: (targetUserId: string, message: string) => void;
  onSendFile: (file: File) => void;
  onTyping: () => void;
  onExport: () => void;
  onClear: () => void;

  // Private messaging
  privateMessageTarget: string | null;
  onCancelPrivateMessage: () => void;
  onStartPrivateMessage: (userId: string) => void;

  // QnA
  questions: Question[];
  onAskQuestion: (content: string) => void;
  onUpvoteQuestion: (questionId: string) => void;
  onMarkAnswered: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  isHost: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileIcon(fileType?: string): string {
  if (!fileType) return '📎';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType.startsWith('audio/')) return '🎵';
  return '📎';
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
  questions,
  onAskQuestion,
  onUpvoteQuestion,
  onMarkAnswered,
  onDeleteQuestion,
  isHost,
}: ChatProps) {
  const [message, setMessage] = useState('');
  const [showPrivateSelector, setShowPrivateSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'qna'>('chat');
  const [showMenu, setShowMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const targetParticipant = useMemo(
    () => participants.find((p) => p.userId === privateMessageTarget),
    [participants, privateMessageTarget],
  );

  const handleSend = () => {
    if (!message.trim()) return;
    if (privateMessageTarget) {
      onSendPrivateMessage(privateMessageTarget, message);
    } else {
      onSendMessage(message);
    }
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      onTyping();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }
    onSendFile(file);
    e.target.value = '';
  };

  const downloadFile = (msg: ChatMessage) => {
    if (!msg.fileData || !msg.fileName) return;
    const a = document.createElement('a');
    a.href = msg.fileData;
    a.download = msg.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full bg-white/5 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeTab === 'chat'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-white/50 hover:text-white/80'
              }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('qna')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeTab === 'qna'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-white/50 hover:text-white/80'
              }`}
          >
            Q&A {questions.length > 0 && `(${questions.length})`}
          </button>
        </div>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white/80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-[#2d2d2d] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { onExport(); setShowMenu(false); }}
                  className="flex items-center gap-2 text-left px-3 py-2 text-white/80 text-xs hover:bg-white/5 w-full transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export Chat
                </button>
                {isHost && (
                  <button
                    onClick={() => { onClear(); setShowMenu(false); }}
                    className="flex items-center gap-2 text-left px-3 py-2 text-red-400 text-xs hover:bg-red-500/10 w-full transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Clear Chat
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs font-medium">No messages yet</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.userId === currentUserId;
                const isPrivate = msg.type === 'private';
                const isFile = !!msg.fileName;
                const isImage = isFile && msg.fileType && ALLOWED_IMAGE_TYPES.includes(msg.fileType);

                return (
                  <div
                    key={msg.id || i}
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-slide-up`}
                  >
                    {/* Sender name */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-medium text-white/50">
                        {isOwn ? 'You' : msg.displayName}
                      </span>
                      <span className="text-[9px] text-white/25">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isPrivate && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                          DM
                        </span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${isOwn
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : isPrivate
                        ? 'bg-blue-500/10 border border-blue-500/20 text-white rounded-bl-sm'
                        : 'bg-white/[0.06] text-white/90 rounded-bl-sm border border-white/5'
                      }`}>
                      {isFile ? (
                        <div>
                          {isImage && msg.fileData ? (
                            <div className="relative group/image overflow-hidden rounded-lg">
                              <img
                                src={msg.fileData}
                                alt={msg.fileName}
                                className="max-w-full h-auto object-cover"
                                style={{ maxHeight: '200px' }}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => downloadFile(msg)}
                                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 text-white transition-all"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/20">
                              <span className="text-xl">{getFileIcon(msg.fileType)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-xs">{msg.fileName}</div>
                                <div className="text-[10px] opacity-60 font-mono">{formatFileSize(msg.fileSize)}</div>
                              </div>
                              <button
                                onClick={() => downloadFile(msg)}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1.5 text-[11px] text-white/40 font-medium border-t border-white/5">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Private message banner */}
          {privateMessageTarget && targetParticipant && (
            <div className="px-3 py-2 bg-blue-500/10 border-t border-blue-500/20 flex items-center justify-between">
              <span className="text-xs text-blue-400 font-medium">
                DM to {targetParticipant.displayName}
              </span>
              <button
                onClick={onCancelPrivateMessage}
                className="p-1 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            <div className="flex items-end gap-2">
              {/* File upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="*/*" />

              {/* Private message selector */}
              <div className="relative">
                <button
                  onClick={() => setShowPrivateSelector(!showPrivateSelector)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>

                {showPrivateSelector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPrivateSelector(false)} />
                    <div className="absolute bottom-full left-0 mb-2 w-52 max-h-56 overflow-y-auto bg-[#2d2d2d] border border-white/10 rounded-lg shadow-xl z-50 scrollbar-thin scrollbar-thumb-white/10">
                      <div className="p-1.5">
                        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider px-2 py-1">Send DM to</p>
                        {participants
                          .filter(p => p.userId !== currentUserId)
                          .map((p) => (
                            <button
                              key={p.userId}
                              onClick={() => {
                                onStartPrivateMessage(p.userId);
                                setShowPrivateSelector(false);
                              }}
                              className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-white/10 text-white/80 text-xs transition-colors"
                            >
                              <div className="w-5 h-5 rounded-full bg-teal-700 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                                {p.displayName.charAt(0)}
                              </div>
                              {p.displayName}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Text area */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={privateMessageTarget ? `DM to ${targetParticipant?.displayName ?? ''}...` : 'Send a message...'}
                className="flex-1 max-h-20 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 resize-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none py-2 px-3 text-sm scrollbar-hide font-medium leading-relaxed transition-all"
                rows={1}
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className={`p-2 rounded-lg transition-all shrink-0 ${message.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* QnA Tab */
        <QnA
          questions={questions}
          onAskQuestion={onAskQuestion}
          onUpvoteQuestion={onUpvoteQuestion}
          onMarkAnswered={onMarkAnswered}
          onDeleteQuestion={onDeleteQuestion}
          isHost={isHost}
        />
      )}
    </div>
  );
}
