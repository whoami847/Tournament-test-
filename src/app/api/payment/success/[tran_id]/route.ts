import { NextRequest, NextResponse } from 'next/server';
import { firestore as db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { tran_id: string } }) {
  const tran_id = params.tran_id;
  
  if (!tran_id) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  const orderRef = doc(db, 'orders', tran_id);
  
  try {
    await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found.');
      }
      
      const orderData = orderDoc.data();
      if (orderData.status !== 'pending') {
        // Already processed, just redirect
        return; 
      }
      
      const userRef = doc(db, 'users', orderData.userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found.');
      }
      
      const currentBalance = userDoc.data().balance || 0;
      const newBalance = currentBalance + orderData.amount;
      
      transaction.update(userRef, { balance: newBalance });
      transaction.update(orderRef, { status: 'success' });
      
      // Also create a record in the transactions collection for history
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, {
        userId: orderData.userId,
        amount: orderData.amount,
        type: 'deposit',
        description: `Deposit via RupantorPay`,
        date: serverTimestamp(),
        status: 'success',
        gatewayTransactionId: tran_id,
      });
    });

  } catch (error) {
    console.error(`Failed to process success for tran_id ${tran_id}:`, error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail?error=processing_failed`);
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?tran_id=${tran_id}`);
}
