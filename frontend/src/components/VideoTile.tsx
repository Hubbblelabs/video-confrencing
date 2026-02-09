import { useEffect, useRef, memo } from 'react';

interface VideoTileProps {
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  label: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
}

function VideoTileInner({
  videoTrack,
  audioTrack,
  label,
  isMuted,
  isVideoOff,
  isLocal = false,
  isActiveSpeaker = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attach video track
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (videoTrack && !isVideoOff) {
      const stream = new MediaStream([videoTrack]);
      el.srcObject = stream;
    } else {
      el.srcObject = null;
    }

    return () => {
      el.srcObject = null;
    };
  }, [videoTrack, isVideoOff]);

  // Attach audio track (never for local — prevents echo)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal) return;

    if (audioTrack && !isMuted) {
      const stream = new MediaStream([audioTrack]);
      el.srcObject = stream;
    } else {
      el.srcObject = null;
    }

    return () => {
      el.srcObject = null;
    };
  }, [audioTrack, isMuted, isLocal]);

  return (
    <div
      className={`relative bg-card rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300 ${
        isActiveSpeaker 
          ? 'ring-4 ring-[var(--primary)] shadow-2xl scale-[1.02]' 
          : 'ring-2 ring-border hover:ring-muted'
      }`}
      style={{ 
        borderRadius: 'calc(var(--radius) + 8px)',
        boxShadow: isActiveSpeaker ? 'var(--shadow-xl)' : 'var(--shadow-md)'
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${
          isVideoOff || !videoTrack ? 'hidden' : ''
        } ${isLocal ? '-scale-x-100' : ''}`}
      />

      {/* Audio element (remote only) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Avatar fallback when video is off */}
      {(isVideoOff || !videoTrack) && (
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-muted to-card">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-xl ring-4 ring-background">
              <span className="text-white text-3xl font-bold uppercase">
                {label.charAt(0)}
              </span>
            </div>
            {isActiveSpeaker && (
              <div className="absolute inset-0 rounded-full animate-ping bg-[var(--primary)]/30" />
            )}
          </div>
        </div>
      )}

      {/* Bottom bar with glass morphism effect */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        {/* Mic indicator with pulsing animation */}
        {isMuted ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--destructive)] shadow-lg">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
        ) : isActiveSpeaker ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] shadow-lg animate-pulse">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-card/50">
            <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-white text-sm font-semibold truncate block drop-shadow-lg">
            {isLocal ? `${label} (You)` : label}
          </span>
        </div>

        {/* Active speaker indicator badge */}
        {isActiveSpeaker && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--primary)] shadow-md">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-medium">Speaking</span>
          </div>
        )}
      </div>

      {/* Corner badge for local user */}
      {isLocal && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg">
          <span className="text-white text-xs font-bold">You</span>
        </div>
      )}
    </div>
  );
}

export const VideoTile = memo(VideoTileInner);
