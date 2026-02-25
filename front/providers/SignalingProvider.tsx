"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSignaling } from '../hooks/useSignaling';
import { useRoomStore } from '../store/room.store';
import { useAuthStore } from '../store/auth.store';
import { useParticipantsStore } from '../store/participants.store';
import { useMediaStore } from '../store/media.store';
import type { NewProducerEvent, UserJoinedEvent, UserLeftEvent, UserKickedEvent, AllMutedEvent, RoleChangedEvent, ProducerClosedEvent, ProducerPausedEvent, ProducerResumedEvent, HandRaisedEvent, ReactionEvent } from '../types';

type CustomNewProducerHandler = ((data: NewProducerEvent) => Promise<void>) | null;

interface SignalingContextValue {
    signaling: ReturnType<typeof useSignaling>;
    existingProducers: Array<{ producerId: string; userId: string; kind: string }>;
    setExistingProducers: React.Dispatch<React.SetStateAction<Array<{ producerId: string; userId: string; kind: string }>>>;
    newProducerHandlerRef: React.MutableRefObject<CustomNewProducerHandler>;
    isInWaitingRoom: boolean;
    setIsInWaitingRoom: React.Dispatch<React.SetStateAction<boolean>>;
    waitingRoomId: string | null;
    setWaitingRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    wasRejected: boolean;
    setWasRejected: React.Dispatch<React.SetStateAction<boolean>>;
    rejectionMessage: string;
    setRejectionMessage: React.Dispatch<React.SetStateAction<string>>;
    handleLeaveRoom: () => void;
    handleJoinRoom: (id: string) => Promise<void>;
    handleCreateRoom: (title: string) => Promise<void>;
}

const SignalingContext = createContext<SignalingContextValue | null>(null);

export function useSignalingContext() {
    const ctx = useContext(SignalingContext);
    if (!ctx) {
        throw new Error('useSignalingContext must be used within a SignalingProvider');
    }
    return ctx;
}

export function SignalingProvider({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((s) => s.token);
    const userId = useAuthStore((s) => s.userId);
    const roomId = useRoomStore((s) => s.roomId);

    const [existingProducers, setExistingProducers] = useState<
        Array<{ producerId: string; userId: string; kind: string }>
    >([]);

    // Waiting room state
    const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
    const [waitingRoomId, setWaitingRoomId] = useState<string | null>(null);
    const [wasRejected, setWasRejected] = useState(false);
    const [rejectionMessage, setRejectionMessage] = useState('');

    const newProducerHandlerRef = useRef<CustomNewProducerHandler>(null);
    // Guard against concurrent room:join calls (prevents the retry storm)
    const joiningRef = useRef(false);

    const signaling = useSignaling({
        onUserJoined: (data: UserJoinedEvent) => {
            useParticipantsStore.getState().addParticipant(data.userId, data.displayName, data.role);
        },
        onUserLeft: (data: UserLeftEvent) => {
            useParticipantsStore.getState().removeParticipant(data.userId);
        },
        onRoomClosed: () => {
            handleLeaveRoom();
        },
        onUserKicked: (data: UserKickedEvent) => {
            useRoomStore.getState().setKicked(data.reason);
            handleLeaveRoom();
        },
        onAllMuted: () => {
            // Mute local mic
            const stream = useMediaStore.getState().localStream;
            if (stream) {
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) audioTrack.enabled = false;
            }
            useMediaStore.getState().setMicOn(false);
        },
        onRoleChanged: (data: RoleChangedEvent) => {
            if (data.userId === userId) {
                useRoomStore.getState().setRole(data.newRole);
            } else {
                useParticipantsStore.getState().setParticipantRole(data.userId, data.newRole);
            }
        },
        onNewProducer: (data: NewProducerEvent) => {
            // Forward to RoomPage's consume handler
            newProducerHandlerRef.current?.(data);
        },
        onProducerClosed: (data: ProducerClosedEvent) => {
            useParticipantsStore.getState().removeConsumer(data.userId, data.producerId);
        },
        onProducerPaused: (data: ProducerPausedEvent) => {
            console.log('App: onProducerPaused', data);
            const store = useParticipantsStore.getState();
            if (data.kind === 'audio') {
                store.setParticipantMuted(data.userId, true);
            } else if (data.kind === 'video') {
                store.setParticipantVideoOff(data.userId, true);
            }
        },
        onProducerResumed: (data: ProducerResumedEvent) => {
            console.log('App: onProducerResumed', data);
            const store = useParticipantsStore.getState();
            if (data.kind === 'audio') {
                store.setParticipantMuted(data.userId, false);
            } else if (data.kind === 'video') {
                store.setParticipantVideoOff(data.userId, false);
            }
        },
        onHandRaised: (data: HandRaisedEvent) => {
            useParticipantsStore.getState().setParticipantHandRaised(data.userId, data.handRaised);
        },
        onReactionReceived: (data: ReactionEvent) => {
            useParticipantsStore.getState().setParticipantReaction(data.userId, data.reaction);
        },
        onPeerMediaUpdate: (data: { userId: string } & { audioEnabled: boolean; videoEnabled: boolean }) => {
            console.log('CLIENT RECEIVE peer-media-update', data);
            const store = useParticipantsStore.getState();
            store.setParticipantMuted(data.userId, !data.audioEnabled);
            store.setParticipantVideoOff(data.userId, !data.videoEnabled);
        },
        onRoomSettingsUpdated: (data: { roomId: string; settings: { allowScreenShare?: boolean; allowWhiteboard?: boolean } }) => {
            useRoomStore.getState().setRoomSettings(data.settings);
        },
        onError: (data: { message: string }) => {
            useRoomStore.getState().setError(data.message);
        },
    });

    const handleLeaveRoom = useCallback(() => {
        useParticipantsStore.getState().reset();
        useMediaStore.getState().reset();
        useRoomStore.getState().reset();
        setExistingProducers([]);
        setIsInWaitingRoom(false);
        setWaitingRoomId(null);
        setWasRejected(false);
        setRejectionMessage('');
        signaling.disconnect();
    }, [signaling]);


    const handleJoinRoom = useCallback(async (id: string) => {
        const socket = signaling.connect();
        if (!socket) throw new Error('Failed to connect');

        await new Promise<void>((resolve, reject) => {
            const checkReady = () => {
                if (socket.connected && (socket as any).isAuthenticated) {
                    cleanup();
                    resolve();
                    return true;
                }
                return false;
            };

            function onConnect() { checkReady(); }
            function onAuthenticated() { checkReady(); }
            function onError(err: Error) { cleanup(); reject(err); }
            function cleanup() {
                // Socket is captured from outer scope
                socket?.off('connect', onConnect);
                socket?.off('authenticated', onAuthenticated);
                socket?.off('connect_error', onError);
            }

            if (checkReady()) return;

            socket.on('connect', onConnect);
            socket.on('authenticated', onAuthenticated);
            socket.on('connect_error', onError);

            checkReady();
        });

        setWaitingRoomId(id);
        setIsInWaitingRoom(true);
        setWasRejected(false);
        setRejectionMessage('');

        socket.emit('waitingRoom:join', { roomId: id }, async (response: any) => {
            console.log('JOIN_WAITING_ROOM response:', response);
            if (!response.success) {
                setIsInWaitingRoom(false);
                setWaitingRoomId(null);
                useRoomStore.getState().setError(response.error || 'Failed to join waiting room');
            } else if (response.isHost) {
                // If the user is the host, bypass the waiting room and join immediately
                console.log('User is host, joining directly');
                if (joiningRef.current) {
                    console.warn('Join already in progress, skipping duplicate host join');
                    return;
                }
                joiningRef.current = true;
                try {
                    const joined = await signaling.joinRoom(id);
                    const localId = useAuthStore.getState().userId ?? '';

                    useParticipantsStore.getState().syncParticipants(
                        joined.participants.map((p) => ({
                            userId: p.userId,
                            displayName: p.displayName,
                            role: p.role,
                            isMuted: p.isMuted,
                            isVideoOff: p.isVideoOff,
                        })),
                        localId,
                    );

                    setExistingProducers(
                        joined.existingProducers.map((p) => ({ ...p, kind: p.kind })),
                    );

                    useRoomStore.getState().setRoom(
                        joined.roomId,
                        joined.roomCode,
                        joined.role,
                        joined.allowScreenShare,
                        joined.allowWhiteboard
                    );

                    setIsInWaitingRoom(false);
                    setWaitingRoomId(null);
                } catch (error) {
                    console.error('Failed to join room directly as host:', error);
                    setIsInWaitingRoom(false);
                    setWaitingRoomId(null);
                    useRoomStore.getState().setError('Failed to join room');
                } finally {
                    joiningRef.current = false;
                }
            } else if (response.roomId) {
                setWaitingRoomId(response.roomId);
            }
        });
    }, [signaling]);

    const handleCreateRoom = useCallback(async (title: string) => {
        const socket = signaling.connect();
        if (!socket) throw new Error('Failed to connect');

        await new Promise<void>((resolve, reject) => {
            const checkReady = () => {
                if (socket.connected && (socket as any).isAuthenticated) {
                    cleanup();
                    resolve();
                    return true;
                }
                return false;
            };

            function onConnect() { checkReady(); }
            function onAuthenticated() { checkReady(); }
            function onError(err: Error) { cleanup(); reject(err); }
            function cleanup() {
                // Socket is captured from outer scope
                // Socket is captured from outer scope
                socket?.off('connect', onConnect);
                socket?.off('authenticated', onAuthenticated);
                socket?.off('connect_error', onError);
            }

            if (checkReady()) return;

            socket.on('connect', onConnect);
            socket.on('authenticated', onAuthenticated);
            socket.on('connect_error', onError);

            checkReady();
        });

        const created = await signaling.createRoom(title);
        const joined = await signaling.joinRoom(created.roomId);

        const localId = useAuthStore.getState().userId ?? '';
        useParticipantsStore.getState().syncParticipants(
            joined.participants.map((p) => ({
                userId: p.userId,
                displayName: p.displayName,
                role: p.role,
                isMuted: p.isMuted,
                isVideoOff: p.isVideoOff,
            })),
            localId,
        );

        setExistingProducers(
            joined.existingProducers.map((p) => ({ ...p, kind: p.kind })),
        );

        useRoomStore.getState().setRoom(
            created.roomId,
            created.roomCode,
            joined.role,
            joined.allowScreenShare,
            joined.allowWhiteboard
        );
    }, [signaling]);

    useEffect(() => {
        const socket = signaling.socketRef.current;
        if (!socket) return;

        const handleAdmitted = async (data: { roomId: string; message: string }) => {
            if (!isInWaitingRoom || data.roomId !== waitingRoomId) return;
            if (joiningRef.current) {
                console.warn('Join already in progress, skipping duplicate admitted join');
                return;
            }
            joiningRef.current = true;
            try {
                const joined = await signaling.joinRoom(data.roomId);
                const localId = useAuthStore.getState().userId ?? '';

                useParticipantsStore.getState().syncParticipants(
                    joined.participants.map((p) => ({
                        userId: p.userId,
                        displayName: p.displayName,
                        role: p.role,
                        isMuted: p.isMuted,
                        isVideoOff: p.isVideoOff,
                    })),
                    localId,
                );

                setExistingProducers(
                    joined.existingProducers.map((p) => ({ ...p, kind: p.kind })),
                );

                useRoomStore.getState().setRoom(
                    joined.roomId,
                    joined.roomCode,
                    joined.role,
                    joined.allowScreenShare,
                    joined.allowWhiteboard
                );

                setIsInWaitingRoom(false);
                setWaitingRoomId(null);
            } catch (error) {
                console.error('Failed to join room after admission:', error);
                setIsInWaitingRoom(false);
                setWaitingRoomId(null);
                useRoomStore.getState().setError('Failed to join room');
            } finally {
                joiningRef.current = false;
            }
        };

        const handleRejected = (data: { roomId: string; message: string }) => {
            if (!isInWaitingRoom || data.roomId !== waitingRoomId) return;

            setIsInWaitingRoom(false);
            setWaitingRoomId(null);
            setWasRejected(true);
            setRejectionMessage(data.message || 'Access denied by host');

            signaling.disconnect();
        };

        socket.on('waitingRoom:participantAdmitted', handleAdmitted);
        socket.on('waitingRoom:participantRejected', handleRejected);

        return () => {
            socket.off('waitingRoom:participantAdmitted', handleAdmitted);
            socket.off('waitingRoom:participantRejected', handleRejected);
        };
    }, [signaling, isInWaitingRoom, waitingRoomId]);


    return (
        <SignalingContext.Provider value={{
            signaling,
            existingProducers,
            setExistingProducers,
            newProducerHandlerRef,
            isInWaitingRoom,
            setIsInWaitingRoom,
            waitingRoomId,
            setWaitingRoomId,
            wasRejected,
            setWasRejected,
            rejectionMessage,
            setRejectionMessage,
            handleJoinRoom,
            handleCreateRoom,
            handleLeaveRoom
        }}>
            {children}
        </SignalingContext.Provider>
    );
}
