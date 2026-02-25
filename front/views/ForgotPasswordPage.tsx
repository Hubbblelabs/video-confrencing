"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { authApi } from '../services/api.service';

export function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authApi.forgotPassword(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
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
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </button>

                <div className="bg-[#141417]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2 text-center">
                                    <h1 className="text-3xl font-black tracking-tight">Forgot <span className="text-primary italic">Password?</span></h1>
                                    <p className="text-muted-foreground text-sm">No worries, we'll send you reset instructions.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <input
                                                required
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold"
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                    <button
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-2xl font-black tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                SEND RESET LINK
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-8 py-4"
                            >
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black">Link <span className="text-green-500 italic">Dispatched</span></h2>
                                    <p className="text-muted-foreground text-sm">Check your inbox for instructions to reset your password.</p>
                                </div>
                                <button
                                    onClick={onBack}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                                >
                                    Return to Login
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
