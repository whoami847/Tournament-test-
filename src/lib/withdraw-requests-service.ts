import type { WithdrawRequest, PlayerProfile } from '@/types';
import { firestore } from './firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { createNotification } from './notifications-service';

const requestsCollection = collection(firestore, 'withdrawRequests');
const usersCollection = collection(firestore, 'users');
const transactionsCollection = collection(firestore, 'transactions');

export const getPendingWithdrawRequestsStream = (callback: (requests: WithdrawRequest[]) => void) => {
  // Removed orderBy('requestedAt') to avoid composite index requirement.
  // Sorting will be handled client-side if necessary.
  const q = query(requestsCollection, where('status', '==', 'pending'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const requests: WithdrawRequest[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        requestedAt: (data.requestedAt?.toDate() ?? new Date()).toISOString(),
      } as WithdrawRequest);
    });
    // Sort client-side
    requests.sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
    callback(requests);
  });
  return unsubscribe;
};

export const processWithdrawRequest = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    const requestDocRef = doc(requestsCollection, requestId);
    
    try {
        const requestDoc = await getDoc(requestDocRef);
        if (!requestDoc.exists()) throw new Error("Request not found.");
        const requestData = requestDoc.data() as WithdrawRequest;
        
        await updateDoc(requestDocRef, { status: newStatus });
        
        if (newStatus === 'rejected') {
            const userDocRef = doc(usersCollection, requestData.userId);
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (userDoc.exists()) {
                    const newBalance = (userDoc.data().balance || 0) + requestData.amount;
                    transaction.update(userDocRef, { balance: newBalance });
                }
            });
        }
        
        if (newStatus === 'approved') {
            await addDoc(transactionsCollection, {
                userId: requestData.userId,
                amount: -requestData.amount,
                type: 'withdrawal',
                description: `Withdrawal to ${requestData.method}`,
                date: serverTimestamp(),
            });
        }
    
        await createNotification({
            userId: requestData.userId,
            title: `Withdrawal ${newStatus}`,
            description: `Your withdrawal request of ${requestData.amount} TK has been ${newStatus}.`,
            link: '/wallet'
        });
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export async function createWithdrawalRequest(
  profile: PlayerProfile,
  amount: number,
  method: string,
  accountNumber: string
): Promise<{ success: boolean; error?: string }> {
  if (!profile) return { success: false, error: 'User not authenticated.' };
  
  const userDocRef = doc(usersCollection, profile.id);

  try {
    await runTransaction(firestore, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) throw new Error("User profile not found.");
      
      const userBalance = userDoc.data().balance || 0;
      if (userBalance < amount) throw new Error("Insufficient balance.");

      const newRequestRef = doc(requestsCollection);
      const newRequest: Omit<WithdrawRequest, 'id'> = {
          userId: profile.id,
          userName: profile.name,
          userGamerId: profile.gamerId,
          amount: amount,
          method: method,
          accountNumber: accountNumber,
          status: 'pending',
          requestedAt: serverTimestamp() as any,
      };
      
      transaction.set(newRequestRef, newRequest);
      transaction.update(userDocRef, { balance: userBalance - amount });
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
