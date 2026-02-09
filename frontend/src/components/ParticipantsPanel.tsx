import { useParticipantsStore } from '../store/participants.store';
import { useRoomStore } from '../store/room.store';
import type { RoomRole } from '../types';

interface ParticipantsPanelProps {
  localUserId: string;
  isHost: boolean;
  onKick: (userId: string) => void;
}

export function ParticipantsPanel({ localUserId, isHost, onKick }: ParticipantsPanelProps) {
  const participants = useParticipantsStore((s) => s.participants);
  const localRole = useRoomStore((s) => s.role);
  const list = Array.from(participants.values());

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-white text-sm font-semibold">
          Participants ({list.length + 1})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Local user */}
        <ParticipantRow
          userId={localUserId}
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
  userId,
  role,
  isMuted,
  isLocal,
  canKick,
  onKick,
}: {
  userId: string;
  role: RoomRole | null;
  isMuted: boolean;
  isLocal: boolean;
  canKick: boolean;
  onKick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 group">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-medium uppercase">{userId.charAt(0)}</span>
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm truncate block">
          {userId}{isLocal ? ' (You)' : ''}
        </span>
        {role && role !== 'participant' && (
          <span className="text-neutral-400 text-[10px] uppercase">{role.replace('_', ' ')}</span>
        )}
      </div>

      {/* Muted icon */}
      {isMuted && (
        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        </svg>
      )}

      {/* Kick button */}
      {canKick && !isLocal && (
        <button
          onClick={onKick}
          className="hidden group-hover:block text-neutral-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-neutral-700"
          title={`Remove ${userId}`}
        >
          Remove
        </button>
      )}
    </div>
  );
}
