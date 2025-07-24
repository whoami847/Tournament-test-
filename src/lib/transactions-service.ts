import type { Transaction, Order } from '@/types';
import { firestore } from './firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc } from 'firebase/firestore';
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
      transactions.push({
        id: doc.id,
        ...data,
        date: toIsoString(data.date),
      } as Transaction);
    });
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
