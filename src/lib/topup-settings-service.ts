
import type { TopupMethod } from '@/types';
import { firestore } from './firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where, getDocs } from 'firebase/firestore';

const methodsCollection = collection(firestore, 'topupMethods');

export const addTopupMethod = async (method: Omit<TopupMethod, 'id'>) => {
  try {
    await addDoc(methodsCollection, method);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getTopupMethodsStream = (callback: (methods: TopupMethod[]) => void) => {
  const q = query(methodsCollection, orderBy('name'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const methods: TopupMethod[] = [];
    snapshot.forEach((doc) => {
      methods.push({ id: doc.id, ...doc.data() } as TopupMethod);
    });
    callback(methods);
  });
  return unsubscribe;
};

export const getActiveTopupMethods = async (): Promise<TopupMethod[]> => {
    const q = query(methodsCollection, where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    const methods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopupMethod));
    // Sort client-side to avoid composite index requirement
    methods.sort((a, b) => a.name.localeCompare(b.name));
    return methods;
}

export const updateTopupMethod = async (id: string, data: Partial<Omit<TopupMethod, 'id'>>) => {
  const methodDoc = doc(firestore, 'topupMethods', id);
  try {
    await updateDoc(methodDoc, data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteTopupMethod = async (id: string) => {
  const methodDoc = doc(firestore, 'topupMethods', id);
  try {
    await deleteDoc(methodDoc);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
