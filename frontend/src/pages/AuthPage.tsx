import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authApi, decodeJWT } from '../services/api.service';
import type { 
  LoginRequest, 
  RegisterRequest, 
  JwtPayload,
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

      // Decode JWT with proper typing
      const payload = decodeJWT<JwtPayload>(response.accessToken);
      setAuth(response.accessToken, payload.sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold text-center mb-8">
          Video Conference
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-neutral-400 text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-neutral-400 text-sm mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              placeholder={`Enter password (min ${ValidationRules.password.minLength} chars)`}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={ValidationRules.password.minLength}
              maxLength={ValidationRules.password.maxLength}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-neutral-400 text-sm mb-1" htmlFor="displayName">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                placeholder="Enter your display name"
                autoComplete="name"
                maxLength={ValidationRules.displayName.maxLength}
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-neutral-400">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
              setDisplayName('');
            }}
            className="text-white underline hover:no-underline"
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
