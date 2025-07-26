
'use server';

import crypto from 'crypto';

const AAMARPAY_STORE_ID = "aamarpaytest";
const AAMARPAY_SIGNATURE_KEY = "dbb74894e82415a2f7ff0ec3a97e4183";
const AAMARPAY_API_URL = "https://sandbox.aamarpay.com/jsonpost.php";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";

interface PaymentPayload {
    amount: number;
    tran_id: string;
    cus_name: string;
    cus_email: string;
    cus_phone: string;
    cus_add1: string;
    cus_city: string;
    cus_country: string;
    desc: string;
}

export async function initiatePayment(payload: PaymentPayload): Promise<string | null> {
    const formData = new URLSearchParams();
    formData.append('store_id', AAMARPAY_STORE_ID);
    formData.append('signature_key', AAMARPAY_SIGNATURE_KEY);
    formData.append('amount', payload.amount.toString());
    formData.append('currency', 'BDT');
    formData.append('tran_id', payload.tran_id);
    formData.append('cus_name', payload.cus_name);
    formData.append('cus_email', payload.cus_email);
    formData.append('cus_phone', payload.cus_phone);
    formData.append('cus_add1', payload.cus_add1);
    formData.append('cus_city', payload.cus_city);
    formData.append('cus_country', payload.cus_country);
    formData.append('desc', payload.desc);
    formData.append('success_url', `${APP_BASE_URL}/payment/verify`);
    formData.append('fail_url', `${APP_BASE_URL}/payment/verify`);
    formData.append('cancel_url', `${APP_BASE_URL}/payment/verify`);
    formData.append('type', 'json');

    try {
        const response = await fetch(AAMARPAY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json();

        if (data.result === 'true' && data.payment_url) {
            return data.payment_url;
        } else {
            console.error('AamarPay Error:', data.message || 'Unknown error');
            return null;
        }
    } catch (error) {
        console.error('Failed to initiate payment:', error);
        return null;
    }
}

export function verifyPaymentSignature(data: any): boolean {
    const { mer_txnid, amount, pay_status, mer_signature_key } = data;
    const stringToHash = `${mer_txnid}${amount}${pay_status}${AAMARPAY_SIGNATURE_KEY}`;
    const generatedSignature = crypto.createHash('md5').update(stringToHash).digest('hex');
    return generatedSignature === mer_signature_key;
}
