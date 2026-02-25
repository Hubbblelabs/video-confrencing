"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { authApi } from '../services/api.service';
import { useRouter } from 'next/navigation';

export function ResetPasswordPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get('token');
        if (t) setToken(t);
        else setError('Missing or invalid reset token.');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authApi.resetPassword({ token, newPassword });
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6 font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-[#141417]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    {!success ? (
                        <div className="space-y-8">
                            <div className="space-y-2 text-center">
                                <h1 className="text-3xl font-black tracking-tight">Reset <span className="text-primary italic">Password</span></h1>
                                <p className="text-muted-foreground text-sm">Enter your new secure password below.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <input
                                                required
                                                type="password"
                                                minLength={8}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Confirm Password</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <input
                                                required
                                                type="password"
                                                minLength={8}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-3"
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    disabled={loading || !token}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-2xl font-black tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'UPDATE PASSWORD'
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-8 py-4"
                        >
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black">Vault <span className="text-green-500 italic">Updated</span></h2>
                                <p className="text-muted-foreground text-sm">Your password has been reset successfully. You can now log in.</p>
                            </div>
                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black transition-all"
                            >
                                GO TO LOGIN
                            </button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
