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
  const displayName = useAuthStore((s) => s.displayName);

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
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      <StatusBanner />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-card-foreground text-sm font-semibold">Room:</span>
              <span className="text-[var(--primary)] text-sm font-mono font-medium px-2 py-0.5 bg-[var(--primary)]/10 rounded" style={{ borderRadius: 'calc(var(--radius) - 4px)' }}>
                {roomId}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => signaling.muteAll(roomId!)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-card-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all duration-200"
              style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-xs)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              Mute All
            </button>
          )}
          <button
            onClick={() => setShowParticipants((p) => !p)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showParticipants 
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md' 
                : 'text-card-foreground bg-muted hover:bg-muted/80'
            }`}
            style={{ borderRadius: 'var(--radius)', boxShadow: showParticipants ? 'var(--shadow-md)' : 'var(--shadow-xs)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
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
            localDisplayName={displayName ?? 'You'}
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
