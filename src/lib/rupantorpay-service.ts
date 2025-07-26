
'use server';

import type { GatewaySettings } from '@/types';
import { getGatewaySettings } from './gateway-settings-service';

const RUPANTORPAY_API_BASE_URL = 'https://payment.rupantorpay.com/api/payment';

interface PaymentPayload {
    amount: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    metadata?: { [key: string]: any };
}

interface VerificationPayload {
    transaction_id: string;
}

export async function initiatePayment(payload: PaymentPayload): Promise<string | null> {
    const settings = await getGatewaySettings();
    if (!settings?.rupantorPay?.accessToken) {
        throw new Error('RupantorPay Access Token is not configured.');
    }

    const { accessToken, successUrl, cancelUrl, failUrl, webhookUrl } = settings.rupantorPay;

    const requestBody = {
      access_token: accessToken,
      transaction_id: `TRN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      amount: payload.amount.toString(),
      success_url: successUrl,
      cancel_url: cancelUrl,
      fail_url: failUrl,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      webhook_url: webhookUrl || undefined,
      metadata: payload.metadata || undefined,
    };
    
    try {
        const response = await fetch(`${RUPANTORPAY_API_BASE_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();

        if (response.ok && data.payment_url) {
            return data.payment_url;
        } else {
            console.error('RupantorPay Error:', data.message || 'Unknown error');
            throw new Error(data.message || 'Failed to create payment link.');
        }
    } catch (error) {
        console.error('Failed to initiate payment:', error);
        throw error;
    }
}


export async function verifyPayment(payload: VerificationPayload) {
    const settings = await getGatewaySettings();
    if (!settings?.rupantorPay?.accessToken) {
        throw new Error('RupantorPay Access Token is not configured.');
    }

    const { accessToken } = settings.rupantorPay;

     const requestBody = {
        access_token: accessToken,
        transaction_id: payload.transaction_id,
    };

    try {
        const response = await fetch(`${RUPANTORPAY_API_BASE_URL}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
             throw new Error(data.message || 'Payment verification failed.');
        }
        
        return data; // Returns the full transaction details on success

    } catch (error) {
        console.error('Failed to verify payment:', error);
        throw error;
    }
}
