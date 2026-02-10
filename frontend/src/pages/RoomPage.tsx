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
      <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="flex items-center justify-between">
          {/* Room Info */}
          <div className="glass px-4 py-2 rounded-2xl flex items-center gap-3 pointer-events-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-xs">VC</span>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Current Room</p>
              <div className="flex items-center gap-2">
                <p className="text-foreground font-medium text-sm font-mono tracking-wide">{useRoomStore.getState().roomCode || roomId}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(useRoomStore.getState().roomCode || roomId || '')}
                  className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy Code"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Top Controls */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {isHost && (
              <button
                onClick={() => signaling.muteAll(roomId!)}
                className="glass-button p-2.5 rounded-xl text-primary-foreground hover:scale-105 transition-all"
                title="Mute All"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={`p-2.5 rounded-xl transition-all font-medium flex items-center gap-2 ${showWhiteboard ? 'glass-button text-primary-foreground ring-2 ring-primary/50' : 'glass text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm hidden md:block">Whiteboard</span>
            </button>

            <button
              onClick={() => togglePanel('waiting')}
              className={`p-2.5 rounded-xl transition-all relative ${panelOpen === 'waiting' ? 'glass-button text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground hover:bg-muted'} ${!isHost && 'hidden'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {waitingRoom.waitingParticipants.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold flex items-center justify-center animate-pulse">
                  {waitingRoom.waitingParticipants.length}
                </span>
              )}
            </button>

            <button
              onClick={() => togglePanel('participants')}
              className={`p-2.5 rounded-xl transition-all ${panelOpen === 'participants' ? 'glass-button text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            <button
              onClick={() => togglePanel('chat')}
              className={`p-2.5 rounded-xl transition-all ${panelOpen === 'chat' ? 'glass-button text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
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
          <div className="absolute inset-0 z-50 rounded-3xl overflow-hidden glass-card shadow-2xl">
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
              <div className="h-full glass-card rounded-2xl overflow-hidden">
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
      />
    </div>
  );
}
