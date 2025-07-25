
import type { TopupRequest } from '@/types';
import { firestore } from './firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, runTransaction } from 'firebase/firestore';
import { createNotification } from './notifications-service';

const requestsCollection = collection(firestore, 'topupRequests');
const usersCollection = collection(firestore, 'users');
const transactionsCollection = collection(firestore, 'transactions');

export const getTopupRequestsStream = (callback: (requests: TopupRequest[]) => void) => {
    const q = query(requestsCollection, where('status', '==', 'pending'), orderBy('requestedAt', 'asc'));
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
        await runTransaction(firestore, async (transaction) => {
            const requestDoc = await transaction.get(requestDocRef);
            if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
                throw new Error("Request not found or already processed.");
            }

            const requestData = requestDoc.data() as TopupRequest;
            transaction.update(requestDocRef, { status: newStatus });

            if (newStatus === 'approved') {
                const userDocRef = doc(usersCollection, requestData.userId);
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found.");

                const newBalance = (userDoc.data().balance || 0) + requestData.amount;
                transaction.update(userDocRef, { balance: newBalance });

                // Create a transaction log
                const newTransactionRef = doc(transactionsCollection);
                transaction.set(newTransactionRef, {
                    userId: requestData.userId,
                    amount: requestData.amount,
                    type: 'deposit',
                    description: `Top-up via ${requestData.method}`,
                    date: serverTimestamp(),
                    status: 'COMPLETED',
                    gatewayTransactionId: requestData.transactionId,
                });
            }
            
            await createNotification({
                userId: requestData.userId,
                title: `Top-up Request ${newStatus}`,
                description: `Your top-up request of ${requestData.amount} TK has been ${newStatus}.`,
                link: '/wallet'
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error processing top-up request: ", error);
        return { success: false, error: error.message };
    }
};
