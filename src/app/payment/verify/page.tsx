
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

function VerificationComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'not_found'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      const tran_id = searchParams.get('mer_txnid');
      const pay_status = searchParams.get('pay_status');
      const amount_paid = searchParams.get('amount');

      if (!tran_id || !pay_status) {
        setStatus('failed');
        setMessage('Invalid payment response. Missing transaction details.');
        return;
      }
      
      const orderRef = doc(firestore, 'orders', tran_id);
      
      try {
        await runTransaction(firestore, async (transaction) => {
          const orderDoc = await transaction.get(orderRef);
          
          if (!orderDoc.exists()) {
            throw new Error('Order not found in our system.');
          }

          const order = orderDoc.data() as Order;
          if (order.status === 'success') {
             setStatus('success');
             setMessage('This payment has already been successfully processed.');
             return;
          }

          if (pay_status === 'Successful') {
            const userRef = doc(firestore, 'users', order.userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
              throw new Error('User account not found.');
            }
            
            const userData = userDoc.data() as PlayerProfile;
            const newBalance = (userData.balance || 0) + order.amount;

            transaction.update(userRef, { balance: newBalance });
            transaction.update(orderRef, { status: 'success' });
            
            setStatus('success');
            setMessage(`Successfully added ${order.amount} TK to your wallet.`);
          } else {
            transaction.update(orderRef, { status: 'failed' });
            setStatus('failed');
            setMessage(`Payment was not successful. Status: ${pay_status}`);
          }
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

