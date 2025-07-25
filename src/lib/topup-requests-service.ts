
'use client';

import type { TopupRequest } from '@/types';
import { firestore } from './firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, runTransaction } from 'firebase/firestore';
import { createNotification } from './notifications-service';

const requestsCollection = collection(firestore, 'topupRequests');
const usersCollection = collection(firestore, 'users');
const transactionsCollection = collection(firestore, 'transactions');

export const getTopupRequestsStream = (callback: (requests: TopupRequest[]) => void) => {
    // Removed orderBy('requestedAt') to avoid needing a composite index.
    // We will sort client-side.
    const q = query(requestsCollection, where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests: TopupRequest[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                requestedAt: (data.requestedAt?.toDate() ?? new Date()).toISOString(),
            } as TopupRequest);
        });
        // Sort client-side to ensure oldest requests are shown first
        requests.sort((a, b) => new Date(a.requestedAt as string).getTime() - new Date(b.requestedAt as string).getTime());
        callback(requests);
    });
    return unsubscribe;
};

export const createTopupRequest = async (requestData: Omit<TopupRequest, 'id' | 'status' | 'requestedAt'>) => {
    try {
        await addDoc(requestsCollection, {
            ...requestData,
            status: 'pending',
            requestedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const processTopupRequest = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    const requestDocRef = doc(requestsCollection, requestId);

    try {
        let requestData: TopupRequest | null = null;
        
        await runTransaction(firestore, async (transaction) => {
            const requestDoc = await transaction.get(requestDocRef);
            if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
                throw new Error("Request not found or already processed.");
            }
            
            requestData = requestDoc.data() as TopupRequest;
            const userDocRef = doc(usersCollection, requestData.userId);
            const userDoc = await transaction.get(userDocRef);

            // All reads are now done. Start writes.
            transaction.update(requestDocRef, { status: newStatus });

            if (newStatus === 'approved') {
                if (!userDoc.exists()) throw new Error("User not found.");

                const newBalance = (userDoc.data().balance || 0) + requestData!.amount;
                transaction.update(userDocRef, { balance: newBalance });

                const newTransactionRef = doc(collection(firestore, 'transactions'));
                transaction.set(newTransactionRef, {
                    userId: requestData!.userId,
                    amount: requestData!.amount,
                    type: 'deposit',
                    description: `Top-up via ${requestData!.method}`,
                    date: serverTimestamp(),
                    status: 'COMPLETED',
                    gatewayTransactionId: requestData!.transactionId,
                });
            }
        });

        // Send notification after the transaction is complete
        if (requestData) {
            await createNotification({
                userId: requestData.userId,
                title: `Top-up Request ${newStatus}`,
                description: `Your top-up request of ${requestData.amount} TK has been ${newStatus}.`,
                link: '/wallet'
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error processing top-up request: ", error);
        return { success: false, error: error.message };
    }
};
