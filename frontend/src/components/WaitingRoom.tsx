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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-50/50 to-slate-100/30 dark:from-neutral-950 dark:via-neutral-950/50 dark:to-neutral-900/30 p-6 relative overflow-hidden">
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] pointer-events-none bg-noise" />

        {/* Centered Card */}
        <div className="w-full max-w-[420px] relative z-10">
          <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-slate-200/60 dark:border-neutral-800/60 overflow-hidden">

            {/* Main Content */}
            <div className="flex flex-col items-center pt-16 pb-12 px-10">

              {/* Animated Progress Ring */}
              <div className="relative mb-10">
                {/* Pulsing background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-500/15 dark:to-orange-500/15 rounded-full blur-2xl animate-pulse-slow" />

                {/* Progress ring container */}
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-slate-200 dark:text-neutral-800"
                      opacity="0.3"
                    />
                    {/* Animated progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="text-amber-500 dark:text-amber-400 animate-progress-ring"
                      strokeDasharray="264"
                      strokeDashoffset="66"
                    />
                  </svg>

                  {/* Center dot with pulse */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse-dot" />
                  </div>
                </div>
              </div>

              {/* Primary Heading - Bold, confident, human */}
              <h1 className="text-[28px] font-semibold text-slate-900 dark:text-neutral-100 mb-3 tracking-tight text-center leading-tight">
                You're in the waiting room
              </h1>

              {/* Secondary Status - Calm, reassuring */}
              <p className="text-[15px] text-slate-600 dark:text-neutral-400 mb-10 text-center leading-relaxed font-normal max-w-[340px]">
                The host has been notified and will admit you shortly.
              </p>

              {/* Info / Reassurance Block */}
              <div className="w-full bg-slate-100/60 dark:bg-neutral-800/40 border border-slate-200/50 dark:border-neutral-700/50 rounded-2xl p-4 mb-8">
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <InfoIcon className="text-slate-500 dark:text-neutral-400" size={18} />
                  </div>
                  <p className="text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed font-normal">
                    You'll be admitted automatically once approved.
                  </p>
                </div>
              </div>

              {/* Progress Feedback - Temporal awareness */}
              <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-500 text-sm font-medium">
                <span>Waiting</span>
                <span className="text-slate-400 dark:text-neutral-600">·</span>
                <span className="tabular-nums">{formatWaitTime(waitTime)}</span>
                <span className="animate-dots">...</span>
              </div>
            </div>

            {/* Footer Action - Low visual weight */}
            <div className="border-t border-slate-200/60 dark:border-neutral-800/60 bg-slate-50/40 dark:bg-neutral-900/40 px-10 py-5 flex justify-center">
              <button className="text-[14px] font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 transition-colors duration-200">
                Leave waiting room
              </button>
            </div>
          </div>
        </div>
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
