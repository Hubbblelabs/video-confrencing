import { useEffect, useState } from 'react';
import type { WaitingParticipant } from '../types/waitingRoom.types';

interface WaitingRoomProps {
  participants: WaitingParticipant[];
  onAdmit: (userId: string) => void;
  onReject: (userId: string) => void;
  onAdmitAll: () => void;
}

export function WaitingRoom({ participants, onAdmit, onReject, onAdmitAll }: WaitingRoomProps) {
  const [waitTime, setWaitTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatParticipantWaitTime = (joinedAt: number) => {
    const seconds = Math.floor((Date.now() - joinedAt) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (participants.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="p-4 bg-muted/30 rounded-full mb-4">
          <WaitingIcon className="w-12 h-12 opacity-50" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">No one is waiting</h3>
        <p className="text-sm mt-2 max-w-[240px]">
          When participants join, they will appear here for you to admit or deny.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden border-l border-border shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg">
            <WaitingIcon className="text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Waiting Room</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              {participants.length} Waiting
            </span>
          </div>
        </div>
        {participants.length > 1 && (
          <button
            onClick={onAdmitAll}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-green-600 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-all"
          >
            Admit All
          </button>
        )}
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {participants.map((participant) => (
          <div
            key={participant.userId}
            className="flex flex-col gap-3 p-3 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 font-bold text-xs text-indigo-600">
                {participant.displayName.charAt(0)}
              </div>

              {/* Participant Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">
                  {participant.displayName}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 h-4">
                  <ClockIcon size={10} />
                  <span>{formatParticipantWaitTime(participant.joinedAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAdmit(participant.userId)}
                className="py-1.5 text-xs font-bold text-green-600 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-all flex items-center justify-center gap-1"
              >
                <CheckIcon size={12} />
                Admit
              </button>
              <button
                onClick={() => onReject(participant.userId)}
                className="py-1.5 text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-all flex items-center justify-center gap-1"
              >
                <XIcon size={12} />
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// SVG Icons

const WaitingIcon = ({ className = '', size = 20 }: { className?: string; size?: number }) => (
  <svg className={`${className}`} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InfoIcon = ({ className = '', size = 16 }: { className?: string; size?: number }) => (
  <svg className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
