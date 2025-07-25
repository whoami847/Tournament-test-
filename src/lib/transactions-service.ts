
import type { Transaction, Order } from '@/types';
import { firestore } from './firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { toIsoString } from './utils';

export const getTransactionsStream = (
  userId: string,
  callback: (transactions: Transaction[]) => void
) => {
  const transactionsCollection = collection(firestore, 'transactions');
  const q = query(
    transactionsCollection,
    where('userId', '==', userId),
    orderBy('date', 'desc') 
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure date exists before processing
      if (data.date) {
        transactions.push({
          id: doc.id,
          ...data,
          date: toIsoString(data.date),
        } as Transaction);
      }
    });
    callback(transactions);
  }, (error) => {
    console.error("Error fetching transactions:", error);
    // Fallback for older data or if index is missing
    const fallbackQuery = query(transactionsCollection, where('userId', '==', userId));
    return onSnapshot(fallbackQuery, (snapshot) => {
        const fallbackTransactions: Transaction[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
             if (data.date) {
                fallbackTransactions.push({
                    id: doc.id,
                    ...data,
                    date: toIsoString(data.date),
                } as Transaction);
            }
        });
        fallbackTransactions.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
        callback(fallbackTransactions);
    });
  });

  return unsubscribe;
};

// New service to handle orders
const ordersCollection = collection(firestore, 'orders');

export const createOrder = async (order: Omit<Order, 'id'>) => {
    const newOrderRef = doc(ordersCollection, order.tran_id);
    await setDoc(newOrderRef, {
        ...order,
    });
    return newOrderRef.id;
};
