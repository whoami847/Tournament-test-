
'use client';

import { AutomatedWalletTopUpForm } from '@/components/automated-wallet-top-up-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TopUpPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="relative mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-4 top-1/2 -translate-y-1/2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-center text-2xl font-bold">Top-up Wallet</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Automated Top-up</CardTitle>
          <CardDescription>
            Enter the amount you want to add to your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomatedWalletTopUpForm />
        </CardContent>
      </Card>
    </div>
  );
}
