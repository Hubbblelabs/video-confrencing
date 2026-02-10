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
    <div className="min-h-screen py-8 px-4 relative overflow-hidden flex flex-col">
      {/* Background Ambience matches Auth Page */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="max-w-6xl mx-auto w-full relative z-10 flex-1 flex flex-col">
        {/* Modern Header */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Welcome back, <span className="font-semibold text-foreground">{displayName || userId}</span></p>
            </div>
          </div>

          <button
            onClick={clearAuth}
            className="group flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-all duration-300 border-white/5"
          >
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Sign Out</span>
            <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </header>

        {/* Main Actions Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">

            {/* Join Room Card */}
            <div
              onClick={() => { setActiveTab('join'); setError(null); }}
              className={`cursor-pointer group relative overflow-hidden rounded-[2rem] transition-all duration-500 border ${activeTab === 'join'
                ? 'bg-background/40 backdrop-blur-xl border-primary/30 shadow-2xl shadow-primary/10 scale-[1.02]'
                : 'bg-background/20 backdrop-blur-md border-white/5 hover:bg-background/30 hover:scale-[1.01]'
                }`}
            >
              {/* Active Indicator Gradient */}
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-500 ${activeTab === 'join' ? 'opacity-100' : ''}`}></div>

              <div className="relative p-10 h-full flex flex-col">
                <div className="mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${activeTab === 'join' ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : 'bg-muted text-muted-foreground'
                    }`}>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-3 font-heading">Join Meeting</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">Enter a code to jump into an existing session.</p>
                </div>

                {activeTab === 'join' && (
                  <div className="mt-auto animate-slide-up">
                    <form onSubmit={handleJoin} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80 ml-1">Room Code</label>
                        <div className="relative group">
                          <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="w-full px-6 py-4 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 font-mono tracking-wider text-lg"
                            placeholder="XXX-XXX-XXX"
                            autoFocus
                          />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity duration-300"></div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
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
              className={`cursor-pointer group relative overflow-hidden rounded-[2rem] transition-all duration-500 border ${activeTab === 'create'
                ? 'bg-background/40 backdrop-blur-xl border-secondary/30 shadow-2xl shadow-secondary/10 scale-[1.02]'
                : 'bg-background/20 backdrop-blur-md border-white/5 hover:bg-background/30 hover:scale-[1.01]'
                }`}
            >
              {/* Active Indicator Gradient */}
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-0 transition-opacity duration-500 ${activeTab === 'create' ? 'opacity-100' : ''}`}></div>

              <div className="relative p-10 h-full flex flex-col">
                <div className="mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${activeTab === 'create' ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-110' : 'bg-muted text-muted-foreground'
                    }`}>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-3 font-heading">New Meeting</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">Start a fresh room and invite your team.</p>
                </div>

                {activeTab === 'create' && (
                  <div className="mt-auto animate-slide-up">
                    <form onSubmit={handleCreate} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80 ml-1">Room Title</label>
                        <div className="relative group">
                          <input
                            type="text"
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                            className="w-full px-6 py-4 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all duration-300 text-lg"
                            placeholder="e.g. Weekly Sync"
                            autoFocus
                          />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-secondary to-cyan-400 opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity duration-300"></div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-secondary to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-secondary/25 hover:shadow-secondary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Launch Meeting'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto animate-fade-in flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 backdrop-blur-md">
            <svg className="w-5 h-5 text-destructive shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
