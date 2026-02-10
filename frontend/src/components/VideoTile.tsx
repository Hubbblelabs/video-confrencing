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
      className={`relative w-full h-full bg-card rounded-3xl overflow-hidden flex items-center justify-center transition-all duration-300 group ${isActiveSpeaker
          ? 'ring-2 ring-primary shadow-2xl shadow-primary/20 scale-[1.01] z-10'
          : 'ring-1 ring-white/10 hover:ring-white/20'
        }`}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isVideoOff || !videoTrack ? 'hidden' : ''
          } ${isLocal ? '-scale-x-100' : ''}`}
      />

      {/* Audio element (remote only) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Avatar fallback when video is off */}
      {(isVideoOff || !videoTrack) && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm">
          <div className="relative">
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 ${isLocal
                ? 'bg-gradient-to-br from-primary to-accent'
                : 'bg-gradient-to-br from-secondary to-cyan-500'
              }`}>
              <span className="text-white text-3xl md:text-4xl font-bold uppercase font-heading">
                {label.charAt(0)}
              </span>
            </div>

            {/* Ambient glow behind avatar */}
            <div className={`absolute inset-0 blur-2xl opacity-50 ${isLocal ? 'bg-primary' : 'bg-secondary'
              }`} />

            {isActiveSpeaker && (
              <div className="absolute inset-0 -m-4 rounded-[2.5rem] animate-pulse border-2 border-primary/50" />
            )}
          </div>
        </div>
      )}

      {/* Gradient Overlay for Controls Visibility */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Bottom bar with glass morphism effect */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
          {isMuted ? (
            <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          ) : isActiveSpeaker ? (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-pulse">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          )}

          <span className="text-white text-xs font-semibold truncate max-w-[100px] drop-shadow-md">
            {isLocal ? `${label} (You)` : label}
          </span>
        </div>

        {/* Active speaker indicator badge */}
        {isActiveSpeaker && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-[10px] font-bold uppercase tracking-wider">Speaking</span>
          </div>
        )}
      </div>

      {/* Corner badge for local user */}
      {isLocal && (
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">You</span>
        </div>
      )}
    </div>
  );
}

export const VideoTile = memo(VideoTileInner);
