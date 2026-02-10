
import { type ReactNode, useState } from 'react';

interface ControlButtonProps {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  badge?: number;
}

function ControlButton({ label, active = true, danger = false, disabled = false, onClick, icon, badge }: ControlButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getButtonStyles = () => {
    if (danger) {
      return 'bg-destructive text-white shadow-lg shadow-destructive/30 hover:bg-destructive/90 hover:scale-110';
    }
    if (!active) {
      return 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-110 border-transparent relative after:absolute after:inset-0 after:rounded-full after:border-2 after:border-destructive/50 after:w-full after:h-full after:rotate-45 after:scale-x-100 after:transition-transform';
    }
    return 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-110 hover:shadow-primary/50';
  };

  return (
    <div
      className="group relative flex flex-col items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-white/10 relative ${getButtonStyles()}`}
        onClick={onClick}
        disabled={disabled}
      >
        <div className={`w-6 h-6 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center animate-bounce shadow-sm border border-background">
            {badge}
          </span>
        )}
      </button>

      {/* Tooltip */}
      <span className={`absolute -top-12 px-3 py-1.5 bg-black/90 text-white text-[10px] uppercase tracking-wider font-bold rounded-lg backdrop-blur-md whitespace-nowrap shadow-xl transition-all duration-200 border border-white/10 ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}>
        {label}
        {/* Triangle arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
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
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
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
}: ControlsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      {/* Dynamic Island Dock */}
      <div className="flex items-center gap-6 px-8 py-5 bg-background/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 border border-white/10 ring-1 ring-black/5 hover:scale-[1.02] transition-all duration-300 ease-out">
        <ControlButton
          label={isMicOn ? 'Mute' : 'Unmute'}
          active={isMicOn}
          onClick={onToggleMic}
          icon={isMicOn ? MicOn : MicOff}
        />
        <ControlButton
          label={isCameraOn ? 'Stop Video' : 'Start Video'}
          active={isCameraOn}
          onClick={onToggleCamera}
          icon={isCameraOn ? CameraOn : CameraOff}
        />
        <div className="relative group/share">
          <ControlButton
            label={isScreenSharing ? 'Stop Share' : showWhiteboard ? 'Stop Board' : 'Present'}
            active={isScreenSharing || showWhiteboard}
            onClick={() => setShowShareMenu(!showShareMenu)}
            icon={isScreenSharing ? ScreenShareIcon : showWhiteboard ? WhiteboardIcon : ScreenShareIcon}
          />

          {showShareMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowShareMenu(false)}
              />

              {/* Menu */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-2 bg-zinc-900 border border-white/20 rounded-2xl shadow-xl flex flex-col gap-1 min-w-[200px] z-50 animate-slide-up origin-bottom overflow-hidden ring-1 ring-black/50">
                <button
                  onClick={() => {
                    onToggleScreen();
                    setShowShareMenu(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-medium text-sm ${isScreenSharing
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-zinc-100 hover:bg-white/10'
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-medium text-sm ${showWhiteboard
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-zinc-100 hover:bg-white/10'
                    }`}
                >
                  <div className="w-5 h-5">{WhiteboardIcon}</div>
                  {showWhiteboard ? 'Stop Whiteboard' : 'Whiteboard'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent mx-2 opacity-50" />

        {isHost && (
          <ControlButton
            label="Mute All"
            active={true}
            onClick={onMuteAll}
            icon={MuteAllIcon}
          />
        )}

        {isHost && (
          <ControlButton
            label="Waiting Room"
            active={panelOpen === 'waiting'}
            onClick={() => onTogglePanel('waiting')}
            icon={WaitingRoomIcon}
            badge={waitingRoomCount}
          />
        )}

        <ControlButton
          label="Participants"
          active={panelOpen === 'participants'}
          onClick={() => onTogglePanel('participants')}
          icon={ParticipantsIcon}
        />

        <ControlButton
          label="Chat"
          active={panelOpen === 'chat'}
          onClick={() => onTogglePanel('chat')}
          icon={ChatIcon}
        />

        <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent mx-2 opacity-50" />

        <ControlButton
          label="Leave"
          danger
          onClick={onLeave}
          icon={LeaveIcon}
        />
      </div>
    </div>
  );
}
