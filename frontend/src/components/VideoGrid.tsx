import { useMemo } from 'react';
import { VideoTile } from './VideoTile';
import { useMediaStore } from '../store/media.store';
import { useParticipantsStore } from '../store/participants.store';
import { useAuthStore } from '../store/auth.store';
import type { RemoteParticipant } from '../types';

/**
 * Dynamic grid of video tiles that adapts layout based on participant count.
 * Supports 1–30 participants.
 */
export function VideoGrid() {
  const localStream = useMediaStore((s) => s.localStream);
  const isMicOn = useMediaStore((s) => s.isMicOn);
  const isCameraOn = useMediaStore((s) => s.isCameraOn);
  const participants = useParticipantsStore((s) => s.participants);
  const activeSpeakerId = useParticipantsStore((s) => s.activeSpeakerId);
  const localUserId = useAuthStore((s) => s.userId);

  const remoteList = useMemo(
    () => Array.from(participants.values()),
    [participants],
  );

  const totalCount = 1 + remoteList.length; // local + remotes

  const gridClass = useMemo(() => getGridClass(totalCount), [totalCount]);

  const localVideoTrack = localStream?.getVideoTracks()[0] ?? null;
  const localAudioTrack = localStream?.getAudioTracks()[0] ?? null;

  return (
    <div className={`w-full h-full p-2 gap-2 ${gridClass}`}>
      {/* Local tile */}
      <VideoTile
        videoTrack={localVideoTrack}
        audioTrack={localAudioTrack}
        label={localUserId ?? 'You'}
        isMuted={!isMicOn}
        isVideoOff={!isCameraOn}
        isLocal
        isActiveSpeaker={activeSpeakerId === localUserId}
      />

      {/* Remote tiles */}
      {remoteList.map((p: RemoteParticipant) => (
        <VideoTile
          key={p.userId}
          videoTrack={p.videoTrack}
          audioTrack={p.audioTrack}
          label={p.userId}
          isMuted={p.isMuted}
          isVideoOff={p.isVideoOff}
          isActiveSpeaker={activeSpeakerId === p.userId}
        />
      ))}
    </div>
  );
}

/** Returns Tailwind grid classes based on participant count */
function getGridClass(count: number): string {
  if (count <= 1) return 'grid grid-cols-1 grid-rows-1';
  if (count <= 2) return 'grid grid-cols-2 grid-rows-1';
  if (count <= 4) return 'grid grid-cols-2 grid-rows-2';
  if (count <= 6) return 'grid grid-cols-3 grid-rows-2';
  if (count <= 9) return 'grid grid-cols-3 grid-rows-3';
  if (count <= 16) return 'grid grid-cols-4 grid-rows-4';
  return 'grid grid-cols-5 grid-rows-6'; // up to 30
}
