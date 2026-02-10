import { useParticipantsStore } from '../store/participants.store';
import { useRoomStore } from '../store/room.store';
import type { RoomRole } from '../types';

interface ParticipantsPanelProps {
  localUserId: string;
  localDisplayName: string;
  isHost: boolean;
  onKick: (userId: string) => void;
  onMuteAll: () => void;
  onStartPrivateMessage: (userId: string) => void;
}

export function ParticipantsPanel({ localUserId, localDisplayName, isHost, onKick, onMuteAll, onStartPrivateMessage }: ParticipantsPanelProps) {
  const participants = useParticipantsStore((s) => s.participants);
  const localRole = useRoomStore((s) => s.role);
  const list = Array.from(participants.values());

  return (
    <div className="w-80 h-full flex flex-col bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden border-l border-border shadow-2xl">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-secondary/20 to-cyan-400/20 rounded-lg">
              <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-foreground text-sm font-bold">
                Participants
              </h2>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                {list.length + 1} ONLINE
              </p>
            </div>
          </div>

          {isHost && (
            <button
              onClick={onMuteAll}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-all flex items-center gap-1"
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-hide">
        {/* Local user */}
        <ParticipantRow
          userId={localUserId}
          displayName={localDisplayName}
          role={localRole}
          isMuted={false}
          isLocal
          canKick={false}
          onKick={() => { }}
          onPrivateMessage={() => { }}
        />

        {/* Remote participants */}
        {list.map((p) => (
          <ParticipantRow
            key={p.userId}
            userId={p.userId}
            displayName={p.displayName}
            role={p.role}
            isMuted={p.isMuted}
            isLocal={false}
            canKick={isHost}
            onKick={() => onKick(p.userId)}
            onPrivateMessage={() => onStartPrivateMessage(p.userId)}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantRow({
  displayName,
  role,
  isMuted,
  isLocal,
  canKick,
  onKick,
  onPrivateMessage,
}: {
  userId: string;
  displayName: string;
  role: RoomRole | null;
  isMuted: boolean;
  isLocal: boolean;
  canKick: boolean;
  onKick: () => void;
  onPrivateMessage: () => void;
}) {
  const getRoleBadge = () => {
    if (!role || role === 'participant') return null;

    const roleColors = {
      host: 'bg-primary/20 text-primary border-primary/30',
      co_host: 'bg-secondary/20 text-secondary border-secondary/30',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${roleColors[role as 'host' | 'co_host']}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50">
      {/* Avatar */}
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isLocal
          ? 'bg-gradient-to-br from-primary to-accent'
          : 'bg-gradient-to-br from-secondary to-cyan-500'
          }`}>
          <span className="text-white text-sm font-bold uppercase">{displayName.charAt(0)}</span>
        </div>
        {isLocal && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-semibold truncate ${isLocal ? 'text-primary' : 'text-foreground'}`}>
            {displayName}
          </span>
          {isLocal && (
            <span className="text-muted-foreground text-xs font-medium">(You)</span>
          )}
        </div>
        {getRoleBadge()}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2">
        {/* Muted icon */}
        {isMuted && (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-destructive/10 border border-destructive/20" title="Muted">
            <svg className="w-3.5 h-3.5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            </svg>
          </div>
        )}

        {/* Message button */}
        {!isLocal && (
          <button
            onClick={onPrivateMessage}
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-all duration-200 border border-border hover:border-foreground/20"
            title={`Message ${displayName}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}

        {/* Kick button */}
        {canKick && !isLocal && (
          <button
            onClick={onKick}
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 text-xs font-medium text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all duration-200 border border-destructive/20 hover:border-transparent"
            title={`Remove ${displayName}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
