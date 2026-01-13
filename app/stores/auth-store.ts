/**
 * Auth Store
 * Manages authentication state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setToken: (token) => set({ 
        token, 
        isAuthenticated: !!token,
        isLoading: false,
      }),
      
      setUser: (user) => set({ user }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      login: (token, user) => set({ 
        token, 
        user, 
        isAuthenticated: true,
        isLoading: false,
      }),
      
      logout: () => set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
      }),
    }),
    {
      name: 'bilby-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.isAuthenticated = !!state.token;
        }
      },
    }
  )
);
