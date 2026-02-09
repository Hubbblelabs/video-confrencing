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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-foreground text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
            Video Conference
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl p-8 border border-border" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-card-foreground text-sm font-medium mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
                style={{ borderRadius: 'var(--radius)' }}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-card-foreground text-sm font-medium mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
                style={{ borderRadius: 'var(--radius)' }}
                placeholder={`Min ${ValidationRules.password.minLength} characters`}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={ValidationRules.password.minLength}
                maxLength={ValidationRules.password.maxLength}
              />
            </div>

            {mode === 'register' && (
              <div className="animate-in slide-in-from-top duration-200">
                <label className="block text-card-foreground text-sm font-medium mb-2" htmlFor="displayName">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
                  style={{ borderRadius: 'var(--radius)' }}
                  placeholder="John Doe"
                  autoComplete="name"
                  maxLength={ValidationRules.displayName.maxLength}
                />
              </div>
            )}

            {error && (
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
              className="w-full py-3.5 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              style={{ borderRadius: 'var(--radius)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Please wait...
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                  setDisplayName('');
                }}
                className="text-[var(--primary)] font-semibold hover:underline transition-all"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
