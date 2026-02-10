import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../services/api.service';
import type { 
  LoginRequest, 
  RegisterRequest,
} from '../types/api.types';
import { ValidationRules } from '../types/api.types';

type Mode = 'login' | 'register';

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    if (mode === 'register' && !displayName.trim()) {
      setError('Display name is required');
      return;
    }

    // Email validation
    if (!ValidationRules.email.pattern.test(email.trim())) {
      setError(ValidationRules.email.message);
      return;
    }

    // Password validation
    if (password.length < ValidationRules.password.minLength) {
      setError(ValidationRules.password.message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Type-safe API call
      const requestData: LoginRequest | RegisterRequest = mode === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, displayName: displayName.trim() };

      const response = mode === 'login'
        ? await authApi.login(requestData as LoginRequest)
        : await authApi.register(requestData as RegisterRequest);

      // Auth store will decode JWT and extract userId and displayName
      setAuth(response.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)] transform hover:scale-105 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            <span className="text-gradient">Video Conf</span>
          </h1>
          <p className="text-muted-foreground text-lg font-light">
            {mode === 'login' ? 'Welcome back, explorer' : 'Begin your journey'}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-foreground/80 text-sm font-medium mb-2 ml-1" htmlFor="email">
                Email Address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-foreground placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground/80 text-sm font-medium mb-2 ml-1" htmlFor="password">
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-foreground placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                  placeholder={`Min ${ValidationRules.password.minLength} characters`}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={ValidationRules.password.minLength}
                  maxLength={ValidationRules.password.maxLength}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="animate-slide-up">
                <label className="block text-foreground/80 text-sm font-medium mb-2 ml-1" htmlFor="displayName">
                  Display Name
                </label>
                <div className="relative group">
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-foreground placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                    placeholder="John Doe"
                    autoComplete="name"
                    maxLength={ValidationRules.displayName.maxLength}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in backdrop-blur-sm">
                <svg className="w-5 h-5 text-destructive shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 glass-button text-white font-bold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : mode === 'login' ? 'Enter Portal' : 'Join Now'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? "New here?" : 'Already a member?'}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                  setDisplayName('');
                }}
                className="text-primary hover:text-accent font-semibold hover:underline transition-all ml-1"
              >
                {mode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
