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
        : { email: email.trim(), password, displayName: displayName.trim() };

      const response = mode === 'login'
        ? await authApi.login(requestData as LoginRequest)
        : await authApi.register(requestData as RegisterRequest);

      setAuth(response.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="space-y-4">
              {mode === 'register' && (
                <div className="animate-slide-up">
                  <label className="text-sm font-medium text-foreground/80 block mb-1.5 ml-1">Display Name</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-5 py-3.5 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                      placeholder="e.g. Sarah Connor"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-300"></div>
                  </div>
                </div>
              )}

              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <label className="text-sm font-medium text-foreground/80 block mb-1.5 ml-1">Email Address</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3.5 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-sm font-medium text-foreground/80 block">Password</label>
                  {mode === 'login' && (
                    <a href="#" className="text-xs font-semibold text-primary hover:text-secondary transition-colors">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3.5 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                    placeholder="••••••••"
                  />
                </div>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center px-4 py-2.5 bg-muted/30 border border-input rounded-xl hover:bg-muted hover:border-foreground/20 transition-all duration-200">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              <span className="text-sm font-semibold text-foreground">Google</span>
            </button>
            <button className="flex items-center justify-center px-4 py-2.5 bg-muted/30 border border-input rounded-xl hover:bg-muted hover:border-foreground/20 transition-all duration-200">
              <svg className="w-5 h-5 mr-2 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-foreground">GitHub</span>
            </button>
          </div>

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
