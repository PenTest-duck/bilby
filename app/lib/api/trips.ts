/**
 * Trips API
 * Trip planning queries
 * 
 * Backend endpoint: GET/POST /api/trips
 * Note: Uses 'when' parameter (not 'time') for departure/arrival time
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { TripsResponse, RankingStrategy } from '@/lib/api-schema';

/**
 * Trip planning request parameters
 * Maps to backend's TripsRequest
 */
export interface TripPlanParams {
  /** Origin stop ID or "lat,lng" coordinates */
  from: string;
  /** Destination stop ID or "lat,lng" coordinates */
  to: string;
  /** Departure/arrival time (ISO string or "now") - maps to backend 'when' param */
  when?: string;
  /** If true, 'when' is arrival time; if false, departure time */
  arriveBy?: boolean;
  /** Ranking strategy */
  strategy?: RankingStrategy;
  /** Transport modes to include */
  modes?: string[];
  /** Prefer wheelchair accessible routes */
  accessible?: boolean;
}

/**
 * Plan a trip with ranked options
 * Endpoint: GET /api/trips
 */
export function useTripPlan(params: TripPlanParams | null, options?: { enabled?: boolean }) {
  const queryParams = params ? new URLSearchParams({
    from: params.from,
    to: params.to,
    ...(params.when && { when: params.when }),
    ...(params.arriveBy && { arriveBy: 'true' }),
    ...(params.strategy && { strategy: params.strategy }),
    ...(params.modes?.length && { modes: params.modes.join(',') }),
    ...(params.accessible && { accessible: 'true' }),
  }).toString() : '';

  return useQuery({
    queryKey: ['trips', 'plan', params],
    queryFn: () => api.get<TripsResponse>(`/api/trips?${queryParams}`),
    enabled: (options?.enabled ?? true) && !!params?.from && !!params?.to,
    staleTime: 30 * 1000, // 30 seconds for realtime freshness
  });
}
