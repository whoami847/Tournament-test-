
import type { PaymentGatewaySettings } from '@/types';
import { firestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsDocRef = doc(firestore, 'settings', 'paymentGateway');

export const getGatewaySettings = async (): Promise<Omit<PaymentGatewaySettings, 'id'>> => {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as Omit<PaymentGatewaySettings, 'id'>;
    }
    // Return default/empty settings if not found
    return {
        name: 'RupantorPay',
        storeId: '',
        storePassword: '',
    };
};

export const updateGatewaySettings = async (data: Partial<Omit<PaymentGatewaySettings, 'id'>>) => {
  try {
    await setDoc(settingsDocRef, data, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
