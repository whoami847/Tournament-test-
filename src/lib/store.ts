
import { create } from 'zustand';
import { getGatewaysStream, type Gateway } from './gateways';

interface StoreState {
  gateways: Gateway[];
}

const useStoreImpl = create<StoreState>((set) => {
  // Initialize the stream listener when the store is created
  getGatewaysStream((gateways) => {
    set({ gateways });
  });

  return {
    gateways: [],
  };
});

// A selector-based hook to avoid unnecessary re-renders
export const useStore = <T>(selector: (state: StoreState) => T): T => {
    return useStoreImpl(selector);
};

// Also expose the whole store for convenience, though selectors are preferred
export const store = useStoreImpl;
