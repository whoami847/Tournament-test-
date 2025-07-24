'use server';

import { redirect } from 'next/navigation';
import { firestore } from './firebase';
import { doc, runTransaction, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { getGatewaySettings } from './gateway-service';

export async function createPaymentUrl(
  userId: string | null,
  state: { error: string } | null,
  formData: FormData
) {
  if (!userId) {
    return { error: 'User is not authenticated. Please log in again.' };
  }

  const rawFormData = {
    amount: formData.get('amount'),
  };

  if (!rawFormData.amount || +rawFormData.amount < 10) {
    return { error: 'Amount is required and must be at least 10.' };
  }

  const gatewaySettings = await getGatewaySettings();
  if (!gatewaySettings.accessToken || !gatewaySettings.checkoutUrl) {
      return { error: 'Payment gateway is not configured. Please contact support.' };
  }
  
  const transactionRef = doc(firestore, 'transactions', `temp_${Date.now()}`); // Create a temp ref

  // Create a pending transaction document first
  try {
    const transactionData = {
      userId,
      amount: parseFloat(rawFormData.amount.toString()),
      type: 'deposit',
      description: 'Online Deposit',
      date: serverTimestamp(),
      status: 'pending',
      gatewayTransactionId: transactionRef.id,
    };
    await setDoc(transactionRef, transactionData);
  } catch (error: any) {
    console.error("Failed to create pending transaction:", error);
    return { error: 'Failed to initiate transaction. Please try again.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const payload = {
    "access_token": gatewaySettings.accessToken,
    "transaction_id": transactionRef.id,
    "amount": rawFormData.amount,
    "success_url": `${baseUrl}/payment/success?transaction_id=${transactionRef.id}`,
    "fail_url": `${baseUrl}/payment/fail`,
    "cancel_url": `${baseUrl}/payment/cancel`,
  };

  try {
    const response = await fetch(gatewaySettings.checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.status === 'success' && data.data) {
      redirect(data.data);
    } else {
      return { error: data.message || 'Failed to get payment URL from the provider.' };
    }
  } catch (error) {
    console.error("Error contacting payment gateway:", error);
    return { error: 'Could not connect to the payment provider. Please try again later.' };
  }
}


export async function verifyPayment(transaction_id: string | null) {
  if (!transaction_id) {
    return { status: 'error' as const, message: 'Transaction ID is missing.' };
  }

  const gatewaySettings = await getGatewaySettings();
  if (!gatewaySettings.accessToken || !gatewaySettings.verifyUrl) {
      return { status: 'error' as const, message: 'Payment gateway is not configured for verification.' };
  }

  try {
    // Step 1: Verify with payment gateway
    const verifyResponse = await fetch(gatewaySettings.verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "access_token": gatewaySettings.accessToken,
            "transaction_id": transaction_id,
        })
    });
    
    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || verifyData.status !== 'success' || verifyData.data.status !== 'success') {
         // Even if verification fails with gateway, we mark it as failed in our DB to prevent retries.
        const transactionRef = doc(firestore, 'transactions', transaction_id);
        const transactionDoc = await getDoc(transactionRef);
        if (transactionDoc.exists() && transactionDoc.data().status === 'pending') {
             await setDoc(transactionRef, { status: 'failed', gatewayResponse: verifyData }, { merge: true });
        }
        return { status: 'fail' as const, message: verifyData.message || 'Payment could not be verified with the provider.' };
    }

    // Step 2: If gateway verification is successful, update user balance in a transaction
    const transactionRef = doc(firestore, 'transactions', transaction_id);
    const transactionDoc = await getDoc(transactionRef);
    if (!transactionDoc.exists()) throw new Error("Transaction record not found in our database.");

    const userId = transactionDoc.data().userId;
    if (!userId) throw new Error("User ID missing from transaction record.");

    const userRef = doc(firestore, 'users', userId);

    await runTransaction(firestore, async (transaction) => {
      const dbTransactionDoc = await transaction.get(transactionRef);
      if (!dbTransactionDoc.exists() || dbTransactionDoc.data().status !== 'pending') {
        throw new Error("Transaction not found or already processed.");
      }
      
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("User not found.");
      }

      const newBalance = userDoc.data().balance + dbTransactionDoc.data().amount;
      
      transaction.update(userRef, { balance: newBalance });
      transaction.update(transactionRef, { status: 'success' });
    });

    return { status: 'success' as const, message: 'Payment verified and balance updated.' };
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return { status: 'fail' as const, message: error.message };
  }
}
