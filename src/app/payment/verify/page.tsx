
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function VerificationComponent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'cancelled'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const transactionId = searchParams.get('transactionId');
    const paymentStatus = searchParams.get('status');

    if (!transactionId) {
      setStatus('failed');
      setMessage('Invalid payment response. Missing transaction ID.');
      return;
    }
    
    if (paymentStatus === 'cancel') {
        setStatus('cancelled');
        setMessage('Payment was cancelled by the user.');
        return;
    }

    if (paymentStatus === 'fail') {
        setStatus('failed');
        setMessage('Payment failed. Please try again.');
        return;
    }

    fetch(`/api/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: transactionId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'COMPLETED') {
          setStatus('success');
          setMessage(`Payment successful! ${data.amount || ''} TK has been added to your wallet.`);
        } else {
          setStatus('failed');
          setMessage(`Payment verification failed. Status: ${data.status || 'UNKNOWN'}`);
        }
      })
      .catch((err) => {
        setStatus('failed');
        setMessage('An error occurred during verification. Please contact support.');
        console.error("Verification fetch error:", err);
      });

  }, [searchParams]);

  const renderContent = () => {
    switch(status) {
        case 'verifying':
            return {
                icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
                title: 'Verifying Payment',
                description: 'Please wait while we confirm your transaction...'
            };
        case 'success':
            return {
                icon: <CheckCircle className="h-12 w-12 text-green-500" />,
                title: 'Payment Successful',
                description: message
            };
        case 'failed':
            return {
                icon: <XCircle className="h-12 w-12 text-destructive" />,
                title: 'Payment Failed',
                description: message
            };
        case 'cancelled':
             return {
                icon: <AlertCircle className="h-12 w-12 text-amber-500" />,
                title: 'Payment Cancelled',
                description: message
            };
        default:
            return {
                icon: <XCircle className="h-12 w-12 text-destructive" />,
                title: 'Error',
                description: 'An unknown error occurred.'
            };
    }
  }

  const { icon, title, description } = renderContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-fit mb-4">{icon}</div>
          <CardTitle className="capitalize">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">{description}</p>
          {status !== 'verifying' && (
            <Button asChild>
              <Link href="/wallet">Back to Wallet</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function VerifyPaymentPage() {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <VerificationComponent />
      </Suspense>
    )
}
