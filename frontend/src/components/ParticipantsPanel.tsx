import { useParticipantsStore } from '../store/participants.store';

interface ParticipantsPanelProps {
  localUserId: string;
  localDisplayName: string;
  isHost: boolean;
  onKick: (userId: string) => void;
  onMuteAll: () => void;
  onStartPrivateMessage: (userId: string) => void;
}

export function ParticipantsPanel({
  localDisplayName,
  isHost,
  onKick,
  onMuteAll,
  onStartPrivateMessage,
}: ParticipantsPanelProps) {
  const participants = useParticipantsStore((s) => s.participants);
  const entries = Array.from(participants.entries());

  return (
    <div className="h-full bg-[#1a1a1a] border-l border-white/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        <h2 className="text-white text-sm font-semibold">
          Participants
          <span className="ml-1.5 text-white/40 text-xs font-normal">({entries.length + 1})</span>
        </h2>

        {isHost && (
          <button
            onClick={onMuteAll}
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 rounded-md transition-all flex items-center gap-1.5"
            title="Mute all participants"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            Mute All
          </button>
        )}
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* Local user (you) */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-semibold shrink-0">
            {localDisplayName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium truncate">{localDisplayName}</span>
              <span className="text-[10px] text-white/30 font-medium">(You)</span>
              {isHost && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">Host</span>
              )}
            </div>
          </div>
        </div>

        {/* Remote participants */}
        {entries.map(([pUserId, p]) => (
          <div key={pUserId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-xs text-white font-semibold shrink-0">
              {p.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium truncate">{p.displayName}</span>
                {p.role === 'host' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">Host</span>
                )}
                {p.role === 'co_host' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-semibold">Co-Host</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {p.isMuted && (
                  <span className="text-[10px] text-red-400/70 flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                    </svg>
                    Muted
                  </span>
                )}
                {p.handRaised && (
                  <span className="text-[10px] text-amber-400">✋</span>
                )}
              </div>
            </div>

            {/* Actions (visible on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onStartPrivateMessage(pUserId)}
                className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                title="Private message"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {isHost && (
                <button
                  onClick={() => onKick(pUserId)}
                  className="p-1.5 rounded-md hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
                  title="Remove participant"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
