/**
 * Stops API
 * Stop search and lookup queries
 * 
 * Backend endpoints:
 * - GET /api/stops/search?q={query}&limit={limit}
 * - GET /api/stops/nearby?lat={lat}&lng={lng}&radius={radius}
 * - GET /api/stops/:stopId
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { 
  StopsSearchResponse,
  StopDetailsResponse,
  StopsNearbyResponse,
} from '@/lib/api-schema';

/** Search stops by name */
export function useStopSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['stops', 'search', query],
    queryFn: () => api.get<StopsSearchResponse>(`/api/stops/search?q=${encodeURIComponent(query)}&limit=10`),
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}

/** Get stop details by ID */
export function useStopDetails(stopId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['stops', 'details', stopId],
    queryFn: () => api.get<StopDetailsResponse>(`/api/stops/${encodeURIComponent(stopId)}`),
    enabled: (options?.enabled ?? true) && !!stopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Find nearby stops */
export function useNearbyStops(
  lat: number | null,
  lng: number | null,
  radius: number = 500,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['stops', 'nearby', lat, lng, radius],
    queryFn: () => api.get<StopsNearbyResponse>(`/api/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
    enabled: (options?.enabled ?? true) && lat !== null && lng !== null,
    staleTime: 60 * 1000, // 1 minute
  });
}
