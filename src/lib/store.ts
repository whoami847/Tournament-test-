
import { create } from 'zustand';

interface StoreState {
  // This store is currently empty but can be used for future global state.
}

const useStoreImpl = create<StoreState>((set) => {
  return {
    // Initial state here
  };
});

// A selector-based hook to avoid unnecessary re-renders
export const useStore = <T>(selector: (state: StoreState) => T): T => {
    return useStoreImpl(selector);
};

// Also expose the whole store for convenience, though selectors are preferred
export const store = useStoreImpl;
