
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { firestore } from './firebase';

export interface Gateway {
  id: string;
  name: string;
  storeId: string;
  storePassword?: string;
  isLive: boolean;
  enabled: boolean;
}

const gatewaysCollection = collection(firestore, 'gateways');

export const getGateways = (callback: (gateways: Gateway[]) => void) => {
  return onSnapshot(gatewaysCollection, (snapshot) => {
    const gateways = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Gateway));
    callback(gateways);
  });
};

export const getEnabledGateway = async (): Promise<Gateway | null> => {
  const q = query(gatewaysCollection, where('enabled', '==', true), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Gateway;
};

export const addGateway = (gateway: Omit<Gateway, 'id'>) => {
  return addDoc(gatewaysCollection, gateway);
};

export const updateGateway = (id: string, gateway: Partial<Omit<Gateway, 'id'>>) => {
  const gatewayDoc = doc(firestore, 'gateways', id);
  return updateDoc(gatewayDoc, gateway);
};

export const deleteGateway = (id: string) => {
  const gatewayDoc = doc(firestore, 'gateways', id);
  return deleteDoc(gatewayDoc);
};
