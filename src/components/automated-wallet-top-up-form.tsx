
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AutomatedWalletTopUpForm() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { gateways } = useStore();
  const { toast } = useToast();

  const enabledGateway = gateways.find((g) => g.enabled);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !enabledGateway) return;

    setLoading(true);

    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), userId: user.uid }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.payment_url;
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to initiate payment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!enabledGateway) {
    return <p className="text-muted-foreground">No automated payment gateways are currently enabled.</p>;
  }

  return (
    <form onSubmit={handlePayment} className="space-y-4">
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          required
          min="10"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !amount}>
        {loading ? <Loader2 className="animate-spin" /> : 'Proceed to Payment'}
      </Button>
    </form>
  );
}
