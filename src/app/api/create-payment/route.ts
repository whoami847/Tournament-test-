
import { NextRequest, NextResponse } from 'next/server';
import { getGatewaySettings } from '@/lib/gateway-settings-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fullname, email, amount, uid, phone } = body;

        if (!fullname || !email || !amount || !uid || !phone) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const settings = await getGatewaySettings();
        if (!settings?.nagorikPay?.accessToken) {
            return NextResponse.json({ message: 'NagorikPay Access Token is not configured.' }, { status: 500 });
        }
        
        const { accessToken, successUrl, cancelUrl, webhookUrl } = settings.nagorikPay;

        const transaction_id = `TRN-${Date.now()}-${uid.substring(0, 6)}`;

        const requestBody = {
            amount: amount.toString(),
            cus_name: fullname,
            cus_email: email,
            success_url: successUrl,
            cancel_url: cancelUrl,
            webhook_url: webhookUrl || undefined,
            transaction_id: transaction_id,
            meta_data: JSON.stringify({ uid: uid, phone: phone }),
        };
        
        const response = await fetch('https://secure-pay.nagorikpay.com/api/payment/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'API-KEY': accessToken,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok && data.payment_url) {
            return NextResponse.json({ payment_url: data.payment_url });
        } else {
            console.error('NagorikPay API Error:', data);
            return NextResponse.json({ message: data.message || 'Failed to create payment link.' }, { status: response.status });
        }

    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
