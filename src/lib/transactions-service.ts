
import type { Transaction, Order } from '@/types';
import { firestore } from './firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { toIsoString } from './utils';

export const getTransactionsStream = (
  userId: string,
  callback: (transactions: Transaction[]) => void
) => {
  const transactionsCollection = collection(firestore, 'transactions');
  // Removed orderBy to avoid needing a composite index. Sorting is now done client-side.
  const q = query(
    transactionsCollection,
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        date: toIsoString(data.date),
      } as Transaction);
    });
    // Sort transactions by date on the client side
    transactions.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
    callback(transactions);
  });

  return unsubscribe;
};

// New service to handle orders
const ordersCollection = collection(firestore, 'orders');

export const createOrder = async (order: Omit<Order, 'id' | 'createdAt'>) => {
    const newOrderRef = doc(ordersCollection, order.tran_id);
    await addDoc(ordersCollection, {
        ...order,
        createdAt: serverTimestamp(),
    });
    return newOrderRef.id;
};
