import { useState, useEffect, useRef, memo } from 'react';

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
  const [isPiP, setIsPiP] = useState(false);

  // Determine if video should be showing
  const showVideo = !isVideoOff && !!videoTrack;

  // Attach video track
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (showVideo && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      el.srcObject = stream;
      el.play().catch(() => { });
    } else {
      // Exit PiP if active when video is turned off
      if (document.pictureInPictureElement === el) {
        document.exitPictureInPicture().catch(() => { });
      }
      el.srcObject = null;
      // Force clearing last frame by loading empty source
      el.load();
    }

    return () => {
      el.srcObject = null;
    };
  }, [videoTrack, showVideo]);

  // Attach audio track (never for local — prevents echo)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal) return;

    if (audioTrack) {
      const stream = new MediaStream([audioTrack]);
      el.srcObject = stream;

      // Ensure we only try to play when enough data is available
      const playAudio = async () => {
        try {
          if (el.readyState >= 2) { // HAVE_CURRENT_DATA
            await el.play();
          } else {
            el.oncanplay = async () => {
              await el.play();
              el.oncanplay = null;
            };
          }
        } catch (err) {
          console.error('Failed to play audio:', err);
        }
      };

      playAudio();
    } else {
      el.srcObject = null;
    }

    return () => {
      el.srcObject = null;
      el.oncanplay = null;
    };
  }, [audioTrack, isLocal]);

  // Handle PiP events and toggle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);

    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, []);

  const togglePiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.readyState >= 2 && video.srcObject) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Failed to toggle PiP:', err);
    }
  };

  return (
    <div
      className={`relative w-full h-full bg-card rounded-xl overflow-hidden flex items-center justify-center transition-all duration-200 group ${isActiveSpeaker
        ? 'ring-2 ring-primary ring-offset-1 ring-offset-background z-10 animate-glow-pulse'
        : 'ring-1 ring-white/10 hover:ring-white/20'
        }`}
    >
      {/* Video element — always in DOM, visibility controlled */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${isLocal ? '-scale-x-100' : ''}`}
      />

      {/* Audio element (remote only) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Avatar fallback when video is off */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isLocal
            ? 'bg-blue-600'
            : 'bg-teal-700'
            }`}>
            <span className="text-white text-3xl font-semibold uppercase select-none">
              {label.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Always-visible bottom name strip */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm max-w-[70%]">
          {/* Mic status icon */}
          {isMuted ? (
            <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            </svg>
          ) : isActiveSpeaker ? (
            <div className="flex space-x-[2px] items-end h-3.5 shrink-0">
              <div className="w-[3px] h-2 bg-blue-400 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite]" />
              <div className="w-[3px] h-3 bg-blue-400 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.1s]" />
              <div className="w-[3px] h-1.5 bg-blue-400 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.2s]" />
            </div>
          ) : (
            <svg className="w-3.5 h-3.5 text-white/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          )}

          <span className="text-white text-xs font-medium truncate">
            {isLocal ? `${label} (You)` : label}
          </span>
        </div>
      </div>

      {/* Top controls - visible on hover */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 pointer-events-none">
        {/* Hand raise indicator */}
        <div className="pointer-events-auto">
          {handRaised && (
            <div className="animate-bounce">
              <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex gap-1.5 pointer-events-auto">
          {showVideo && (
            <button
              onClick={togglePiP}
              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white/80 hover:text-white transition-all"
              title={isPiP ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            >
              {isPiP ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h4" />
                  <rect x="14" y="14" width="7" height="5" rx="1" stroke="currentColor" fill="none" />
                </svg>
              )}
            </button>
          )}

          {isLocal && (
            <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm flex items-center">
              <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">You</span>
            </div>
          )}
        </div>
      </div>

      {/* Reaction Overlay */}
      {reaction && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-float-up">
          <div className="text-7xl drop-shadow-xl">
            {reaction}
          </div>
        </div>
      )}
    </div>
  );
}

export const VideoTile = memo(VideoTileInner);
