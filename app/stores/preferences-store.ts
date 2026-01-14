/**
 * Preferences Store
 * User preferences persisted locally and synced to Supabase when authenticated
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api/client';
import { useAuthStore } from './auth-store';
import type { RankingStrategy, OpalCardType, UserPreferences } from '@/lib/api/types';

interface PreferencesState {
  defaultStrategy: RankingStrategy;
  preferredModes: number[];
  accessibilityRequired: boolean;
  opalCardType: OpalCardType;
  _isSyncing: boolean;
  
  setDefaultStrategy: (strategy: RankingStrategy) => void;
  setPreferredModes: (modes: number[]) => void;
  setAccessibilityRequired: (required: boolean) => void;
  setOpalCardType: (cardType: OpalCardType) => void;
  reset: () => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

const defaultState = {
  defaultStrategy: 'best' as RankingStrategy,
  preferredModes: [] as number[],
  accessibilityRequired: false,
  opalCardType: 'adult' as OpalCardType,
  _isSyncing: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      setDefaultStrategy: (strategy) => {
        set({ defaultStrategy: strategy });
        get().syncToServer();
      },
      setPreferredModes: (modes) => {
        set({ preferredModes: modes });
        get().syncToServer();
      },
      setAccessibilityRequired: (required) => {
        set({ accessibilityRequired: required });
        get().syncToServer();
      },
      setOpalCardType: (cardType) => {
        set({ opalCardType: cardType });
        get().syncToServer();
      },
      reset: () => set(defaultState),
      
      syncToServer: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || get()._isSyncing) return;
        
        set({ _isSyncing: true });
        try {
          const state = get();
          await api.put('/api/user/preferences', {
            default_strategy: state.defaultStrategy,
            preferred_modes: state.preferredModes.map(String),
            accessibility_required: state.accessibilityRequired,
            opal_card_type: state.opalCardType,
          });
        } catch (error) {
          console.warn('[Preferences] Sync to server failed:', error);
        } finally {
          set({ _isSyncing: false });
        }
      },
      
      loadFromServer: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) return;
        
        try {
          const response = await api.get<{ preferences: UserPreferences }>('/api/user/preferences');
          const prefs = response.preferences;
          
          set({
            defaultStrategy: (prefs.default_strategy as RankingStrategy) || 'best',
            preferredModes: prefs.preferred_modes?.map(Number) || [],
            accessibilityRequired: prefs.accessibility_required || false,
            opalCardType: (prefs.opal_card_type as OpalCardType) || 'adult',
          });
        } catch (error) {
          console.warn('[Preferences] Load from server failed:', error);
        }
      },
    }),
    {
      name: 'bilby-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        defaultStrategy: state.defaultStrategy,
        preferredModes: state.preferredModes,
        accessibilityRequired: state.accessibilityRequired,
        opalCardType: state.opalCardType,
      }),
    }
  )
);
