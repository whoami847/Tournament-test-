
import { NextRequest, NextResponse } from 'next/server';
import { getGatewaySettings } from '@/lib/gateway-settings-service';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

async function checkIfTransactionProcessed(transactionId: string): Promise<boolean> {
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();
    return transactionDoc.exists;
}

export async function POST(req: NextRequest) {
    try {
        const { transaction_id } = await req.json();

        if (!transaction_id) {
            return NextResponse.json({ message: 'Transaction ID is required.' }, { status: 400 });
        }

        const settings = await getGatewaySettings();
        if (!settings?.nagorikPay?.accessToken) {
            return NextResponse.json({ message: 'NagorikPay Access Token is not configured.' }, { status: 500 });
        }
        const { accessToken } = settings.nagorikPay;

        const response = await fetch('https://secure-pay.nagorikpay.com/api/payment/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'API-KEY': accessToken,
            },
            body: JSON.stringify({ transaction_id }),
        });

        const data = await response.json();
        
        if (!response.ok) {
             console.error('NagorikPay Verification Error:', data);
             return NextResponse.json({ message: data.message || 'Verification failed.' }, { status: response.status });
        }
        
        const isAlreadyProcessed = await checkIfTransactionProcessed(transaction_id);
        
        if (data.status === 'COMPLETED' && !isAlreadyProcessed) {
            // metadata might be a stringified JSON
            const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
            const uid = metadata?.uid;
            const amount = parseFloat(data.amount);

            if (uid && amount > 0) {
                const userRef = db.collection('users').doc(uid);
                const transactionRef = db.collection('transactions').doc(transaction_id);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(userRef);
                    if (!doc.exists) {
                        throw new Error("User not found!");
                    }
                    
                    t.update(userRef, { balance: FieldValue.increment(amount) });
                    
                    t.set(transactionRef, {
                        userId: uid,
                        amount: amount,
                        type: 'deposit',
                        description: `Top-up via ${data.payment_method || 'NagorikPay'}`,
                        date: FieldValue.serverTimestamp(),
                        status: 'COMPLETED',
                        gatewayTransactionId: transaction_id,
                    });
                });
            }
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Verification API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
