import { useParticipantsStore } from '../store/participants.store';
import { useRoomStore } from '../store/room.store';
import type { RoomRole } from '../types';

interface ParticipantsPanelProps {
  localUserId: string;
  localDisplayName: string;
  isHost: boolean;
  onKick: (userId: string) => void;
}

export function ParticipantsPanel({ localUserId, localDisplayName, isHost, onKick }: ParticipantsPanelProps) {
  const participants = useParticipantsStore((s) => s.participants);
  const localRole = useRoomStore((s) => s.role);
  const list = Array.from(participants.values());

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col backdrop-blur-xl" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="px-6 py-5 border-b border-border bg-gradient-to-br from-card to-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-card-foreground text-lg font-bold">
              Participants
            </h2>
            <p className="text-muted-foreground text-xs">
              {list.length + 1} {list.length === 0 ? 'person' : 'people'} in room
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {/* Local user */}
        <ParticipantRow
          userId={localUserId}
          displayName={localDisplayName}
          role={localRole}
          isMuted={false}
          isLocal
          canKick={false}
          onKick={() => {}}
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
}: {
  userId: string;
  displayName: string;
  role: RoomRole | null;
  isMuted: boolean;
  isLocal: boolean;
  canKick: boolean;
  onKick: () => void;
}) {
  const getRoleBadge = () => {
    if (!role || role === 'participant') return null;
    
    const roleColors = {
      host: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
      co_host: 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleColors[role as 'host' | 'co_host']}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border"
         style={{ borderRadius: 'var(--radius)' }}>
      {/* Avatar */}
      <div className="relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${
          isLocal 
            ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]' 
            : 'bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)]'
        }`}>
          <span className="text-white text-sm font-bold uppercase">{displayName.charAt(0)}</span>
        </div>
        {isLocal && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--primary)] rounded-full border-2 border-card flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-card-foreground text-sm font-semibold truncate">
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
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--destructive)]/10">
            <svg className="w-3.5 h-3.5 text-[var(--destructive)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            </svg>
          </div>
        )}

        {/* Kick button */}
        {canKick && !isLocal && (
          <button
            onClick={onKick}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)] hover:text-white rounded-lg transition-all duration-200 border border-[var(--destructive)]/20 hover:border-transparent"
            title={`Remove ${displayName}`}
            style={{ borderRadius: 'calc(var(--radius) - 2px)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
