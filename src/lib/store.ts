
import { create } from 'zustand';
import { getGateways, type Gateway } from './gateways';

interface StoreState {
  gateways: Gateway[];
  initializeGateways: () => () => void;
}

export const useStore = create<StoreState>((set) => ({
  gateways: [],
  initializeGateways: () => {
    const unsubscribe = getGateways((gateways) => {
      set({ gateways });
    });
    return unsubscribe;
  },
}));
