
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getEnabledGateway } from '@/lib/gateways';

const RUPANTORPAY_VERIFY_URL = 'https://payment.rupantorpay.com/api/payment/verify-payment';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tran_id = searchParams.get('tran_id');
  const status = searchParams.get('status');

  if (!tran_id) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  const orderRef = doc(firestore, 'orders', tran_id);
  const orderDoc = await getDoc(orderRef);

  if (!orderDoc.exists() || orderDoc.data().status !== 'PENDING') {
    // If order is already processed, redirect based on its final status
    if (orderDoc.exists()) {
        const finalStatus = orderDoc.data().status.toLowerCase();
        if (finalStatus === 'completed') return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`);
        if (['failed', 'cancelled'].includes(finalStatus)) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/${finalStatus === 'failed' ? 'fail' : 'cancel'}`);
    }
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  if (status === 'fail' || status === 'cancel') {
    await updateDoc(orderRef, { status: status.toUpperCase() });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/${status}`);
  }

  // Verify payment with RupantorPay
  const gateway = await getEnabledGateway();
  if (!gateway || !gateway.storePassword || !gateway.storeId) {
    await updateDoc(orderRef, { status: 'FAILED', gatewayResponse: 'Gateway not configured on server.' });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  const verifyPayload = {
    store_id: gateway.storeId,
    store_passwd: gateway.storePassword,
    tran_id,
  };

  try {
    const verifyResponse = await fetch(RUPANTORPAY_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyPayload),
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.status === 'success' && verifyData.data.status === 'success') {
      await runTransaction(firestore, async (transaction) => {
        const freshOrderDoc = await transaction.get(orderRef);
        if (!freshOrderDoc.exists() || freshOrderDoc.data().status !== 'PENDING') {
            // This transaction has already been processed in another request.
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
            gatewayTransactionId: tran_id,
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
