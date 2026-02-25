"use client";
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../services/api.service';
import type {
  LoginRequest,
  RegisterRequest,
  UserRole,
} from '../types/api.types';
import { ValidationRules } from '../types/api.types';
import { useRouter } from 'next/navigation';

import { ForgotPasswordPage } from './ForgotPasswordPage';

type Mode = 'login' | 'register' | 'forgot-password';

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role] = useState<UserRole>('STUDENT' as UserRole);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const currentRole = useAuthStore((s) => s.role);

  useEffect(() => {
    if (token && currentRole) {
      if (currentRole === 'ADMIN') {
        router.push('/admin');
      } else if (currentRole === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/dashboard');
      }
    }
  }, [token, currentRole, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    if (mode === 'register' && !displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (!ValidationRules.email.pattern.test(email.trim())) {
      setError(ValidationRules.email.message);
      return;
    }

    if (password.length < ValidationRules.password.minLength) {
      setError(ValidationRules.password.message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestData: LoginRequest | RegisterRequest = mode === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, displayName: displayName.trim(), role };

      const response = mode === 'login'
        ? await authApi.login(requestData as LoginRequest)
        : await authApi.register(requestData as RegisterRequest);

      setAuth(response.accessToken);

      // Determine user role and route to appropriate dashboard
      const payload = JSON.parse(atob(response.accessToken.split('.')[1]));
      if (payload.role === 'ADMIN') {
        router.push('/admin');
      } else if (payload.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => setMode('login')} />;
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Essential Branding Side (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 mix-blend-color-dodge"></div>

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/40 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/40 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>

        {/* Content */}
        <div className="relative z-10 p-12 max-w-lg text-center flex flex-col h-full justify-center">

          {/* Main Feature Card (Carousel) */}
          <div className="glass-card p-8 rounded-3xl border-primary/20 bg-background/5 backdrop-blur-xl mb-12 transform hover:scale-105 transition-transform duration-500 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 mb-6 animate-bounce" style={{ animationDuration: '3s' }}>
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4 font-heading tracking-tight">Crystal Clear</h2>
              <p className="text-white/80 text-lg leading-relaxed mb-6">
                "This platform completely transformed how our remote team collaborates. The video quality is unmatched."
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                  JD
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">John Doe</p>
                  <p className="text-[10px] text-white/60">CTO at TechCorp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof / Stats */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">10k+</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Active Users</p>
            </div>
            <div className="text-center border-l border-white/10 border-r">
              <p className="text-3xl font-bold text-white mb-1">99.9%</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">4.9/5</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Rating</p>
            </div>
          </div>

          {/* Trusted Companies (Mock) */}
          <div className="space-y-4">
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Trusted by industry leaders</p>
            <div className="flex justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Mock Logos */}
              <div className="h-6 w-20 bg-white/20 rounded mix-blend-overlay"></div>
              <div className="h-6 w-20 bg-white/20 rounded mix-blend-overlay"></div>
              <div className="h-6 w-20 bg-white/20 rounded mix-blend-overlay"></div>
              <div className="h-6 w-20 bg-white/20 rounded mix-blend-overlay"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative overflow-hidden">
        {/* Mobile-only background elements */}
        <div className="lg:hidden absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
        <div className="lg:hidden absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-secondary/20 rounded-full blur-[80px]"></div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-foreground font-heading mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'login'
                ? 'Enter your credentials to access your workspace.'
                : 'Join us today and start your journey.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              {mode === 'register' && (
                <>
                  <div className="animate-slide-up">
                    <div className="relative group">
                      <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="peer w-full px-5 py-4 bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl text-foreground placeholder-transparent focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 shadow-sm"
                        placeholder="Display Name"
                      />
                      <label
                        htmlFor="displayName"
                        className="absolute left-5 -top-2.5 bg-background px-2 text-xs font-semibold text-primary transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background rounded"
                      >
                        Display Name
                      </label>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity duration-300"></div>
                    </div>
                  </div>
                </>
              )}

              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative group">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer w-full px-5 py-4 bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl text-foreground placeholder-transparent focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 shadow-sm"
                    placeholder="Email Address"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-5 -top-2.5 bg-background px-2 text-xs font-semibold text-primary transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background rounded"
                  >
                    Email Address
                  </label>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity duration-300"></div>
                </div>
              </div>

              <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="relative group">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full px-5 py-4 bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl text-foreground placeholder-transparent focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 shadow-sm"
                    placeholder="Password"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-5 -top-2.5 bg-background px-2 text-xs font-semibold text-primary transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background rounded"
                  >
                    Password
                  </label>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity duration-300"></div>
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-xs font-semibold text-primary hover:text-secondary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-fade-in flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </span>
            </button>
          </form>



          <p className="text-center text-sm text-muted-foreground mt-8">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
                setDisplayName('');
              }}
              className="font-bold text-primary hover:text-secondary underline decoration-2 decoration-transparent hover:decoration-current transition-all"
            >
              {mode === 'login' ? 'Sign up for free' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
