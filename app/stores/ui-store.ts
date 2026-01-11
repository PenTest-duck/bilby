/**
 * UI Store
 * Transient UI state (not persisted)
 */

import { create } from 'zustand';

interface UIState {
  isSearching: boolean;
  searchQuery: string;
  selectedStopId: string | null;
  
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStopId: (stopId: string | null) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSearching: false,
  searchQuery: '',
  selectedStopId: null,
  
  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedStopId: (stopId) => set({ selectedStopId: stopId }),
  reset: () => set({ isSearching: false, searchQuery: '', selectedStopId: null }),
}));
