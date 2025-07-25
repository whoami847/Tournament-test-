
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getEnabledGateway } from '@/lib/gateways';
import { headers } from 'next/headers';

const RUPANTORPAY_CHECKOUT_URL = 'https://payment.rupantorpay.com/api/payment/checkout';

export async function POST(req: NextRequest) {
  try {
    const { amount, userId, name, email } = await req.json();
    const headerList = headers();
    const clientHost = headerList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

    if (!userId || !amount || amount < 10) {
      return NextResponse.json(
        { message: 'Valid user ID and amount (>=10) are required' },
        { status: 400 }
      );
    }
    
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Customer name and email are required' },
        { status: 400 }
      );
    }

    const gateway = await getEnabledGateway();
    if (!gateway || !gateway.apiKey) {
      return NextResponse.json(
        { message: 'Payment gateway is not configured or enabled. Please contact support.' },
        { status: 500 }
      );
    }

    const siteUrl = `${protocol}://${clientHost}`;

    const payload = {
        fullname: name,
        email: email,
        amount: amount.toString(),
        success_url: `${siteUrl}/payment/success`,
        cancel_url: `${siteUrl}/payment/cancel`,
        webhook_url: `${siteUrl}/api/payment/callback`,
    };

    const response = await fetch(RUPANTORPAY_CHECKOUT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-KEY': gateway.apiKey,
        'X-CLIENT': clientHost,
       },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status !== 1 || !data.payment_url || !data.transaction_id) {
      console.error("RupantorPay Error:", data);
      return NextResponse.json(
        { message: data.message || 'Failed to initiate payment with RupantorPay' },
        { status: 500 }
      );
    }

    const transaction_id = data.transaction_id;

    // Use the transaction_id from RupantorPay as the document ID
    await setDoc(doc(firestore, 'orders', transaction_id), {
      userId,
      amount,
      customerName: name,
      customerEmail: email,
      tran_id: transaction_id, // Redundant but good for querying
      status: 'PENDING',
      gateway: gateway.name,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ payment_url: data.payment_url });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
