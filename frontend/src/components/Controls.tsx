
import { type ReactNode, useState } from 'react';

interface ControlButtonProps {
  label: string;
  variant?: 'default' | 'danger' | 'primary' | 'secondary';
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  badge?: number;
  className?: string;
}

function ControlButton({ label, variant = 'default', disabled = false, onClick, icon, badge, className = '' }: ControlButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-500';
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-500';
      case 'secondary':
        return 'bg-white/10 text-white hover:bg-white/20';
      default:
        return 'bg-[#3c4043] text-white/90 hover:bg-[#4c5053]';
    }
  };

  return (
    <div
      className={`group relative flex flex-col items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 relative ${getButtonStyles()}`}
        onClick={onClick}
        disabled={disabled}
      >
        <div className="w-5 h-5">
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center shadow-sm">
            {badge}
          </span>
        )}
      </button>

      {/* Tooltip */}
      <span className={`absolute -top-10 px-2.5 py-1 bg-[#2d2d2d] text-white text-[11px] font-medium rounded-md whitespace-nowrap shadow-lg transition-all duration-150 z-50 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2d2d2d]"></div>
      </span>
    </div>
  );
}

// ─── SVG Icons ──────────────────────────────────────────────────

const MicOn = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOff = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const CameraOn = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const CameraOff = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h7a2 2 0 0 1 2 2v9.34m-4.22 4.22L23 7v10" />
  </svg>
);

const ScreenShareIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const LeaveIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 17l5-5m0 0l-5-5m5 5H9" />
    <path d="M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h2" />
  </svg>
);

const MuteAllIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    <path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
);

const WhiteboardIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const WaitingRoomIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ParticipantsIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ChatIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const HandRaiseIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const EmojiIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

// ─── Controls bar ───────────────────────────────────────────────

interface ControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onLeave: () => void;

  // New props
  isHost: boolean;
  onMuteAll: () => void;
  showWhiteboard: boolean;
  onToggleWhiteboard: () => void;
  panelOpen: 'none' | 'participants' | 'chat' | 'waiting';
  onTogglePanel: (panel: 'participants' | 'chat' | 'waiting') => void;
  waitingRoomCount: number;

  // Hand Raise / Reactions
  handRaised: boolean;
  onToggleHandRaise: () => void;
  onReaction: (emoji: string) => void;
}



export function Controls({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onLeave,
  isHost,
  onMuteAll,
  showWhiteboard,
  onToggleWhiteboard,
  panelOpen,
  onTogglePanel,
  waitingRoomCount,
  handRaised,
  onToggleHandRaise,
  onReaction,
}: ControlsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);

  const reactions = ['👍', '👏', '💖', '😂', '😮', '🎉'];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center h-20 bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-white/5">
      <div className="flex items-center gap-3">
        {/* Media Controls */}
        <div className="flex items-center gap-2">
          <ControlButton
            label={isMicOn ? 'Mute' : 'Unmute'}
            variant={isMicOn ? 'default' : 'danger'}
            onClick={onToggleMic}
            icon={isMicOn ? MicOn : MicOff}
          />
          <ControlButton
            label={isCameraOn ? 'Stop Video' : 'Start Video'}
            variant={isCameraOn ? 'default' : 'danger'}
            onClick={onToggleCamera}
            icon={isCameraOn ? CameraOn : CameraOff}
          />
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Share Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <ControlButton
              label={isScreenSharing ? 'Stop Share' : showWhiteboard ? 'Stop Board' : 'Present'}
              variant={isScreenSharing || showWhiteboard ? 'primary' : 'default'}
              onClick={() => setShowShareMenu(!showShareMenu)}
              icon={isScreenSharing ? ScreenShareIcon : showWhiteboard ? WhiteboardIcon : ScreenShareIcon}
            />

            {showShareMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowShareMenu(false)}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-1.5 bg-[#2d2d2d] border border-white/10 rounded-xl shadow-xl flex flex-col gap-0.5 min-w-[190px] z-50 animate-slide-up">
                  <button
                    onClick={() => {
                      onToggleScreen();
                      setShowShareMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left text-sm ${isScreenSharing
                      ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                      : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    <div className="w-5 h-5">{ScreenShareIcon}</div>
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                  </button>

                  <button
                    onClick={() => {
                      onToggleWhiteboard();
                      setShowShareMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left text-sm ${showWhiteboard
                      ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                      : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    <div className="w-5 h-5">{WhiteboardIcon}</div>
                    {showWhiteboard ? 'Stop Whiteboard' : 'Whiteboard'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Interaction Controls */}
        <div className="flex items-center gap-2">
          {isHost && (
            <ControlButton
              label="Mute All"
              variant="default"
              onClick={onMuteAll}
              icon={MuteAllIcon}
            />
          )}

          {isHost && (
            <ControlButton
              label="Waiting Room"
              variant={panelOpen === 'waiting' ? 'primary' : 'default'}
              onClick={() => onTogglePanel('waiting')}
              icon={WaitingRoomIcon}
              badge={waitingRoomCount}
            />
          )}

          <ControlButton
            label={handRaised ? 'Lower Hand' : 'Raise Hand'}
            variant={handRaised ? 'primary' : 'default'}
            onClick={onToggleHandRaise}
            icon={HandRaiseIcon}
          />

          <div className="relative">
            <ControlButton
              label="Reactions"
              variant={showReactionMenu ? 'primary' : 'default'}
              onClick={() => setShowReactionMenu(!showReactionMenu)}
              icon={EmojiIcon}
            />

            {showReactionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowReactionMenu(false)} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-1.5 bg-[#2d2d2d] border border-white/10 rounded-full shadow-xl flex gap-0.5 z-50 animate-slide-up">
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(emoji);
                        setShowReactionMenu(false);
                      }}
                      className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Panel Controls */}
        <div className="flex items-center gap-2">
          <ControlButton
            label="Participants"
            variant={panelOpen === 'participants' ? 'primary' : 'default'}
            onClick={() => onTogglePanel('participants')}
            icon={ParticipantsIcon}
          />

          <ControlButton
            label="Chat"
            variant={panelOpen === 'chat' ? 'primary' : 'default'}
            onClick={() => onTogglePanel('chat')}
            icon={ChatIcon}
          />
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Leave */}
        <ControlButton
          label="Leave"
          variant="danger"
          onClick={onLeave}
          icon={LeaveIcon}
        />
      </div>
    </div>
  );
}
