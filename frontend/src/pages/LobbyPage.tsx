import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';

interface LobbyPageProps {
  onCreateRoom: (title: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
}

export function LobbyPage({ onCreateRoom, onJoinRoom }: LobbyPageProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('join');
  const [roomTitle, setRoomTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
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
    <div className="min-h-screen py-8 px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-7 h-7 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">
                Dashboard
              </h1>
              <p className="text-muted-foreground">Select your destination</p>
            </div>
          </div>

          <div className="flex items-center gap-4 glass px-2 py-2 rounded-2xl">
            <div className="flex items-center gap-3 px-4 py-2 bg-secondary/10 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-md">
                {(displayName || userId)?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground">{displayName || userId}</span>
            </div>
            <button
              onClick={clearAuth}
              className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Join Room Card */}
          <div
            onClick={() => { setActiveTab('join'); setError(null); }}
            className={`cursor-pointer group relative overflow-hidden rounded-3xl transition-all duration-500 ${activeTab === 'join'
              ? 'glass-card ring-2 ring-primary/50 scale-[1.02] shadow-2xl shadow-primary/10'
              : 'glass opacity-80 hover:opacity-100 hover:scale-[1.01]'
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 h-full flex flex-col">
              <div className="mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${activeTab === 'join' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground'
                  }`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">Join Meeting</h2>
                <p className="text-muted-foreground">Enter a room code to connect with your team.</p>
              </div>

              {activeTab === 'join' && (
                <div className="mt-auto animate-slide-up">
                  <form onSubmit={handleJoin} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground ml-1">Room Code</label>
                      <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full px-5 py-4 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono tracking-wider"
                        placeholder="e.g. 123-456-789"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 glass-button text-primary-foreground font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {loading ? 'Connecting...' : 'Join Now'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Create Room Card */}
          <div
            onClick={() => { setActiveTab('create'); setError(null); }}
            className={`cursor-pointer group relative overflow-hidden rounded-3xl transition-all duration-500 ${activeTab === 'create'
              ? 'glass-card ring-2 ring-secondary/50 scale-[1.02] shadow-2xl shadow-secondary/10'
              : 'glass opacity-80 hover:opacity-100 hover:scale-[1.01]'
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 h-full flex flex-col">
              <div className="mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${activeTab === 'create' ? 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30' : 'bg-muted text-muted-foreground'
                  }`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">New Meeting</h2>
                <p className="text-muted-foreground">Host a secure room and invite participants.</p>
              </div>

              {activeTab === 'create' && (
                <div className="mt-auto animate-slide-up">
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground ml-1">Meeting Title</label>
                      <input
                        type="text"
                        value={roomTitle}
                        onChange={(e) => setRoomTitle(e.target.value)}
                        className="w-full px-5 py-4 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary/50 transition-all"
                        placeholder="e.g. Weekly Sync"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-secondary to-cyan-400 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Launch Meeting'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto animate-fade-in text-center p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium backdrop-blur-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
