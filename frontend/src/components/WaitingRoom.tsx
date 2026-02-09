import type { WaitingParticipant } from '../types/waitingRoom.types';

interface WaitingRoomProps {
  participants: WaitingParticipant[];
  onAdmit: (userId: string) => void;
  onReject: (userId: string) => void;
  onAdmitAll: () => void;
}

export function WaitingRoom({ participants, onAdmit, onReject, onAdmitAll }: WaitingRoomProps) {
  const formatWaitTime = (joinedAt: number) => {
    const seconds = Math.floor((Date.now() - joinedAt) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (participants.length === 0) {
    return (
      <div className="h-full w-full flex flex-col bg-card border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <WaitingIcon />
            <h3 className="font-semibold text-foreground">Waiting Room</h3>
            <span className="text-xs text-muted-foreground">(0 waiting)</span>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div>
            <WaitingIcon className="mx-auto mb-3 opacity-50" size={48} />
            <p className="text-muted-foreground">No one waiting</p>
            <p className="text-xs text-muted-foreground mt-1">
              Participants will appear here for approval
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <WaitingIcon />
          <h3 className="font-semibold text-foreground">Waiting Room</h3>
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-[var(--primary)] rounded-full">
            {participants.length}
          </span>
        </div>
        {participants.length > 1 && (
          <button
            onClick={onAdmitAll}
            className="px-3 py-1.5 text-sm font-medium bg-[var(--primary)] text-white rounded hover:bg-[var(--primary)]/90 transition-colors"
          >
            Admit All
          </button>
        )}
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((participant, index) => (
          <div
            key={participant.userId}
            className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Position Number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-semibold text-sm">
                {index + 1}
              </div>

              {/* Participant Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {participant.displayName}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <ClockIcon size={12} />
                  <span>Waiting {formatWaitTime(participant.joinedAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onAdmit(participant.userId)}
                className="px-3 py-1.5 text-sm font-medium bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                title="Admit to meeting"
              >
                <CheckIcon size={16} />
                <span className="hidden sm:inline">Admit</span>
              </button>
              <button
                onClick={() => onReject(participant.userId)}
                className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                title="Reject entry"
              >
                <XIcon size={16} />
                <span className="hidden sm:inline">Deny</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-muted/30 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          💡 Tip: Click "Admit All" to let everyone in at once
        </div>
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
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
