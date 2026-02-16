interface WaitingParticipant {
  userId: string;
  displayName: string;
  joinedAt: number;
}

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
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        <h2 className="text-white text-sm font-semibold">
          Waiting Room
          {participants.length > 0 && (
            <span className="ml-1.5 text-white/40 text-xs font-normal">({participants.length})</span>
          )}
        </h2>

        {participants.length > 1 && (
          <button
            onClick={onAdmitAll}
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/15 rounded-md transition-all"
          >
            Admit All
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {participants.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
            <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium">No one waiting</p>
          </div>
        ) : (
          participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors">
              <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs text-white font-semibold shrink-0">
                {p.displayName.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{p.displayName}</div>
                <div className="text-[10px] text-white/30 font-mono">
                  Waiting {formatWaitTime(p.joinedAt)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onAdmit(p.userId)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/15 rounded-md transition-all"
                >
                  Admit
                </button>
                <button
                  onClick={() => onReject(p.userId)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 rounded-md transition-all"
                >
                  Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
