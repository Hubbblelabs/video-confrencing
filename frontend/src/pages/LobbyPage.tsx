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
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold" style={{ fontFamily: 'var(--font-sans)' }}>
                Lobby
              </h1>
              <p className="text-muted-foreground text-sm">Choose how to proceed</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] flex items-center justify-center">
                <span className="text-white text-sm font-semibold uppercase">{userId?.charAt(0)}</span>
              </div>
              <span className="text-card-foreground text-sm font-medium">{userId}</span>
            </div>
            <button
              onClick={clearAuth}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[var(--destructive)] border border-border rounded-lg hover:border-[var(--destructive)] transition-all duration-200"
              style={{ borderRadius: 'var(--radius)' }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Join Room Card */}
          <div className={`bg-card rounded-2xl p-8 border-2 transition-all duration-300 cursor-pointer ${
            tab === 'join' ? 'border-[var(--primary)] shadow-xl' : 'border-border hover:border-[var(--muted)]'
          }`}
          onClick={() => { setTab('join'); setError(null); }}
          style={{ boxShadow: tab === 'join' ? 'var(--shadow-xl)' : 'var(--shadow-sm)' }}>
            <div className="mb-6">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-all duration-300 ${
                tab === 'join' ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-lg' : 'bg-muted'
              }`}>
                <svg className={`w-7 h-7 ${tab === 'join' ? 'text-white' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-card-foreground text-2xl font-bold mb-2">Join Room</h2>
              <p className="text-muted-foreground text-sm">Enter a room code to join an existing meeting</p>
            </div>

            {tab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-4 animate-in slide-in-from-top duration-300">
                <div>
                  <label className="block text-card-foreground text-sm font-medium mb-2" htmlFor="roomId">
                    Room ID
                  </label>
                  <input
                    id="roomId"
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200 font-mono"
                    style={{ borderRadius: 'var(--radius)' }}
                    placeholder="Enter room code"
                    autoFocus
                  />
                </div>

                {error && tab === 'join' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20">
                    <svg className="w-5 h-5 text-[var(--destructive)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[var(--destructive)] text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Joining...
                    </span>
                  ) : 'Join Room'}
                </button>
              </form>
            )}
          </div>

          {/* Create Room Card */}
          <div className={`bg-card rounded-2xl p-8 border-2 transition-all duration-300 cursor-pointer ${
            tab === 'create' ? 'border-[var(--secondary)] shadow-xl' : 'border-border hover:border-[var(--muted)]'
          }`}
          onClick={() => { setTab('create'); setError(null); }}
          style={{ boxShadow: tab === 'create' ? 'var(--shadow-xl)' : 'var(--shadow-sm)' }}>
            <div className="mb-6">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-all duration-300 ${
                tab === 'create' ? 'bg-gradient-to-br from-[var(--secondary)] to-[var(--primary)] shadow-lg' : 'bg-muted'
              }`}>
                <svg className={`w-7 h-7 ${tab === 'create' ? 'text-white' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-card-foreground text-2xl font-bold mb-2">Create Room</h2>
              <p className="text-muted-foreground text-sm">Start a new meeting and invite others</p>
            </div>

            {tab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4 animate-in slide-in-from-top duration-300">
                <div>
                  <label className="block text-card-foreground text-sm font-medium mb-2" htmlFor="roomTitle">
                    Room Title
                  </label>
                  <input
                    id="roomTitle"
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
                    style={{ borderRadius: 'var(--radius)' }}
                    placeholder="e.g. Team Standup"
                    autoFocus
                  />
                </div>

                {error && tab === 'create' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20">
                    <svg className="w-5 h-5 text-[var(--destructive)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[var(--destructive)] text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[var(--secondary)] text-[var(--secondary-foreground)] font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </span>
                  ) : 'Create Room'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
