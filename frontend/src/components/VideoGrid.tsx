import { useMemo, useState, useEffect } from 'react';
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

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 16;

  const remoteList = useMemo(
    () => {
      const sorted = Array.from(participants.values()).sort((a, b) => {
        // Priority 1: Active Speaker
        if (a.userId === activeSpeakerId) return -1;
        if (b.userId === activeSpeakerId) return 1;
        // Priority 2: Hand Raised
        if (a.handRaised && !b.handRaised) return -1;
        if (!a.handRaised && b.handRaised) return 1;
        // Priority 3: Camera On
        if (!a.isVideoOff && b.isVideoOff) return -1;
        if (a.isVideoOff && !b.isVideoOff) return 1;
        return 0;
      });
      return sorted;
    },
    [participants, activeSpeakerId],
  );

  const totalRemoteCount = remoteList.length;
  const totalPages = Math.ceil((totalRemoteCount + 1) / PAGE_SIZE); // +1 for local user

  // Reset page if out of bounds (e.g. participants left)
  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(totalPages - 1);
    }
  }, [totalRemoteCount, totalPages, page]);


  // Determine visible participants for current page
  // Page 0 always includes local participant at the start
  const visibleParticipants = useMemo(() => {
    let items: Array<RemoteParticipant | 'local'> = [];

    if (page === 0) {
      // Page 0: Local + first 15 remotes
      items = ['local', ...remoteList.slice(0, PAGE_SIZE - 1)];
    } else {
      // Page > 0: Remotes only (shifted by -1 because local took a spot on page 0)
      // The index in remoteList corresponds to (page * PAGE_SIZE) - 1
      const remoteStart = (page * PAGE_SIZE) - 1;
      const remoteEnd = remoteStart + PAGE_SIZE;
      items = remoteList.slice(remoteStart, remoteEnd);
    }
    return items;
  }, [page, remoteList, PAGE_SIZE]);


  const gridClass = useMemo(() => getGridClass(visibleParticipants.length), [visibleParticipants.length]);

  const localVideoTrack = localStream?.getVideoTracks()[0] ?? null;
  const localAudioTrack = localStream?.getAudioTracks()[0] ?? null;

  return (
    <div className={`relative w-full h-full p-6 pt-20 pb-28 flex flex-col items-center justify-center`}>
      <div className={`w-full h-full ${gridClass} gap-6 overflow-y-auto scrollbar-hide`}>
        {visibleParticipants.map((item) => {
          if (item === 'local') {
            return (
              <VideoTile
                key="local"
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
            );
          } else {
            return (
              <VideoTile
                key={item.userId}
                videoTrack={item.videoTrack}
                audioTrack={item.audioTrack}
                label={item.displayName}
                isMuted={item.isMuted}
                isVideoOff={item.isVideoOff}
                isActiveSpeaker={activeSpeakerId === item.userId}
                handRaised={item.handRaised}
                reaction={item.reaction}
              />
            );
          }
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-4 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 z-50">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="flex items-center text-white text-sm font-medium px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
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
