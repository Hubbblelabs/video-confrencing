import { useEffect, useCallback, useRef, useState } from 'react';
import { VideoGrid } from '../components/VideoGrid';
import { Controls } from '../components/Controls';
import { StatusBanner } from '../components/StatusBanner';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { Whiteboard } from '../components/Whiteboard';
import { Chat } from '../components/Chat';
import { WaitingRoom } from '../components/WaitingRoom';
import { useRoomStore } from '../store/room.store';
import { useMediaStore } from '../store/media.store';
import { useAuthStore } from '../store/auth.store';
import { useParticipantsStore } from '../store/participants.store';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMedia } from '../hooks/useMedia';
import { useWhiteboard } from '../hooks/useWhiteboard';
import { useChat } from '../hooks/useChat';
import { useWaitingRoom } from '../hooks/useWaitingRoom';
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

  const [panelOpen, setPanelOpen] = useState<'none' | 'participants' | 'chat' | 'waiting'>('none');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [privateMessageTarget, setPrivateMessageTarget] = useState<string | null>(null);

  const isHost = role === 'host' || role === 'co_host';

  const handleStartPrivateMessage = (targetUserId: string) => {
    setPrivateMessageTarget(targetUserId);
    setPanelOpen('chat');
  };

  const webrtc = useWebRTC(signaling);
  const media = useMedia();

  // Whiteboard hook
  const whiteboardSocket = signaling.socketRef.current;
  const whiteboard = useWhiteboard({
    socket: whiteboardSocket,
    roomId: roomId || '',
    userId: userId || '',
  });

  // Chat hook
  const chatSocket = signaling.socketRef.current;
  const participantsData = useParticipantsStore((s) => s.participants);
  const participants = Object.entries(participantsData).map(([userId, participant]) => ({
    userId,
    displayName: participant.displayName,
  }));

  const chat = useChat({
    socket: chatSocket,
    roomId: roomId || '',
    userId: userId || '',
  });

  // Waiting Room hook
  const waitingRoomSocket = signaling.socketRef.current;
  const waitingRoom = useWaitingRoom({
    socket: waitingRoomSocket,
    roomId: roomId || '',
    isHost,
  });

  const joinedRef = useRef(false);
  const producingRef = useRef(false);

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

  const consumeProducer = useCallback(async (data: NewProducerEvent) => {
    if (!roomId || data.userId === userId) return;
    await webrtc.consumeProducer(roomId, data.producerId, data.userId);
  }, [roomId, userId, webrtc]);

  useEffect(() => {
    onNewProducerRef.current = consumeProducer;
    return () => { onNewProducerRef.current = null; };
  }, [consumeProducer, onNewProducerRef]);

  useEffect(() => {
    const cleanup = whiteboard.setupListeners();
    return cleanup;
  }, [whiteboard]);

  useEffect(() => {
    if (joinedRef.current || !roomId) return;
    joinedRef.current = true;

    const bootstrap = async () => {
      try {
        await media.startMedia();
        const stream = useMediaStore.getState().localStream;
        const rtpCaps = await signaling.getRouterCapabilities(roomId);
        await webrtc.loadDevice(rtpCaps);
        await webrtc.createSendTransport(roomId);
        if (stream) {
          await produceLocalTracks(stream);
        }
        await webrtc.createRecvTransport(roomId);
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

  const handleToggleMic = useCallback(async () => {
    media.toggleMic();
    const nowOn = !useMediaStore.getState().isMicOn;
    if (nowOn) await webrtc.resumeProducer('audio');
    else await webrtc.pauseProducer('audio');
  }, [media, webrtc]);

  const handleToggleCamera = useCallback(async () => {
    media.toggleCamera();
    const nowOn = !useMediaStore.getState().isCameraOn;
    if (nowOn) await webrtc.resumeProducer('video');
    else await webrtc.pauseProducer('video');
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
        screenTrack.addEventListener('ended', () => {
          media.stopScreenShare();
          webrtc.closeProducer('screen');
        });
      }
    }
  }, [roomId, isScreenSharing, media, webrtc]);

  const handleLeave = useCallback(async () => {
    if (roomId) {
      try { await signaling.leaveRoom(roomId); } catch { }
    }
    media.stopMedia();
    media.stopScreenShare();
    webrtc.cleanup();
    onLeave();
  }, [roomId, signaling, media, webrtc, onLeave]);

  const handleKick = useCallback(async (targetUserId: string) => {
    if (!roomId) return;
    try { await signaling.kickUser(roomId, targetUserId); } catch (err) { console.error('Kick failed:', err); }
  }, [roomId, signaling]);

  const togglePanel = (panel: 'participants' | 'chat' | 'waiting') => {
    setPanelOpen(prev => prev === panel ? 'none' : panel);
  };

  return (
    <div className="h-screen w-screen bg-background relative overflow-hidden flex flex-col">
      <StatusBanner />

      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-40 p-6 pointer-events-none">
        <div className="flex items-center justify-between">
          {/* Room Info */}
          <div className="glass-card px-5 py-3 rounded-full flex items-center gap-4 pointer-events-auto hover:bg-white/5 transition-colors shadow-lg shadow-black/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md border border-white/10 shrink-0">
              <span className="text-white font-bold text-sm">VC</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Room ID</span>
              <div className="flex items-center gap-2">
                <p className="text-foreground font-semibold text-sm font-mono tracking-wide tabular-nums">{useRoomStore.getState().roomCode || roomId}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(useRoomStore.getState().roomCode || roomId || '');
                    // Could add toast here
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-primary active:scale-95"
                  title="Copy Code"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 w-full relative z-0">
        <VideoGrid />
      </div>

      {/* Floating Panels */}
      <div className={`absolute top-20 right-4 bottom-24 w-96 transform transition-transform duration-300 ease-in-out z-30 ${panelOpen !== 'none' || showWhiteboard ? 'translate-x-0' : 'translate-x-[120%]'
        }`}>
        {showWhiteboard && (
          <div className="absolute inset-0 z-50 rounded-3xl overflow-hidden bg-background/95 backdrop-blur-xl border border-border shadow-2xl">
            <Whiteboard
              roomId={roomId!}
              userId={userId!}
              displayName={displayName!}
              onObjectAdded={whiteboard.sendObjectAdded}
              onObjectModified={whiteboard.sendObjectModified}
              onObjectRemoved={whiteboard.sendObjectRemoved}
              onCursorMove={whiteboard.sendCursorPosition}
              onClear={whiteboard.sendClear}
              onSave={(dataUrl) => {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `whiteboard-${Date.now()}.png`;
                a.click();
              }}
              remoteCursors={whiteboard.remoteCursors}
              remoteObjects={whiteboard.remoteObjects}
            />
            <button
              onClick={() => setShowWhiteboard(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {!showWhiteboard && (
          <>
            {panelOpen === 'chat' && (
              <Chat
                messages={chat.messages}
                typingUsers={chat.typingUsers}
                currentUserId={userId!}
                participants={participants}
                onSendMessage={chat.sendMessage}
                onSendPrivateMessage={chat.sendPrivateMessage}
                onSendFile={chat.sendFile}
                onTyping={chat.handleTyping}
                onExport={chat.exportMessages}
                onClear={chat.clearMessages}
                privateMessageTarget={privateMessageTarget}
                onCancelPrivateMessage={() => setPrivateMessageTarget(null)}
                onStartPrivateMessage={handleStartPrivateMessage}
              />
            )}
            {panelOpen === 'participants' && (
              <ParticipantsPanel
                localUserId={userId ?? ''}
                localDisplayName={displayName ?? 'You'}
                isHost={isHost}
                onKick={handleKick}
                onMuteAll={() => signaling.muteAll(roomId!)}
                onStartPrivateMessage={handleStartPrivateMessage}
              />
            )}
            {panelOpen === 'waiting' && isHost && (
              <div className="h-full bg-background/95 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
                <WaitingRoom
                  participants={waitingRoom.waitingParticipants}
                  onAdmit={waitingRoom.admitParticipant}
                  onReject={waitingRoom.rejectParticipant}
                  onAdmitAll={waitingRoom.admitAll}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Dock */}
      <Controls
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreen={handleToggleScreen}
        onLeave={handleLeave}
        isHost={isHost}
        onMuteAll={() => signaling.muteAll(roomId!)}
        showWhiteboard={showWhiteboard}
        onToggleWhiteboard={() => setShowWhiteboard(!showWhiteboard)}
        panelOpen={panelOpen}
        onTogglePanel={togglePanel}
        waitingRoomCount={waitingRoom.waitingParticipants.length}
      />
    </div>
  );
}
