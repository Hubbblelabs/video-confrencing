"use client";

import { use, useEffect, useRef } from 'react';
import { RoomPage } from '@/views/RoomPage';
import { useSignalingContext } from '@/providers/SignalingProvider';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const {
        signaling,
        existingProducers,
        newProducerHandlerRef,
        handleLeaveRoom,
        handleJoinRoom,
        isInWaitingRoom,
        wasRejected,
        rejectionMessage
    } = useSignalingContext();

    // Use a ref so the effect below only fires when `id` changes, not every
    // time SignalingProvider re-renders (which would recreate handleJoinRoom).
    const handleJoinRoomRef = useRef(handleJoinRoom);
    useEffect(() => { handleJoinRoomRef.current = handleJoinRoom; });

    useEffect(() => {
        if (id) {
            handleJoinRoomRef.current(id).catch(err =>
                console.error("Failed to join room automatically:", err)
            );
        }
    }, [id]); // ← only re-run when the room ID changes, NOT when handleJoinRoom changes

    if (wasRejected) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#111] text-white p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-white/60">{rejectionMessage || 'The host declined your request to join.'}</p>
            </div>
        );
    }

    if (isInWaitingRoom) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#111] text-white p-4 text-center">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin mb-6" />
                <h1 className="text-2xl font-bold mb-2">Waiting Room</h1>
                <p className="text-white/60">Please wait, the meeting host will let you in soon.</p>
            </div>
        );
    }

    // The actual Room component extracts roomId from the path internally or uses Zustand, 
    // but Next.js requires the route param to be properly parsed.
    return (
        <RoomPage
            signaling={signaling}
            existingProducers={existingProducers}
            onNewProducerRef={newProducerHandlerRef}
            onLeave={handleLeaveRoom}
        />
    );
}
