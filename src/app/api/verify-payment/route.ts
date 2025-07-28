
import { NextRequest, NextResponse } from 'next/server';
import { getGatewaySettings } from '@/lib/gateway-settings-service';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        if (!db) {
            return NextResponse.json({ message: 'Firebase Admin not configured.' }, { status: 500 });
        }

        const { transaction_id } = await req.json();

        if (!transaction_id) {
            return NextResponse.json({ message: 'Transaction ID is required.' }, { status: 400 });
        }

        const settings = await getGatewaySettings();
        if (!settings?.rupantorPay?.accessToken) {
            return NextResponse.json({ message: 'RupantorPay Access Token is not configured.' }, { status: 500 });
        }
        const { accessToken } = settings.rupantorPay;

        const response = await fetch('https://payment.rupantorpay.com/api/payment/verify-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': accessToken,
                 'X-CLIENT': req.headers.get('host') || 'esports-hq-app',
            },
            body: JSON.stringify({ transaction_id }),
        });

        const data = await response.json();
        
        if (!response.ok) {
             console.error('RupantorPay Verification Error:', data);
             return NextResponse.json({ message: data.message || 'Verification failed.' }, { status: response.status });
        }

        const isAlreadyProcessed = await checkIfTransactionProcessed(transaction_id);

        if (data.status === 'COMPLETED' && !isAlreadyProcessed) {
            const uid = data.metadata?.uid;
            const amount = parseFloat(data.amount);

            if (uid && amount > 0) {
                const userRef = db.collection('users').doc(uid);
                const transactionRef = db.collection('transactions').doc(transaction_id);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(userRef);
                    const currentBalance = doc.exists ? doc.data()?.balance || 0 : 0;
                    const newBalance = currentBalance + amount;
                    
                    t.update(userRef, { balance: newBalance });
                    
                    t.set(transactionRef, {
                        userId: uid,
                        amount: amount,
                        type: 'deposit',
                        description: `Top-up via ${data.payment_method || 'RupantorPay'}`,
                        date: new Date(),
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

async function checkIfTransactionProcessed(transactionId: string): Promise<boolean> {
    if (!db) return false;
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();
    return transactionDoc.exists;
}
