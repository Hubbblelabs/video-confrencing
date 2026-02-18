import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { billingApi } from '@/services/billing.service';
import type { Wallet, Transaction } from '@/services/billing.service';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Wallet as WalletIcon,
    ArrowUpRight,
    ArrowDownLeft,
    Plus,
    History,
    Loader2,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StudentWalletProps {
    trigger?: React.ReactNode;
}

export function StudentWallet({ trigger }: StudentWalletProps) {
    const token = useAuthStore((s) => s.token);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [topupOpen, setTopupOpen] = useState(false);
    const [amount, setAmount] = useState(100);
    const [processing, setProcessing] = useState(false);

    const loadData = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [w, t] = await Promise.all([
                billingApi.getWallet(token),
                billingApi.getTransactions(token)
            ]);
            setWallet(w);
            setTransactions(t);
        } catch (err) {
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) loadData();
    }, [token]);

    const handleTopup = async () => {
        if (!token) return;
        setProcessing(true);
        try {
            // Simulate network delay for UX
            await new Promise(resolve => setTimeout(resolve, 800));
            await billingApi.topup(token, amount);
            toast.success(`Successfully added ${amount} credits!`);
            setTopupOpen(false);
            loadData();
        } catch (err) {
            toast.error('Failed to process topup');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">My Wallet</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background border-border/50 shadow-2xl rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-12 h-[600px]">

                    {/* Left Panel: Wallet Overview */}
                    <div className="md:col-span-5 bg-muted/20 border-r border-border/50 p-6 flex flex-col gap-8 relative">
                        <DialogHeader className="px-0 space-y-1">
                            <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                                    <WalletIcon className="h-4 w-4" />
                                </div>
                                My Wallet
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground/80 ml-1">
                                Manage your balance & credits
                            </DialogDescription>
                        </DialogHeader>

                        {/* Balance Card - Fintech Widget Style */}
                        <div className="relative group perspective-mid">
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/5 shadow-xl shadow-slate-900/20 p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20">
                                {/* Ambient Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10 rounded-full pointer-events-none mix-blend-screen" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 blur-[40px] -ml-10 -mb-10 rounded-full pointer-events-none" />

                                <div className="relative z-10 flex flex-col justify-between h-32">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Available Balance</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold text-white tracking-tight tabular-nums">
                                                    {wallet?.balance ?? 0}
                                                </span>
                                                {/* <span className="text-sm font-medium text-white/40"></span> */}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
                                            <Sparkles className="h-4 w-4 text-yellow-500/80" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-medium text-white/40 bg-white/5 w-fit px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active Account
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-4">
                            <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 transition-all hover:-translate-y-0.5" size="lg">
                                        <Plus className="h-5 w-5 mr-2" />
                                        Topup Credits
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px]">
                                    <DialogHeader>
                                        <DialogTitle>Add Credits</DialogTitle>
                                        <DialogDescription>
                                            Choose a package to top up your wallet.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-4">
                                        <div className="grid grid-cols-3 gap-3">
                                            {[50, 100, 500].map((val) => (
                                                <div
                                                    key={val}
                                                    onClick={() => setAmount(val)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-4 transition-all text-center space-y-1 relative group hover:border-primary/50 hover:bg-primary/5",
                                                        amount === val ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border bg-background"
                                                    )}
                                                >
                                                    {amount === val && (
                                                        <div className="absolute -top-2 -right-2 bg-background rounded-full">
                                                            <CheckCircle2 className="w-5 h-5 text-primary fill-background" />
                                                        </div>
                                                    )}
                                                    <div className="text-xl font-bold tracking-tight">{val}</div>
                                                    <div className="text-[10px] text-muted-foreground font-medium">Credits</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="custom-amount" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Amount</Label>
                                            <div className="relative">
                                                <Input
                                                    id="custom-amount"
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(Number(e.target.value))}
                                                    className="pl-9 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 focus:ring-0 rounded-lg text-lg font-medium"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">CR</span>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleTopup} disabled={processing} className="w-full h-11 rounded-lg">
                                            {processing ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                `Pay $${(amount * 0.1).toFixed(2)}`
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <p className="text-[11px] text-center text-muted-foreground/60 font-medium">
                                Secure payments processed via Stripe
                            </p>
                        </div>
                    </div>

                    {/* Right Panel: Recent Transactions Feed */}
                    <div className="md:col-span-7 flex flex-col h-full bg-background/50 backdrop-blur-md">
                        <div className="p-6 border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    Recent Activity
                                </h3>
                                <p className="text-xs text-muted-foreground">Your latest transaction history</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <History className="h-4 w-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-1">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-48 space-y-3 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                                        <span className="text-sm font-medium opacity-60">Loading transactions...</span>
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 space-y-4 text-muted-foreground/50">
                                        <div className="p-4 rounded-full bg-muted/50 ring-1 ring-border/50">
                                            <History className="h-8 w-8 opacity-40" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-sm font-medium text-foreground/80">No recent activity</p>
                                            <p className="text-xs">Transactions will appear here once you start.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {transactions.map((t, index) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                key={t.id}
                                                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border/30"
                                            >
                                                {/* Icon Badge */}
                                                <div className={cn(
                                                    "shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                                                    t.type === 'topup'
                                                        ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20"
                                                        : "bg-orange-500/5 border-orange-500/10 text-orange-600 group-hover:bg-orange-500/10 group-hover:border-orange-500/20"
                                                )}>
                                                    {t.type === 'topup' ? (
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    ) : (
                                                        <ArrowDownLeft className="h-4 w-4" />
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <h4 className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                                                            {t.type === 'debit' ? (t.meeting?.title || 'Session Join') : 'Wallet Topup'}
                                                        </h4>
                                                        <span className={cn(
                                                            "text-sm font-bold tabular-nums",
                                                            t.type === 'topup' ? "text-emerald-600" : "text-foreground"
                                                        )}>
                                                            {t.type === 'topup' ? '+' : '-'}{t.amount}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <span className="capitalize">{t.type}</span>
                                                            <span className="w-1 h-1 rounded-full bg-border" />
                                                            <Badge variant={t.status === 'success' ? 'secondary' : 'outline'} className="h-4 px-1.5 text-[10px] uppercase tracking-wide font-medium bg-secondary/50 border-transparent text-foreground/70">
                                                                {t.status}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-muted-foreground/60 font-medium whitespace-nowrap">
                                                            {formatDate(t.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
