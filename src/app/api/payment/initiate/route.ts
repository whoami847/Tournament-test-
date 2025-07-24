
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getEnabledGateway } from '@/lib/gateways';

const RUPANTORPAY_CHECKOUT_URL = 'https://payment.rupantorpay.com/api/payment/checkout';

export async function POST(req: NextRequest) {
  try {
    const { amount, userId } = await req.json();

    if (!userId || !amount || amount < 10) {
      return NextResponse.json(
        { message: 'Valid user ID and amount (>=10) are required' },
        { status: 400 }
      );
    }

    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const gateway = await getEnabledGateway();
    if (!gateway || !gateway.storePassword) {
      return NextResponse.json(
        { message: 'Payment gateway is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const tran_id = `${userId.substring(0, 5)}-${Date.now()}`;

    const payload = {
      store_id: 'your_store_id', // Replace with your actual store ID from settings
      store_passwd: gateway.storePassword,
      total_amount: amount,
      currency: 'BDT',
      tran_id,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback?tran_id=${tran_id}&status=success`,
      fail_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback?tran_id=${tran_id}&status=fail`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback?tran_id=${tran_id}&status=cancel`,
      cus_name: userDoc.data().name || 'N/A',
      cus_email: userDoc.data().email || 'no-email@example.com',
      cus_phone: 'N/A',
    };

    const response = await fetch(RUPANTORPAY_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status !== 'success' || !data.data) {
      return NextResponse.json(
        { message: data.message || 'Failed to initiate payment with RupantorPay' },
        { status: 500 }
      );
    }

    await setDoc(doc(firestore, 'orders', tran_id), {
      userId,
      amount,
      tran_id,
      status: 'PENDING',
      gateway: gateway.name,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ payment_url: data.data });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
