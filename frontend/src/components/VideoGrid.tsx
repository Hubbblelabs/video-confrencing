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
  const localHandRaised = useParticipantsStore((s) => s.localHandRaised);
  const localReaction = useParticipantsStore((s) => s.localReaction);
  const localUserId = useAuthStore((s) => s.userId);
  const localDisplayName = useAuthStore((s) => s.displayName);

  const remoteList = useMemo(
    () => Array.from(participants.values()),
    [participants],
  );

  const totalCount = 1 + remoteList.length; // local + remotes

  const gridClass = useMemo(() => getGridClass(totalCount), [totalCount]);

  const localVideoTrack = localStream?.getVideoTracks()[0] ?? null;
  const localAudioTrack = localStream?.getAudioTracks()[0] ?? null;

  return (
    <div className={`w-full h-full p-6 pt-20 pb-28 ${gridClass} gap-6 overflow-y-auto scrollbar-hide`}>
      {/* Local tile */}
      <VideoTile
        videoTrack={localVideoTrack}
        audioTrack={localAudioTrack}
        label={localDisplayName ?? 'You'}
        isMuted={!isMicOn}
        isVideoOff={!isCameraOn}
        isLocal
        isActiveSpeaker={activeSpeakerId === localUserId}
        handRaised={localHandRaised}
        reaction={localReaction ?? undefined}
      />

      {/* Remote tiles */}
      {remoteList.map((p: RemoteParticipant) => (
        <VideoTile
          key={p.userId}
          videoTrack={p.videoTrack}
          audioTrack={p.audioTrack}
          label={p.displayName}
          isMuted={p.isMuted}
          isVideoOff={p.isVideoOff}
          isActiveSpeaker={activeSpeakerId === p.userId}
          handRaised={p.handRaised}
          reaction={p.reaction}
        />
      ))}
    </div>
  );
}

/** Returns Tailwind grid classes based on participant count */
function getGridClass(count: number): string {
  if (count <= 1) return 'flex justify-center items-center'; // Center single tile
  if (count === 2) return 'grid grid-cols-2 grid-rows-1';
  if (count <= 4) return 'grid grid-cols-2 grid-rows-2';
  if (count <= 6) return 'grid grid-cols-3 grid-rows-2';
  if (count <= 9) return 'grid grid-cols-3 grid-rows-3';
  if (count <= 12) return 'grid grid-cols-4 grid-rows-3';
  if (count <= 16) return 'grid grid-cols-4 grid-rows-4';
  return 'grid grid-cols-5 grid-rows-auto'; // Flexible for large calls
}
