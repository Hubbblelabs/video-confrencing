"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { authApi } from '../services/api.service';
import { useRouter } from 'next/navigation';

export function VerifyEmailPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                setStatus('error');
                setMessage('Missing verification token.');
                return;
            }

            try {
                await authApi.verifyEmail(token);
                setStatus('success');
                setMessage('Your email has been verified successfully.');
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'Failed to verify email. Token may be expired.');
            }
        };

        verify();
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#141417] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl text-center"
            >
                <div className="mb-8 relative">
                    {status === 'loading' && (
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border border-destructive/20">
                            <XCircle className="w-12 h-12 text-destructive" />
                        </div>
                    )}
                </div>

                <h1 className="text-3xl font-black mb-4">
                    {status === 'loading' && 'Verifying...'}
                    {status === 'success' && 'Email Verified!'}
                    {status === 'error' && 'Verification Failed'}
                </h1>

                <p className="text-muted-foreground mb-10 leading-relaxed italic">
                    {message || 'Synchronizing your account with our secure protocols...'}
                </p>

                <button
                    disabled={status === 'loading'}
                    onClick={() => router.push('/')}
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
                >
                    {status === 'loading' ? 'PLEASE WAIT' : 'BACK TO LOGIN'}
                </button>
            </motion.div>
        </div>
    );
}
