"use client";

import { use } from 'react';
import { SessionDetailsPage } from '@/views/SessionDetailsPage';
import { useRouter } from 'next/navigation';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    return (
        <SessionDetailsPage
            sessionId={id}
            onBack={() => router.push('/sessions')}
            onJoinRoom={async (roomCode) => {
                router.push(`/room/${roomCode}`);
            }}
        />
    );
}
