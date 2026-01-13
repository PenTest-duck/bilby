/**
 * User API Hooks
 * Saved trips, recent stops, and preferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useAuthStore } from '@/stores/auth-store';
import type { SavedTrip, RecentStop, UserPreferences } from '@/lib/api/types';

/** Query keys */
export const userKeys = {
  all: ['user'] as const,
  trips: () => [...userKeys.all, 'trips'] as const,
  trip: (id: string) => [...userKeys.trips(), id] as const,
  recentStops: () => [...userKeys.all, 'recent-stops'] as const,
  preferences: () => [...userKeys.all, 'preferences'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};

/** Response types */
interface TripsResponse {
  trips: SavedTrip[];
  count: number;
}

interface RecentStopsResponse {
  stops: RecentStop[];
  count: number;
}

interface PreferencesResponse {
  preferences: UserPreferences;
}

/**
 * Fetch user's saved trips
 */
export function useSavedTrips() {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: userKeys.trips(),
    queryFn: () => api.get<TripsResponse>('/api/user/trips', { requireAuth: true }),
    enabled: isAuthenticated,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Create a new saved trip
 */
export function useCreateTrip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (trip: Omit<SavedTrip, 'id' | 'user_id' | 'created_at' | 'last_used_at'>) =>
      api.post<{ trip: SavedTrip }>('/api/user/trips', trip, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.trips() });
    },
  });
}

/**
 * Update a saved trip
 */
export function useUpdateTrip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<SavedTrip> & { id: string }) =>
      api.put<{ trip: SavedTrip }>(`/api/user/trips/${id}`, updates, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.trips() });
    },
  });
}

/**
 * Delete a saved trip
 */
export function useDeleteTrip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ deleted: boolean }>(`/api/user/trips/${id}`, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.trips() });
    },
  });
}

/**
 * Mark a trip as used (updates last_used_at)
 */
export function useMarkTripUsed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ trip: SavedTrip }>(`/api/user/trips/${id}/use`, {}, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.trips() });
    },
  });
}

/**
 * Fetch user's recent stops
 */
export function useRecentStops() {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: userKeys.recentStops(),
    queryFn: () => api.get<RecentStopsResponse>('/api/user/recent-stops', { requireAuth: true }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

/**
 * Add a stop to recents (upserts - increments use_count if exists)
 */
export function useAddRecentStop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (stop: { stop_id: string; stop_name: string }) =>
      api.post<{ stop: RecentStop }>('/api/user/recent-stops', stop, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.recentStops() });
    },
  });
}

/**
 * Remove a stop from recents
 */
export function useRemoveRecentStop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ deleted: boolean }>(`/api/user/recent-stops/${id}`, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.recentStops() });
    },
  });
}

/**
 * Fetch user's preferences
 */
export function useUserPreferences() {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: userKeys.preferences(),
    queryFn: () => api.get<PreferencesResponse>('/api/user/preferences', { requireAuth: true }),
    enabled: isAuthenticated,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Update user's preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) =>
      api.put<PreferencesResponse>('/api/user/preferences', preferences, { requireAuth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.preferences() });
    },
  });
}
