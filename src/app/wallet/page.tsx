
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
    return (
        <div className={cn("relative h-60 flex items-center justify-center group")}>
            {/* Bottom Card */}
            <div
                className={cn(
                    "absolute w-full max-w-[320px] h-52 rounded-2xl bg-gradient-to-br from-[#4A2E0C] to-[#8C5A2D] p-6 text-white shadow-lg transition-all duration-500 ease-out",
                    'translate-y-6 rotate-[-6deg] group-hover:-translate-y-2 group-hover:rotate-[-8deg]'
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
                    'translate-y-3 rotate-[-3deg] group-hover:-translate-y-1 group-hover:rotate-[-4deg]'
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
                    'group-hover:scale-105 group-hover:-translate-y-6'
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
                     <Button disabled className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs h-8 px-3 backdrop-blur-sm rounded-md">
                        <ArrowUp className="mr-2 h-4 w-4" /> Add Money
                    </Button>
                     <Button disabled variant="secondary" className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs h-8 px-3 backdrop-blur-sm rounded-md">
                        <ArrowDown className="mr-2 h-4 w-4" /> Withdraw
                    </Button>
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
