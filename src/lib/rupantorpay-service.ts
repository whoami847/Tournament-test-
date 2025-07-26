
'use server';

import type { GatewaySettings } from '@/types';
import { getGatewaySettings } from './gateway-settings-service';

interface PaymentPayload {
    amount: number;
    fullname: string;
    email: string;
    metadata?: { [key: string]: any };
}

interface VerificationPayload {
    transaction_id: string;
}

export async function initiatePayment(payload: PaymentPayload): Promise<string | null> {
    const settings = await getGatewaySettings();
    if (!settings?.rupantorPay?.apiKey) {
        throw new Error('RupantorPay API key is not configured.');
    }

    const { apiKey, apiBaseUrl, successUrl, cancelUrl, webhookUrl } = settings.rupantorPay;

    const requestBody = {
      ...payload,
      amount: payload.amount.toString(),
      success_url: successUrl,
      cancel_url: cancelUrl,
      webhook_url: webhookUrl || undefined,
    };
    
    try {
        const response = await fetch(`${apiBaseUrl}/payment/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
                'X-CLIENT': 'Aff tour',
            },
            body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();

        if (data.status === 1 && data.payment_url) {
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
    if (!settings?.rupantorPay?.apiKey) {
        throw new Error('RupantorPay API key is not configured.');
    }

    const { apiKey, apiBaseUrl } = settings.rupantorPay;

    try {
        const response = await fetch(`${apiBaseUrl}/payment/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
                'X-CLIENT': 'Aff tour',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.status === false) {
             throw new Error(data.message || 'Payment verification failed.');
        }
        
        return data; // Returns the full transaction details on success

    } catch (error) {
        console.error('Failed to verify payment:', error);
        throw error;
    }
}

