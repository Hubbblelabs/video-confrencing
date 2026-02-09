import { useEffect, useCallback, useRef, useState } from 'react';
import { VideoGrid } from '../components/VideoGrid';
import { Controls } from '../components/Controls';
import { StatusBanner } from '../components/StatusBanner';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { useRoomStore } from '../store/room.store';
import { useMediaStore } from '../store/media.store';
import { useAuthStore } from '../store/auth.store';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMedia } from '../hooks/useMedia';
import type { useSignaling } from '../hooks/useSignaling';
import type { NewProducerEvent } from '../types';

type Signaling = ReturnType<typeof useSignaling>;

interface ExistingProducer {
  producerId: string;
  userId: string;
  kind: string;
}

interface RoomPageProps {
  signaling: Signaling;
  existingProducers: ExistingProducer[];
  onNewProducerRef: React.MutableRefObject<((data: NewProducerEvent) => Promise<void>) | null>;
  onLeave: () => void;
}

export function RoomPage({ signaling, existingProducers, onNewProducerRef, onLeave }: RoomPageProps) {
  const roomId = useRoomStore((s) => s.roomId);
  const role = useRoomStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);

  const isMicOn = useMediaStore((s) => s.isMicOn);
  const isCameraOn = useMediaStore((s) => s.isCameraOn);
  const isScreenSharing = useMediaStore((s) => s.isScreenSharing);

  const [showParticipants, setShowParticipants] = useState(false);

  const webrtc = useWebRTC(signaling);
  const media = useMedia();

  const joinedRef = useRef(false);
  const producingRef = useRef(false);

  // ─── Produce local tracks after transports are ready ─────────

  const produceLocalTracks = useCallback(async (stream: MediaStream) => {
    if (producingRef.current) return;
    producingRef.current = true;

    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        await webrtc.produceTrack(audioTrack, { label: 'audio' });
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        await webrtc.produceTrack(videoTrack, { label: 'video' });
      }
    } catch (err) {
      console.error('Failed to produce local tracks:', err);
    }
  }, [webrtc]);

  // ─── Consume a remote producer ───────────────────────────────

  const consumeProducer = useCallback(async (data: NewProducerEvent) => {
    if (!roomId || data.userId === userId) return;
    await webrtc.consumeProducer(roomId, data.producerId, data.userId);
  }, [roomId, userId, webrtc]);

  // Wire up the ref so App can forward newProducer events here
  useEffect(() => {
    onNewProducerRef.current = consumeProducer;
    return () => { onNewProducerRef.current = null; };
  }, [consumeProducer, onNewProducerRef]);

  // ─── Bootstrap: media → transports → produce → consume existing ──

  useEffect(() => {
    if (joinedRef.current || !roomId) return;
    joinedRef.current = true;

    const bootstrap = async () => {
      try {
        // 1. Get local media
        await media.startMedia();
        const stream = useMediaStore.getState().localStream;

        // 2. Get router RTP capabilities & load Device
        const rtpCaps = await signaling.getRouterCapabilities(roomId);
        await webrtc.loadDevice(rtpCaps);

        // 3. Create send transport and produce local tracks
        await webrtc.createSendTransport(roomId);
        if (stream) {
          await produceLocalTracks(stream);
        }

        // 4. Create recv transport
        await webrtc.createRecvTransport(roomId);

        // 5. Consume all existing remote producers passed from App
        for (const ep of existingProducers) {
          if (ep.userId !== userId) {
            await webrtc.consumeProducer(roomId, ep.producerId, ep.userId);
          }
        }
      } catch (err) {
        console.error('Room bootstrap failed:', err);
        useRoomStore.getState().setError(
          err instanceof Error ? err.message : 'Failed to join room',
        );
      }
    };

    bootstrap();
  }, [roomId, media, signaling, webrtc, produceLocalTracks, userId, existingProducers]);

  // ─── Controls handlers ────────────────────────────────────────

  const handleToggleMic = useCallback(async () => {
    media.toggleMic();
    const nowOn = !useMediaStore.getState().isMicOn;
    if (nowOn) {
      await webrtc.resumeProducer('audio');
    } else {
      await webrtc.pauseProducer('audio');
    }
  }, [media, webrtc]);

  const handleToggleCamera = useCallback(async () => {
    media.toggleCamera();
    const nowOn = !useMediaStore.getState().isCameraOn;
    if (nowOn) {
      await webrtc.resumeProducer('video');
    } else {
      await webrtc.pauseProducer('video');
    }
  }, [media, webrtc]);

  const handleToggleScreen = useCallback(async () => {
    if (!roomId) return;

    if (isScreenSharing) {
      media.stopScreenShare();
      await webrtc.closeProducer('screen');
    } else {
      await media.startScreenShare();
      const screenStream = useMediaStore.getState().screenStream;
      const screenTrack = screenStream?.getVideoTracks()[0];
      if (screenTrack) {
        await webrtc.produceTrack(screenTrack, { label: 'screen' });

        // Handle browser "Stop sharing" button
        screenTrack.addEventListener('ended', () => {
          media.stopScreenShare();
          webrtc.closeProducer('screen');
        });
      }
    }
  }, [roomId, isScreenSharing, media, webrtc]);

  const handleLeave = useCallback(async () => {
    if (roomId) {
      try {
        await signaling.leaveRoom(roomId);
      } catch {
        // Best-effort
      }
    }
    media.stopMedia();
    media.stopScreenShare();
    webrtc.cleanup();
    onLeave();
  }, [roomId, signaling, media, webrtc, onLeave]);

  const handleKick = useCallback(async (targetUserId: string) => {
    if (!roomId) return;
    try {
      await signaling.kickUser(roomId, targetUserId);
    } catch (err) {
      console.error('Kick failed:', err);
    }
  }, [roomId, signaling]);

  const isHost = role === 'host' || role === 'co_host';

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
      <StatusBanner />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 shrink-0">
        <span className="text-neutral-400 text-sm">
          Room: <span className="text-white font-mono">{roomId}</span>
        </span>
        <div className="flex items-center gap-3">
          {isHost && (
            <button
              onClick={() => signaling.muteAll(roomId!)}
              className="text-xs text-neutral-400 hover:text-white border border-neutral-700 px-2 py-1 rounded"
            >
              Mute All
            </button>
          )}
          <button
            onClick={() => setShowParticipants((p) => !p)}
            className="text-xs text-neutral-400 hover:text-white border border-neutral-700 px-2 py-1 rounded"
          >
            {showParticipants ? 'Hide' : 'Participants'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <VideoGrid />
        </div>
        {showParticipants && (
          <ParticipantsPanel
            localUserId={userId ?? ''}
            isHost={isHost}
            onKick={handleKick}
          />
        )}
      </div>

      {/* Controls */}
      <Controls
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreen={handleToggleScreen}
        onLeave={handleLeave}
      />
    </div>
  );
}
