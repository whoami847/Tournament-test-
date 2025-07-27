

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
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure date exists, but if not, fallback to current date to prevent items from being hidden.
      transactions.push({
        id: doc.id,
        ...data,
        date: data.date ? toIsoString(data.date) : new Date().toISOString(),
      } as Transaction);
    });
    // Sort client-side to avoid composite index requirement
    transactions.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
    callback(transactions);
  }, (error) => {
    console.error("Error fetching transactions:", error);
  });

  return unsubscribe;
};
