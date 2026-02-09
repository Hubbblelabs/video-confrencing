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
      className={`relative bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center ${
        isActiveSpeaker ? 'ring-2 ring-white' : 'ring-1 ring-neutral-700'
      }`}
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
        <div className="flex items-center justify-center w-full h-full">
          <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center">
            <span className="text-white text-2xl font-semibold uppercase">
              {label.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-3 py-1.5 flex items-center gap-2">
        {/* Mic indicator */}
        {isMuted && (
          <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}

        <span className="text-white text-xs truncate">
          {isLocal ? `${label} (You)` : label}
        </span>
      </div>
    </div>
  );
}

export const VideoTile = memo(VideoTileInner);
