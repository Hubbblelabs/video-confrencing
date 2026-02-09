import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';

interface LobbyPageProps {
  onCreateRoom: (title: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
}

export function LobbyPage({ onCreateRoom, onJoinRoom }: LobbyPageProps) {
  const [tab, setTab] = useState<'create' | 'join'>('join');
  const [roomTitle, setRoomTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim()) { setError('Room title is required'); return; }
    setLoading(true);
    setError(null);
    try {
      await onCreateRoom(roomTitle.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) { setError('Room ID is required'); return; }
    setLoading(true);
    setError(null);
    try {
      await onJoinRoom(roomId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-2xl font-bold">Lobby</h1>
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 text-sm">{userId}</span>
            <button
              onClick={clearAuth}
              className="text-neutral-400 text-sm hover:text-white underline"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 border border-neutral-700 rounded-lg overflow-hidden">
          <button
            onClick={() => { setTab('join'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'join'
                ? 'bg-white text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            Join Room
          </button>
          <button
            onClick={() => { setTab('create'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'create'
                ? 'bg-white text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            Create Room
          </button>
        </div>

        {/* Forms */}
        {tab === 'join' ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-neutral-400 text-sm mb-1" htmlFor="roomId">
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                placeholder="Enter Room ID or code"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-neutral-400 text-sm mb-1" htmlFor="roomTitle">
                Room Title
              </label>
              <input
                id="roomTitle"
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                placeholder="e.g. Team Standup"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
