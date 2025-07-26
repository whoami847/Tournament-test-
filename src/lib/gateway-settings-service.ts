
import { firestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { GatewaySettings } from '@/types';

const settingsDocRef = doc(firestore, 'appSettings', 'gateways');

export const saveGatewaySettings = async (settings: GatewaySettings) => {
  try {
    await setDoc(settingsDocRef, settings);
    return { success: true };
  } catch (error: any) {
    console.error("Error saving gateway settings: ", error);
    return { success: false, error: error.message };
  }
};

export const getGatewaySettings = async (): Promise<GatewaySettings | null> => {
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as GatewaySettings;
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching gateway settings: ", error);
    return null;
  }
};
