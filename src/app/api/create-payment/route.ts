
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
        if (!settings?.rupantorPay?.accessToken) {
            return NextResponse.json({ message: 'RupantorPay Access Token is not configured.' }, { status: 500 });
        }
        
        const { accessToken, successUrl, cancelUrl, failUrl, webhookUrl } = settings.rupantorPay;

        const requestBody = {
            amount: amount.toString(),
            customer_name: fullname,
            customer_email: email,
            customer_phone: phone,
            success_url: successUrl,
            cancel_url: cancelUrl,
            fail_url: failUrl,
            webhook_url: webhookUrl || undefined,
            transaction_id: `TRN-${Date.now()}-${uid.substring(0, 6)}`,
            metadata: { uid: uid },
        };
        
        const response = await fetch('https://payment.rupantorpay.com/api/payment/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': accessToken,
                'X-CLIENT': req.headers.get('host') || 'esports-hq-app',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok && data.payment_url) {
            return NextResponse.json({ payment_url: data.payment_url });
        } else {
            console.error('RupantorPay API Error:', data);
            return NextResponse.json({ message: data.message || 'Failed to create payment link.' }, { status: response.status });
        }

    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
