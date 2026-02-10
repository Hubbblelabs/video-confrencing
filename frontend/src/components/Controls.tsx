
import { type ReactNode, useState } from 'react';

interface ControlButtonProps {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}

function ControlButton({ label, active = true, danger = false, disabled = false, onClick, icon }: ControlButtonProps) {
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
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-white/10 ${getButtonStyles()}`}
        onClick={onClick}
        disabled={disabled}
      >
        <div className={`w-6 h-6 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
          {icon}
        </div>
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

// ─── Controls bar ───────────────────────────────────────────────

interface ControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onLeave: () => void;
}

export function Controls({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onLeave,
}: ControlsProps) {
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
        <ControlButton
          label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
          active={isScreenSharing}
          onClick={onToggleScreen}
          icon={ScreenShareIcon}
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
