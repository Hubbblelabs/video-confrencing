
import type { ReactNode } from 'react';

interface ControlButtonProps {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}

function ControlButton({ label, active = true, danger = false, disabled = false, onClick, icon }: ControlButtonProps) {
  const getButtonStyles = () => {
    if (danger) {
      return 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/30';
    }
    if (!active) {
      return 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border-transparent relative after:absolute after:inset-0 after:rounded-full after:border after:border-destructive/30 after:w-full after:h-full after:rotate-45 after:scale-x-0 after:transition-transform';
    }
    return 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-white hover:border-secondary/50 border-secondary/20 shadow-sm';
  };

  return (
    <div className="group relative flex flex-col items-center gap-2">
      <button
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 border backdrop-blur-md ${getButtonStyles()}`}
        onClick={onClick}
        disabled={disabled}
      >
        <div className="w-6 h-6 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </button>
      <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 px-2 py-1 bg-black/80 text-white text-[10px] uppercase tracking-wider font-bold rounded-md backdrop-blur-sm whitespace-nowrap">
        {label}
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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 px-6 py-4 bg-background/80 backdrop-blur-lg rounded-full shadow-2xl shadow-black/10 border border-border/50 hover:border-border transition-all duration-300">
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

        <div className="w-px h-8 bg-border mx-1" />

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
