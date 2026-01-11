/**
 * Preferences Store
 * User preferences persisted locally
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RankingStrategy } from '@/lib/api/types';

interface PreferencesState {
  defaultStrategy: RankingStrategy;
  preferredModes: number[];
  accessibilityRequired: boolean;
  
  setDefaultStrategy: (strategy: RankingStrategy) => void;
  setPreferredModes: (modes: number[]) => void;
  setAccessibilityRequired: (required: boolean) => void;
  reset: () => void;
}

const defaultState = {
  defaultStrategy: 'best' as RankingStrategy,
  preferredModes: [] as number[],
  accessibilityRequired: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultState,
      
      setDefaultStrategy: (strategy) => set({ defaultStrategy: strategy }),
      setPreferredModes: (modes) => set({ preferredModes: modes }),
      setAccessibilityRequired: (required) => set({ accessibilityRequired: required }),
      reset: () => set(defaultState),
    }),
    {
      name: 'bilby-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
