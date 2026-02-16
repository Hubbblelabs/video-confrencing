import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { billingApi } from '@/services/billing.service';
import type { Wallet, Transaction } from '@/services/billing.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
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
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

    // Load data when the dialog opens (or component mounts if it were persistent)
    // For now we load on effect if token changes, but ideally we load on open.
    useEffect(() => {
        if (token) loadData();
    }, [token]);


    const handleTopup = async () => {
        if (!token) return;
        try {
            await billingApi.topup(token, amount);
            toast.success(`Successfully added ${amount} credits!`);
            setTopupOpen(false);
            loadData();
        } catch (err) {
            toast.error('Failed to process topup');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">My Wallet</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
                <div className="grid grid-cols-1 md:grid-cols-12 h-[600px]">

                    {/* Sidebar / Left Panel */}
                    <div className="md:col-span-4 bg-muted/30 border-r border-border p-6 flex flex-col gap-6">
                        <DialogHeader className="px-0">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <WalletIcon className="h-5 w-5" />
                                </span>
                                My Wallet
                            </DialogTitle>
                            <DialogDescription>
                                Manage your credits and view transaction history.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 p-6 rounded-2xl bg-gradient-to-br from-primary/90 to-blue-600 text-white shadow-lg shadow-blue-500/20">
                            <div className="text-blue-100 text-sm font-medium mb-1">Available Balance</div>
                            <div className="text-4xl font-bold tracking-tight">
                                {wallet?.balance ?? 0}
                                <span className="text-lg font-medium opacity-60 ml-2">credits</span>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full gap-2 h-auto py-4 text-sm font-medium shadow-lg shadow-primary/20 whitespace-normal">
                                        <Plus className="h-4 w-4 shrink-0" />
                                        <span>Topup Credits</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Credits</DialogTitle>
                                        <DialogDescription>
                                            Select an amount to add to your wallet.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount (Credits)</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[50, 100, 500].map((val) => (
                                                <Button
                                                    key={val}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAmount(val)}
                                                >
                                                    +{val}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setTopupOpen(false)}>Cancel</Button>
                                        <Button onClick={handleTopup}>Add Credits Now</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Main Content / Right Panel */}
                    <div className="md:col-span-8 flex flex-col h-full bg-background/50 backdrop-blur-sm">
                        <div className="p-6 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10">
                            <h3 className="font-semibold flex items-center gap-2">
                                <History className="h-4 w-4 text-muted-foreground" />
                                Recent Transactions
                            </h3>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Activity</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                                        </TableRow>
                                    ) : transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center text-muted-foreground border-none">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-3 rounded-full bg-muted">
                                                        <History className="h-6 w-6 opacity-30" />
                                                    </div>
                                                    <div>No transactions found</div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.map((t) => (
                                            <TableRow key={t.id} className="group hover:bg-muted/50 transition-colors border-border/50">
                                                <TableCell>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-0.5 p-1.5 rounded-full ${t.type === 'topup' ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'}`}>
                                                            {t.type === 'topup' ? (
                                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ArrowDownLeft className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">
                                                                {t.type === 'debit' ? (t.meeting?.title || 'Session Join') : 'Wallet Topup'}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className="text-[10px] h-4 font-normal px-1.5 text-muted-foreground">
                                                                    {t.type}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground capitalize">{t.status}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatDate(t.createdAt)}
                                                </TableCell>
                                                <TableCell className={`text-right font-medium ${t.type === 'topup' ? 'text-green-600' : 'text-foreground'}`}>
                                                    {t.type === 'topup' ? '+' : '-'}{t.amount}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
