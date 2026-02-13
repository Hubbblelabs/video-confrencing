import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

interface LobbyPageProps {
  onCreateRoom: (title: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
}

export function LobbyPage({ onCreateRoom, onJoinRoom }: LobbyPageProps) {
  const [roomTitle, setRoomTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const userId = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000); // multiple intervals can run
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await onCreateRoom(roomTitle || 'New Meeting');
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />


      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between relative z-10 w-full max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-md shadow-primary/20 text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-medium tracking-tight text-foreground/90 font-heading">Meet</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">{currentTime} • {currentDate}</span>
          <div className="h-8 w-[1px] bg-border hidden sm:block"></div>
          <div className="flex items-center gap-3 mr-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
              {(displayName || userId || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          <button
            onClick={clearAuth}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center relative z-10 w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-0 gap-12 lg:gap-24">

        {/* Left Column: Actions */}
        <div className="flex-1 max-w-2xl lg:max-w-xl w-full flex flex-col justify-center items-start space-y-8 animate-fade-in">

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-foreground font-heading">
              Premium video meetings.
              <span className="block text-muted-foreground/80 mt-2">Now free for everyone.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              We re-engineered the service we built for secure business meetings, meet, to make it free and available for all.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">

            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white text-base font-medium rounded-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New meeting</span>
            </button>

            <form onSubmit={handleJoin} className="flex items-center relative w-full sm:w-auto flex-1 max-w-sm group">
              <div className="absolute left-3.5 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter a code or link"
                className="w-full pl-11 pr-4 py-3.5 bg-background border border-muted-foreground/30 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder:text-muted-foreground/60"
              />
              {roomId.trim().length > 0 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded animate-fade-in"
                >
                  Join
                </button>
              )}
            </form>

          </div>

          <div className="h-px w-full bg-border/40 max-w-lg"></div>

          <div>
            <p className="text-sm text-muted-foreground/80">
              <a href="#" className="text-primary hover:underline">Learn more</a> about meet
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20 flex items-center gap-2 animate-fade-in max-w-md">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

        </div>

        {/* Right Column: Visual */}
        <div className="flex-1 w-full max-w-xl hidden lg:flex items-center justify-center relative">
          <div className="relative w-full aspect-square max-w-[500px]">
            {/* Decorative Carousel Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-teal-500/10 rounded-full blur-[60px] animate-pulse-slow"></div>

            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-8">

              <div className="relative w-full h-[320px] bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-8 group hover:scale-[1.02] transition-transform duration-500">
                {/* Fake Meet UI inside */}
                <div className="absolute inset-0 bg-muted/20"></div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>

                <div className="absolute inset-x-8 top-16 bottom-8 grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-lg animate-pulse"></div>
                  <div className="bg-muted/50 rounded-lg animate-pulse delay-100"></div>
                  <div className="bg-muted/30 rounded-lg animate-pulse delay-200"></div>
                  <div className="bg-muted/60 rounded-lg animate-pulse delay-300"></div>
                </div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
                  <div className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-sm"></div>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-xl font-medium text-foreground">Get a link you can share</h3>
                <p className="text-sm text-muted-foreground">Click <span className="font-semibold text-primary">New meeting</span> to get a link you can send to people you want to meet with</p>
              </div>

              {/* Pagination dots */}
              <div className="flex gap-2 mt-6">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div className="w-2 h-2 rounded-full bg-border"></div>
                <div className="w-2 h-2 rounded-full bg-border"></div>
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
