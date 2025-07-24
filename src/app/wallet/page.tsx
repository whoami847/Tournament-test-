'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Banknote, Gamepad2, Gift, ArrowUp, ArrowDown, Landmark, CreditCard, Wallet, Globe, ChevronDown, ArrowLeft, ArrowRight, ChevronsRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfileStream } from "@/lib/users-service";
import type { PlayerProfile, Transaction, WithdrawMethod } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactionsStream } from "@/lib/transactions-service";
import { createWithdrawalRequest } from '@/lib/withdraw-requests-service';
import { getActiveWithdrawMethods } from '@/lib/withdraw-methods-service';
import { format } from 'date-fns';


// --- FORM COMPONENTS ---

function AddMoneyForm({ profile, onSubmitting }: { profile: PlayerProfile | null, onSubmitting: (isSubmitting: boolean) => void }) {
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const quickAmounts = [100, 200, 500, 1000];

    const handleQuickAmountClick = (value: number) => {
        setAmount(value.toString());
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!profile?.id) {
            setError("User is not authenticated. Please log in again.");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 10) {
            setError("Amount is required and must be at least 10.");
            return;
        }

        onSubmitting(true);

        try {
            const response = await fetch('/api/payment/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: numAmount, userId: profile.id }),
            });

            const data = await response.json();

            if (response.ok && data.status === 'success' && data.data) {
                // Redirect to payment gateway
                window.location.href = data.data;
            } else {
                setError(data.message || 'Failed to initiate payment. Please try again.');
                toast({
                    title: 'Payment Error',
                    description: data.message || 'An unexpected error occurred.',
                    variant: 'destructive',
                });
                onSubmitting(false);
            }
        } catch (err) {
            setError('Could not connect to the payment server. Please check your connection.');
            toast({
                title: 'Network Error',
                description: 'Could not connect to the payment server.',
                variant: 'destructive',
            });
            onSubmitting(false);
        }
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-semibold text-muted-foreground">
                    TK
                </span>
                <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="0.00"
                    required
                    min="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-24 w-full rounded-xl border-2 border-border bg-muted/50 pl-16 pr-6 text-center text-6xl font-bold tracking-tighter focus:bg-background"
                />
            </div>
            
            <div>
                <p className="mb-3 text-center text-sm font-medium text-muted-foreground">Or choose a quick amount</p>
                <div className="grid grid-cols-4 gap-3">
                    {quickAmounts.map((value) => (
                        <Button
                            key={value}
                            type="button"
                            variant={amount === value.toString() ? "default" : "outline"}
                            onClick={() => handleQuickAmountClick(value)}
                            className="h-12 rounded-full text-base font-semibold"
                        >
                            {value}
                        </Button>
                    ))}
                </div>
            </div>
            
            <div className="pt-4">
                 <Button type="submit" size="lg" className="w-full">
                    Proceed to Pay
                </Button>
            </div>
        </form>
    );
}

function WithdrawDialogContent({ closeDialog, profile }: { closeDialog: () => void, profile: PlayerProfile | null }) {
    const { toast } = useToast();
    const [methods, setMethods] = useState<WithdrawMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | null>(null);
    const [amount, setAmount] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    useEffect(() => {
        const fetchMethods = async () => {
            const activeMethods = await getActiveWithdrawMethods();
            setMethods(activeMethods);
            setLoading(false);
        };
        fetchMethods();
    }, []);

    const handleWithdraw = async () => {
        if (!profile || !selectedMethod || !amount || !accountNumber) {
            toast({ title: "Missing Information", description: "Please select a method, enter an amount, and provide your account number.", variant: "destructive" });
            return;
        }

        const withdrawalAmount = parseFloat(amount);
        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            toast({ title: "Invalid Amount", variant: "destructive" });
            return;
        }

        if (withdrawalAmount < selectedMethod.minAmount || withdrawalAmount > selectedMethod.maxAmount) {
             toast({ title: "Amount Out of Range", description: `Please enter an amount between ${selectedMethod.minAmount} and ${selectedMethod.maxAmount}.`, variant: "destructive" });
             return;
        }

        setIsWithdrawing(true);
        const result = await createWithdrawalRequest(profile, withdrawalAmount, selectedMethod.name, accountNumber);

        if (result.success) {
            toast({
                title: "Withdrawal Request Submitted",
                description: `Your request for ${withdrawalAmount.toFixed(2)} TK is pending approval.`,
            });
            closeDialog();
        } else {
            toast({ title: "Request Failed", description: result.error, variant: "destructive" });
        }
        setIsWithdrawing(false);
    }
    
    if (loading) {
        return (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Loading Withdrawal Methods</DialogTitle>
                    <DialogDescription>
                        Please wait while we fetch the available options.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DialogContent>
        )
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>Select a method and enter the amount you wish to withdraw.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Withdrawal Method</Label>
                    <RadioGroup onValueChange={(value) => setSelectedMethod(methods.find(m => m.id === value) || null)}>
                        {methods.length > 0 ? methods.map(method => (
                            <div key={method.id}>
                                <RadioGroupItem value={method.id} id={method.id} className="sr-only peer" />
                                <Label htmlFor={method.id} className="flex flex-col rounded-lg border-2 border-muted bg-transparent p-4 cursor-pointer peer-data-[state=checked]:border-primary">
                                    <span className="font-semibold">{method.name}</span>
                                    <span className="text-sm text-muted-foreground">{method.receiverInfo}</span>
                                </Label>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No active withdrawal methods available. Please check back later.</p>
                        )}
                    </RadioGroup>
                </div>
                {selectedMethod && (
                    <div className="space-y-2">
                        <Label htmlFor="account-number">Your {selectedMethod.name} Number</Label>
                        <Input id="account-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g., 01234567890" />
                    </div>
                )}
                 <div className="space-y-2">
                    <Label htmlFor="amount">Amount (TK)</Label>
                    <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={!selectedMethod} />
                    {selectedMethod && <p className="text-xs text-muted-foreground">Min: {selectedMethod.minAmount}, Max: {selectedMethod.maxAmount}, Fee: {selectedMethod.feePercentage}%</p>}
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleWithdraw} disabled={isWithdrawing || !selectedMethod || !amount || !accountNumber}>
                    {isWithdrawing ? "Submitting..." : "Submit Request"}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

// --- SUB-COMPONENTS ---

const WalletHeader = ({ profile }: { profile: PlayerProfile | null }) => (
    <header className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={profile?.avatar || ''} alt={profile?.name || 'User'} data-ai-hint="wizard character" />
                <AvatarFallback>{profile?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-xs text-muted-foreground">Welcome back,</p>
                <h1 className="font-bold">{profile?.name || 'Player'}</h1>
            </div>
        </div>
    </header>
);

const CardStack = ({ balance, profile }: { balance: number, profile: PlayerProfile | null }) => {
    const [isFanned, setIsFanned] = useState(false);
    const [isWithdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
    const [isAddMoneySubmitting, setAddMoneySubmitting] = useState(false);

    const handleAddMoneyOpenChange = (open: boolean) => {
        if (!open) {
            setIsFanned(false);
            setAddMoneySubmitting(false);
        }
    };
    
    const handleWithdrawOpenChange = (open: boolean) => {
        if (!open) {
            setIsFanned(false);
        }
        setWithdrawDialogOpen(open);
    };

    return (
        <div className={cn("relative h-60 flex items-center justify-center", !isFanned && "group")}>
            {/* Bottom Card */}
            <div
                className={cn(
                    "absolute w-full max-w-[320px] h-52 rounded-2xl bg-gradient-to-br from-[#4A2E0C] to-[#8C5A2D] p-6 text-white shadow-lg transition-all duration-500 ease-out",
                    isFanned 
                        ? 'transform -translate-y-20 -translate-x-24 rotate-[-15deg]' 
                        : 'translate-y-6 rotate-[-6deg] group-hover:-translate-y-2 group-hover:rotate-[-8deg]'
                )}
                style={{ zIndex: 10 }}
            >
                <div className="flex justify-between items-start">
                    <p className="font-bold tracking-wider">{profile?.name || 'Player'}</p>
                    <p className="font-bold text-lg italic">Game Card</p>
                </div>
            </div>
             {/* Middle Card */}
            <div
                className={cn(
                    "absolute w-full max-w-[320px] h-52 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg transition-all duration-500 ease-out",
                    isFanned
                        ? 'transform -translate-y-20 translate-x-24 rotate-[15deg]'
                        : 'translate-y-3 rotate-[-3deg] group-hover:-translate-y-1 group-hover:rotate-[-4deg]'
                )}
                style={{ zIndex: 20 }}
            >
                 <div className="flex justify-between items-start">
                    <p className="font-bold tracking-wider">{profile?.name || 'Player'}</p>
                    <p className="font-bold text-lg italic">Game Card</p>
                </div>
            </div>
             {/* Top Card */}
            <div
                className={cn(
                    "absolute w-full max-w-[320px] h-52 rounded-2xl bg-black p-6 text-white shadow-2xl flex flex-col justify-between transition-all duration-500 ease-out",
                    isFanned
                        ? 'transform translate-y-20 rotate-0'
                        : 'group-hover:scale-105 group-hover:-translate-y-6'
                )}
                style={{ zIndex: 30 }}
            >
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs uppercase text-gray-400">Card Holder Name</p>
                        <p className="font-medium tracking-wider">{profile?.name || 'Player'}</p>
                    </div>
                    <p className="font-bold text-lg italic">Game Card</p>
                </div>

                <div className="mt-auto mb-2">
                     <div className="flex justify-between items-baseline">
                        <div>
                            <p className="text-xs uppercase text-gray-400">Current Balance</p>
                            <p className="text-3xl font-bold tracking-tight">
                                {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TK
                            </p>
                        </div>
                        {(profile?.pendingBalance ?? 0) > 0 && (
                            <div className="text-right">
                                <p className="text-xs uppercase text-gray-400">Pending</p>
                                <p className="text-lg font-bold tracking-tight text-amber-400">
                                    {profile?.pendingBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TK
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-start gap-4">
                     <Dialog onOpenChange={handleAddMoneyOpenChange}>
                        <DialogTrigger asChild>
                             <Button onClick={() => setIsFanned(true)} className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs h-8 px-3 backdrop-blur-sm rounded-md">
                                <ArrowUp className="mr-2 h-4 w-4" /> Add Money
                            </Button>
                        </DialogTrigger>
                         <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden">
                            <DialogHeader className="p-6 pb-4">
                                <DialogTitle className="text-2xl text-center">Add Money</DialogTitle>
                                <DialogDescription className="text-center">
                                   Select or enter an amount to add to your wallet.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="px-6 pb-6">
                                {isAddMoneySubmitting ? (
                                    <div className="h-64 flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-muted-foreground">Redirecting to payment gateway...</p>
                                    </div>
                                ) : (
                                    <AddMoneyForm profile={profile} onSubmitting={setAddMoneySubmitting} />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                     <Dialog open={isWithdrawDialogOpen} onOpenChange={handleWithdrawOpenChange}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setIsFanned(true); setWithdrawDialogOpen(true); }} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs h-8 px-3 backdrop-blur-sm rounded-md">
                                <ArrowDown className="mr-2 h-4 w-4" /> Withdraw
                            </Button>
                        </DialogTrigger>
                        {isWithdrawDialogOpen && <WithdrawDialogContent profile={profile} closeDialog={() => handleWithdrawOpenChange(false)} />}
                    </Dialog>
                </div>
            </div>
        </div>
    );
}

const TransactionList = ({ transactions }: { transactions: Transaction[] }) => {
    const transactionIcons: Record<string, React.ReactNode> = {
        deposit: <div className="p-3 bg-green-500/10 rounded-full"><ArrowUp className="h-5 w-5 text-green-400" /></div>,
        withdrawal: <div className="p-3 bg-red-500/10 rounded-full"><ArrowDown className="h-5 w-5 text-red-400" /></div>,
        prize: <div className="p-3 bg-yellow-500/10 rounded-full"><Gift className="h-5 w-5 text-yellow-400" /></div>,
        fee: <div className="p-3 bg-gray-500/10 rounded-full"><Gamepad2 className="h-5 w-5 text-gray-400" /></div>,
    };

    return (
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Recent Transactions</h2>
            </div>
            <div className="space-y-3">
                {transactions.length > 0 ? (
                    transactions.map((tx) => (
                    <Card key={tx.id} className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardContent className="p-3 flex items-center gap-4">
                            {transactionIcons[tx.type] || transactionIcons['fee']}
                            <div className="flex-grow">
                                <p className="font-semibold">{tx.description}</p>
                                <p className="text-sm text-muted-foreground">{format(new Date(tx.date), "PPP, p")}</p>
                            </div>
                            <p className={cn(
                                "font-bold text-base",
                                tx.amount > 0 ? "text-green-400" : "text-foreground"
                            )}>
                                {tx.amount > 0 ? `+` : ``}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TK
                            </p>
                        </CardContent>
                    </Card>
                    ))
                ) : (
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            You have no recent transactions.
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    );
};

export default function WalletPage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            const unsubscribeProfile = getUserProfileStream(user.uid, (data) => {
                setProfile(data);
                setLoading(false);
            });
            const unsubscribeTransactions = getTransactionsStream(user.uid, (data) => {
                setTransactions(data);
            });

            return () => {
                unsubscribeProfile();
                unsubscribeTransactions();
            }
        } else if (!user) {
            setLoading(false);
        }
    }, [user]);

    const balance = profile?.balance ?? 0;

    if (loading) {
        return (
             <div className="bg-gradient-to-b from-amber-900/10 via-background to-background min-h-screen text-foreground pb-24 flex flex-col">
                <header className="container mx-auto flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                </header>
                <main className="container mx-auto px-4 mt-4 space-y-8 flex-grow">
                    <div className="relative h-60 flex items-center justify-center">
                        <Skeleton className="absolute w-full max-w-[320px] h-52 rounded-2xl" />
                    </div>
                    <div className="space-y-4">
                         <Skeleton className="h-6 w-32 mb-4" />
                         <Skeleton className="h-20 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-b from-amber-900/10 via-background to-background min-h-screen text-foreground pb-24">
            <WalletHeader profile={profile} />
            <main className="container mx-auto px-4 mt-4 space-y-8">
                <CardStack balance={balance} profile={profile} />
                <TransactionList transactions={transactions} />
            </main>
        </div>
    );
}
