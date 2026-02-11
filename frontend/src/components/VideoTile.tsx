import { useEffect, useRef, memo } from 'react';

interface VideoTileProps {
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  label: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
  handRaised?: boolean;
  reaction?: string;
}

function VideoTileInner({
  videoTrack,
  audioTrack,
  label,
  isMuted,
  isVideoOff,
  isLocal = false,
  isActiveSpeaker = false,
  handRaised = false,
  reaction,
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
      className={`relative w-full h-full bg-black/40 backdrop-blur-sm rounded-3xl overflow-hidden flex items-center justify-center transition-all duration-300 group ring-1 ring-white/5 ${isActiveSpeaker
        ? 'ring-2 ring-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] scale-[1.01] z-10'
        : 'hover:ring-white/20 hover:scale-[1.005]'
        }`}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isVideoOff || !videoTrack ? 'hidden' : ''
          } ${isLocal ? '-scale-x-100' : ''}`}
      />

      {/* Audio element (remote only) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Avatar fallback when video is off */}
      {(isVideoOff || !videoTrack) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#121212]">
          <div className="relative">
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 ${isLocal
              ? 'bg-gradient-to-br from-primary to-secondary'
              : 'bg-gradient-to-br from-secondary/80 to-cyan-600/80'
              }`}>
              <span className="text-white text-4xl md:text-5xl font-bold uppercase font-heading drop-shadow-lg">
                {label.charAt(0)}
              </span>
            </div>

            {/* Ambient glow behind avatar */}
            <div className={`absolute inset-0 blur-[60px] opacity-40 ${isLocal ? 'bg-primary' : 'bg-secondary'
              }`} />

            {isActiveSpeaker && (
              <div className="absolute inset-0 -m-6 rounded-[3rem] animate-pulse border-2 border-primary/30" />
            )}
          </div>
        </div>
      )}

      {/* Gradient Overlay for Controls Visibility */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Bottom bar with glass morphism effect */}
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-lg">
          {isMuted ? (
            <div className="w-5 h-5 rounded-md bg-destructive flex items-center justify-center shadow-sm">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              </svg>
            </div>
          ) : isActiveSpeaker ? (
            <div className="flex space-x-0.5 items-center justify-center h-4 w-4">
              <div className="w-1 h-3 bg-primary rounded-full animate-[music-bar_0.5s_ease-in-out_infinite]" />
              <div className="w-1 h-4 bg-primary rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.1s]" />
              <div className="w-1 h-2 bg-primary rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.2s]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </div>
          )}

          <span className="text-white text-xs font-bold tracking-wide truncate max-w-[120px] drop-shadow-md">
            {isLocal ? `${label} (You)` : label}
          </span>
        </div>

        {/* Active speaker indicator badge */}
        {isActiveSpeaker && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/90 backdrop-blur-md shadow-lg shadow-primary/20">
            <span className="text-white text-[10px] font-bold uppercase tracking-wider">Speaking</span>
          </div>
        )}
      </div>

      {/* Hand Raise Indicator */}
      {handRaised && (
        <div className="absolute top-4 left-4 z-40 animate-bounce">
          <div className="bg-primary text-white p-2 rounded-full shadow-lg border border-white/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m4-6v6m-8-6V5a2 2 0 114 0v4m-4 0h4m-4 0V5a2 2 0 114 0v4m-4 0v6m0 0H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-4" />
            </svg>
          </div>
        </div>
      )}

      {/* Reaction Overlay */}
      {reaction && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-float-up">
          <div className="text-8xl drop-shadow-2xl filter saturate-150 transform scale-150 transition-transform duration-300">
            {reaction}
          </div>
        </div>
      )}

      {/* Corner badge for local user */}
      {isLocal && (
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-lg">
          <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">You</span>
        </div>
      )}
    </div>
  );
}

export const VideoTile = memo(VideoTileInner);
