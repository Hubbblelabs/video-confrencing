"use client";
import { useEffect, useCallback, useRef, useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { VideoGrid } from '../components/VideoGrid';
import { Controls } from '../components/Controls';
import { StatusBanner } from '../components/StatusBanner';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
// import { Whiteboard } from '../components/Whiteboard';
import { Chat } from '../components/Chat';
import { WaitingRoom } from '../components/WaitingRoom';
import { useRoomStore } from '../store/room.store';
import { useMediaStore } from '../store/media.store';
import { useAuthStore } from '../store/auth.store';
import { useParticipantsStore } from '../store/participants.store';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMedia } from '../hooks/useMedia';
import { useWhiteboard } from '../hooks/useWhiteboard';
import { useQnA } from '../hooks/useQnA';
import { useChat } from '../hooks/useChat';
// ... imports

import { useWaitingRoom } from '../hooks/useWaitingRoom';
import type { useSignaling } from '../hooks/useSignaling';
import type { NewProducerEvent } from '../types';

// Lazy load Whiteboard
const Whiteboard = lazy(() => import('../components/Whiteboard').then(module => ({ default: module.Whiteboard })));

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
  const connectionState = useRoomStore((s) => s.connectionState);
  const userId = useAuthStore((s) => s.userId);
  const userRole = useAuthStore((s) => s.role);
  const displayName = useAuthStore((s) => s.displayName);

  const isMicOn = useMediaStore((s) => s.isMicOn);
  const isCameraOn = useMediaStore((s) => s.isCameraOn);
  const isScreenSharing = useMediaStore((s) => s.isScreenSharing);
  const localHandRaised = useParticipantsStore((s) => s.localHandRaised);

  const [panelOpen, setPanelOpen] = useState<'none' | 'participants' | 'chat' | 'waiting'>('none');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [privateMessageTarget, setPrivateMessageTarget] = useState<string | null>(null);
  const [meetingTime, setMeetingTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const router = useRouter();

  const allowScreenShare = useRoomStore((s) => s.allowScreenShare);
  const allowWhiteboard = useRoomStore((s) => s.allowWhiteboard);

  const isHost = role === 'host' || role === 'co_host';

  // Meeting timer
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatMeetingTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

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
    displayName: displayName || 'User',
    onStateChange: (active) => setShowWhiteboard(active),
  });

  // Chat hook
  const chatSocket = signaling.socketRef.current;
  const participantsData = useParticipantsStore((s) => s.participants);
  const participants = Array.from(participantsData.entries()).map(([pUserId, participant]) => ({
    userId: pUserId,
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

  const qna = useQnA({
    socket: signaling.socketRef.current,
    roomId: roomId || '',
  });

  const joinedRef = useRef(false);
  const producingRef = useRef(false);

  const produceLocalTracks = useCallback(async (stream: MediaStream) => {
    if (producingRef.current) return;
    producingRef.current = true;

    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && audioTrack.readyState === 'live' && useMediaStore.getState().isMicOn) {
        await webrtc.produceTrack(audioTrack, { label: 'audio' });
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'live' && useMediaStore.getState().isCameraOn) {
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
    // Wait for connection to be established before bootstrapping
    if (joinedRef.current || !roomId || connectionState !== 'connected') return;
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
  }, [roomId, media, signaling, webrtc, produceLocalTracks, userId, existingProducers, connectionState]);

  const handleToggleMic = useCallback(() => {
    const nowOn = media.toggleMic();
    console.log('CLIENT EMIT media-state-change (mic)', { nowOn });
    if (nowOn) {
      const stream = useMediaStore.getState().localStream;
      const newTrack = stream?.getAudioTracks()[0];
      if (newTrack) {
        if (!webrtc.hasProducer('audio')) {
          webrtc.produceTrack(newTrack, { label: 'audio' }).catch(console.error);
        } else {
          webrtc.resumeProducer('audio').catch(console.error);
        }
      }
    } else {
      webrtc.pauseProducer('audio').catch(console.error);
    }

    // Always emit dedicated media state event for reliable UI sync
    if (roomId) {
      const videoOn = useMediaStore.getState().isCameraOn;
      signaling.emitMediaState(roomId, nowOn, videoOn).catch(console.error);
    }
  }, [media, webrtc, roomId, signaling]);

  const handleToggleCamera = useCallback(async () => {
    const nowOn = await media.toggleCamera();
    console.log('CLIENT EMIT media-state-change (camera)', { nowOn });
    if (nowOn) {
      const stream = useMediaStore.getState().localStream;
      const newTrack = stream?.getVideoTracks()[0];

      if (newTrack) {
        // If we don't have a producer yet (user joined with video OFF), create one
        if (!webrtc.hasProducer('video')) {
          await webrtc.produceTrack(newTrack, { label: 'video' });
        } else {
          // Camera turned ON — replace dead track and resume in parallel
          webrtc.replaceProducerTrack('video', newTrack)
            .then(() => webrtc.resumeProducer('video'))
            .catch(console.error);
        }
      }
    } else {
      webrtc.pauseProducer('video').catch(console.error);
    }

    // Always emit dedicated media state event for reliable UI sync
    if (roomId) {
      const audioOn = useMediaStore.getState().isMicOn;
      signaling.emitMediaState(roomId, audioOn, nowOn).catch(console.error);
    }
  }, [media, webrtc, roomId, signaling]);

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

  const confirmLeave = useCallback(async () => {
    if (roomId) {
      try {
        await signaling.leaveRoom(roomId);
      } catch {
        // Ignore error during cleanup
      }
    }
    media.stopMedia();
    media.stopScreenShare();
    webrtc.cleanup();
    onLeave();

    const roleDashboard = userRole === 'ADMIN' ? '/admin' : userRole === 'TEACHER' ? '/teacher' : '/dashboard';
    router.push(roleDashboard);
  }, [roomId, signaling, media, webrtc, onLeave, userRole, router]);

  const handleLeave = useCallback(() => {
    if (isHost) {
      setShowSummary(true);
    } else {
      confirmLeave();
    }
  }, [isHost, confirmLeave]);

  const handleKick = useCallback(async (targetUserId: string) => {
    if (!roomId) return;
    try { await signaling.kickUser(roomId, targetUserId); } catch (err) { console.error('Kick failed:', err); }
  }, [roomId, signaling]);

  const togglePanel = (panel: 'participants' | 'chat' | 'waiting') => {
    setPanelOpen(prev => prev === panel ? 'none' : panel);
  };

  const handleToggleHandRaise = useCallback(async () => {
    if (!roomId) return;
    try {
      const { handRaised } = await signaling.sendHandRaise(roomId);
      useParticipantsStore.getState().setLocalHandRaised(handRaised);
    } catch (err) {
      console.error('Failed to toggle hand raise:', err);
    }
  }, [roomId, signaling]);

  const handleReaction = useCallback(async (reaction: string) => {
    if (!roomId) return;
    try {
      await signaling.sendReaction(roomId, reaction);
      useParticipantsStore.getState().setLocalReaction(reaction);
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  }, [roomId, signaling]);

  return (
    <div className="h-screen w-screen bg-background relative overflow-hidden flex flex-col">
      <StatusBanner />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 h-12 flex items-center justify-between px-4 bg-background/50 backdrop-blur-md border-b border-white/10">
        {/* Left: Room info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white/90">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-white/70 font-mono tracking-wide">
              {useRoomStore.getState().roomCode || roomId}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(useRoomStore.getState().roomCode || roomId || '');
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white/80"
              title="Copy Code"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center: Meeting Timer */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white/60 text-xs font-mono tabular-nums tracking-wider">
            {formatMeetingTime(meetingTime)}
          </span>
        </div>

        {/* Right: Display name */}
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <span>{displayName}</span>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 w-full relative z-0">
        <VideoGrid />
      </div>

      {/* Side Panels */}
      <div className={`fixed transform transition-all duration-300 ease-in-out z-30 
        ${showWhiteboard
          ? 'inset-0 z-40'
          : 'top-12 right-0 bottom-24 w-96'
        } 
        ${(panelOpen !== 'none' || showWhiteboard) ? 'translate-x-0' : 'translate-x-[110%]'}`
      }>
        {showWhiteboard && (
          <div className={`absolute inset-0 z-50 overflow-hidden bg-card border-l border-border ${showWhiteboard ? '' : 'rounded-xl'}`}>
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-card">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                  <p className="text-white/60 text-xs font-medium">Loading Whiteboard...</p>
                </div>
              </div>
            }>
              <Whiteboard
                onElementsChange={whiteboard.sendElements}
                onCursorMove={whiteboard.sendCursorPosition}
                onClear={whiteboard.sendClear}
                onSave={(dataUrl) => {
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = `whiteboard-${Date.now()}.png`;
                  a.click();
                }}
                onCursorUpdate={whiteboard.onCursorUpdate}
                remoteElements={whiteboard.remoteElements}
                localUserId={userId ?? 'me'}
                localDisplayName={displayName ?? 'You'}
              />
            </Suspense>
            <button
              onClick={() => setShowWhiteboard(false)}
              className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {!showWhiteboard && (
          <>
            {panelOpen === 'chat' && (
              <Chat
                messages={chat.messages}
                typingUsers={chat.typingUsers.map(u => u.displayName)}
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

                // QnA
                questions={qna.questions}
                onAskQuestion={qna.askQuestion}
                onUpvoteQuestion={qna.upvoteQuestion}
                onMarkAnswered={qna.markAnswered}
                onDeleteQuestion={qna.deleteQuestion}
                isHost={isHost}
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
              <div className="h-full bg-white/5 backdrop-blur-xl border-l border-white/10 overflow-hidden">
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

      {/* Control Bar */}
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
        onToggleWhiteboard={() => {
          const newState = !showWhiteboard;
          setShowWhiteboard(newState);
          whiteboard.sendState(newState);
        }}
        panelOpen={panelOpen}
        onTogglePanel={togglePanel}
        waitingRoomCount={waitingRoom.waitingParticipants.length}
        handRaised={localHandRaised}
        onToggleHandRaise={handleToggleHandRaise}
        onReaction={handleReaction}
        allowScreenShare={allowScreenShare}
        allowWhiteboard={allowWhiteboard}
        onUpdateRoomSettings={(settings) => signaling.updateRoomSettings(roomId!, settings)}
      />

      {showSummary && isHost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Meeting Summary</h2>
            <p className="text-muted-foreground mb-8">Thank you for hosting this session.</p>

            <div className="w-full bg-muted/50 rounded-2xl p-4 mb-8 space-y-4 text-left">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Duration</span>
                <span className="text-lg font-bold">{formatMeetingTime(meetingTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Participants</span>
                <span className="text-lg font-bold">{participantsData.size + 1}</span>
              </div>
            </div>

            <button
              onClick={confirmLeave}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors"
            >
              End Session & Return
            </button>
            <button
              onClick={() => setShowSummary(false)}
              className="mt-4 px-4 py-2 text-sm text-muted-foreground border-transparent border hover:border-border rounded-lg bg-transparent hover:bg-muted/50 transition-colors"
            >
              Return to Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
