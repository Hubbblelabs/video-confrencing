import { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { StudentWallet } from '../components/billing/StudentWallet';
import { UpcomingEvents } from '../components/lobby/UpcomingEvents';
import { billingApi } from '../services/billing.service';

interface LobbyPageProps {
  onCreateRoom: (title: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  onShowAdmin?: () => void;
  onShowAttendance?: () => void;
  onShowBrowser?: () => void;
}



function BalanceIndicator() {
  const token = useAuthStore((s) => s.token);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchBalance = async () => {
      try {
        const wallet = await billingApi.getWallet(token);
        setBalance(wallet.balance);
      } catch (err) {
        console.error('Failed to fetch balance');
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (balance === null) return <div className="w-12 h-4 bg-muted animate-pulse rounded" />;
  return <span className="text-sm font-bold">{balance} credits</span>;
}

export function LobbyPage({ onCreateRoom, onJoinRoom, onShowAdmin, onShowAttendance, onShowBrowser }: LobbyPageProps) {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const userId = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const role = useAuthStore((s) => s.role);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const canCreateRoom = role === 'TEACHER' || role === 'ADMIN';

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
      await onCreateRoom('New Meeting');
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden relative selection:bg-primary/20">
      {/* Background Ambience - More subtle and modern */}
      <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full bg-primary/5 blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none mix-blend-screen opacity-50" />

      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between relative z-10 w-full max-w-7xl mx-auto border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20 text-white ring-1 ring-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-heading">Meet</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-foreground">{currentTime}</span>
            <span className="text-xs text-muted-foreground">{currentDate}</span>
          </div>

          <div className="h-8 w-[1px] bg-border hidden md:block"></div>

          {role === 'STUDENT' && (
            <StudentWallet
              trigger={
                <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary-foreground transition-all hover:bg-secondary/15 hover:border-secondary/30">
                  <div className="p-1 rounded-full bg-secondary/20">
                    <svg className="w-3.5 h-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <BalanceIndicator />
                </button>
              }
            />
          )}

          <button
            onClick={clearAuth}
            className="group flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-muted/50 transition-all border border-transparent hover:border-border"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 text-foreground flex items-center justify-center text-sm font-bold border border-white/10 shadow-sm group-hover:shadow-md transition-all">
              {(displayName || userId || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-sm text-left hidden lg:block">
              <p className="font-medium leading-none text-foreground/90">{displayName}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{role}</p>
            </div>
            <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors ml-1 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">

        {/* Welcome Section */}
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-heading">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">{displayName?.split(' ')[0] || 'Student'}</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Ready to learn something new today?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Main Column (8 cols) */}
          <div className="lg:col-span-8 space-y-8">

            {/* Visual Actions Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Join Room Card */}
              <div className="bg-background/60 backdrop-blur-xl border border-border/60 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Join a Room</h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">Have a meeting code? Enter it below to join your class instantly.</p>

                  <form onSubmit={handleJoin} className="mt-auto">
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-muted-foreground pointer-events-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="abc-def-ghi"
                        className="w-full pl-10 pr-20 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                      />
                      <button
                        type="submit"
                        disabled={loading || !roomId.trim()}
                        className="absolute right-1 top-1 bottom-1 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {loading ? '...' : 'Join'}
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1 animate-fade-in">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      {error}
                    </p>}
                  </form>
                </div>
              </div>

              {/* Browse Sessions Card */}
              <div className="bg-background/60 backdrop-blur-xl border border-border/60 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden relative flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform duration-300">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Browse Sessions</h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">Explore open classes, public seminars, and community events happening now.</p>

                  <div className="mt-auto pt-4">
                    <button
                      onClick={onShowBrowser}
                      className="w-full py-3 px-4 bg-background border border-border/50 hover:border-orange-500/30 hover:bg-orange-500/5 text-foreground hover:text-orange-600 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-sm"
                    >
                      <span>Explore Catalog</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Events Section */}
            <div className="animate-fade-in-up delay-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight font-heading">Upcoming Classes</h2>
                  <p className="text-muted-foreground text-sm">Your scheduled sessions for this week.</p>
                </div>
              </div>
              <UpcomingEvents onJoinRoom={onJoinRoom} />
            </div>

          </div>

          {/* Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6 animate-fade-in-up delay-200">

            {/* Quick Tips / Info */}
            <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" /></svg>
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Need Help?</h3>
                <p className="text-white/80 text-sm mb-4">Check out our documentation for guides on how to use the whiteboard and screen sharing features.</p>
                <button className="text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  View Docs
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>);
}
