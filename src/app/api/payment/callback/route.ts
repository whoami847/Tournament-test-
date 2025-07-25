
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getEnabledGateway } from '@/lib/gateways';

const RUPANTORPAY_VERIFY_URL = 'https://payment.rupantorpay.com/api/payment/verify-payment';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get('transactionId');
  const status = searchParams.get('status');

  if (!transactionId) {
    console.error("Callback Error: transactionId missing from URL.");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  const orderRef = doc(firestore, 'orders', transactionId);
  
  // Handle immediate fail or cancel from RupantorPay redirect
  if (status && (status.toLowerCase() === 'failed' || status.toLowerCase() === 'cancelled')) {
      await updateDoc(orderRef, { status: status.toUpperCase() }).catch(err => console.error("Failed to update order status on fail/cancel:", err));
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/${status.toLowerCase() === 'failed' ? 'fail' : 'cancel'}`);
  }

  const orderDoc = await getDoc(orderRef);

  if (!orderDoc.exists()) {
    console.error(`Callback Error: Order with transaction_id ${transactionId} not found.`);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }
  
  if (orderDoc.data().status !== 'PENDING') {
      const finalStatus = orderDoc.data().status.toLowerCase();
      if (finalStatus === 'completed') return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`);
      if (['failed', 'cancelled'].includes(finalStatus)) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/${finalStatus}`);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  // Verify payment with RupantorPay
  const gateway = await getEnabledGateway();
  if (!gateway || !gateway.apiKey) {
    await updateDoc(orderRef, { status: 'FAILED', gatewayResponse: 'Gateway not configured on server.' });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  const verifyPayload = {
    transaction_id: transactionId,
  };

  try {
    const verifyResponse = await fetch(RUPANTORPAY_VERIFY_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-KEY': gateway.apiKey,
      },
      body: JSON.stringify(verifyPayload),
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.status && verifyData.status === 'COMPLETED') {
      await runTransaction(firestore, async (transaction) => {
        const freshOrderDoc = await transaction.get(orderRef);
        if (!freshOrderDoc.exists() || freshOrderDoc.data().status !== 'PENDING') {
            return; 
        }

        const userRef = doc(firestore, 'users', freshOrderDoc.data().userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const newBalance = (userDoc.data().balance || 0) + freshOrderDoc.data().amount;
        transaction.update(userRef, { balance: newBalance });
        transaction.update(orderRef, { status: 'COMPLETED', gatewayResponse: verifyData });

        const newTransactionRef = doc(collection(firestore, 'transactions'));
        transaction.set(newTransactionRef, {
            userId: freshOrderDoc.data().userId,
            amount: freshOrderDoc.data().amount,
            type: 'deposit',
            description: `Deposit via ${gateway.name}`,
            date: serverTimestamp(),
            status: 'COMPLETED',
            gatewayTransactionId: transactionId,
        });

      });

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`);
    } else {
      await updateDoc(orderRef, { status: 'FAILED', gatewayResponse: verifyData });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    await updateDoc(orderRef, { status: 'FAILED', gatewayResponse: { error: (error as Error).message } });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }
}
