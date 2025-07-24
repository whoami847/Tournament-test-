
import { NextRequest, NextResponse } from 'next/server';
import { firestore as db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const RUPANTORPAY_API_URL = 'https://payment.rupantorpay.com/api/payment/checkout';

export async function POST(req: NextRequest) {
  try {
    const { amount, userId } = await req.json();

    if (!userId || !amount || amount < 10) {
      return NextResponse.json({ message: 'Valid user ID and amount (>=10) are required' }, { status: 400 });
    }

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const tran_id = `${userId.substring(0, 5)}-${Date.now()}`;

    const payload = {
      store_id: 'your_store_id', // Replace with your actual Store ID
      store_passwd: 'your_password', // Replace with your actual Store Password
      total_amount: amount,
      currency: 'BDT',
      tran_id,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/success/${tran_id}`,
      fail_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/fail/${tran_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/cancel/${tran_id}`,
      cus_name: userDoc.data().name || 'N/A',
      cus_email: userDoc.data().email || 'no-email@example.com',
      // Optional, but recommended fields
      cus_add1: 'N/A',
      cus_city: 'N/A',
      cus_country: 'Bangladesh',
      cus_phone: 'N/A',
    };

    const response = await fetch(RUPANTORPAY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status !== 'success' || !data.data) {
        return NextResponse.json({ message: data.message || 'Failed to initiate payment with RupantorPay' }, { status: 500 });
    }

    await setDoc(doc(db, 'orders', tran_id), {
      userId,
      amount,
      tran_id,
      status: 'pending',
      gateway: 'rupantorpay',
      createdAt: serverTimestamp(),
      gatewayResponse: data,
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
