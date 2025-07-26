
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, runTransaction } from 'firebase/firestore';
import type { Order, PlayerProfile } from '@/types';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { verifyPayment } from '@/lib/rupantorpay-service';

function VerificationComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'not_found'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      const transaction_id = searchParams.get('transactionId');
      const payment_status = searchParams.get('status');

      if (!transaction_id) {
        setStatus('failed');
        setMessage('Invalid payment response. Missing transaction ID.');
        return;
      }
      
      if (payment_status !== 'COMPLETED' && payment_status !== 'success') { // Allow both "COMPLETED" and "success"
        setStatus('failed');
        setMessage(`Payment was not successful. Status: ${payment_status || 'UNKNOWN'}`);
        return;
      }
      
      try {
        const verificationResult = await verifyPayment({ transaction_id });

        if (verificationResult.status !== 'COMPLETED' && verificationResult.status !== 'success') {
            throw new Error(`Payment could not be verified or is not complete. Status: ${verificationResult.status}`);
        }

        const userId = verificationResult.metadata?.user_id;
        if (!userId) {
            throw new Error('User ID not found in payment metadata.');
        }

        await runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, 'users', userId);
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) {
            throw new Error('User account not found.');
          }

          const orderAmount = parseFloat(verificationResult.amount);
          if (isNaN(orderAmount)) {
             throw new Error('Invalid amount received from payment gateway.');
          }
          
          const userData = userDoc.data() as PlayerProfile;
          const newBalance = (userData.balance || 0) + orderAmount;

          transaction.update(userRef, { balance: newBalance });
          
          setStatus('success');
          setMessage(`Successfully added ${orderAmount} TK to your wallet.`);
        });
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.message || 'An unexpected error occurred during verification.');
        console.error("Verification Error:", error);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-fit mb-4">
            {status === 'verifying' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'failed' && <XCircle className="h-12 w-12 text-destructive" />}
            {status === 'not_found' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle className="capitalize">
            {status === 'verifying' ? 'Verifying Payment' : 'Payment Verification'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            {status === 'verifying' ? 'Please wait while we confirm your transaction...' : message}
          </p>
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
