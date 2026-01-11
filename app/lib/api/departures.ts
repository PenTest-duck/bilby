/**
 * Departures API
 * Live departure queries
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Departure, Stop } from './types';

interface DeparturesResponse {
  stop: Stop;
  departures: Departure[];
  count: number;
}

/** Get live departures for a stop */
export function useDepartures(
  stopId: string | null,
  options?: { 
    enabled?: boolean;
    limit?: number;
    modes?: number[];
  }
) {
  const queryParams = new URLSearchParams({
    ...(options?.limit && { limit: options.limit.toString() }),
    ...(options?.modes?.length && { modes: options.modes.join(',') }),
  }).toString();

  const endpoint = `/api/departures/${encodeURIComponent(stopId || '')}${queryParams ? `?${queryParams}` : ''}`;

  return useQuery({
    queryKey: ['departures', stopId, options?.limit, options?.modes],
    queryFn: () => api.get<DeparturesResponse>(endpoint),
    enabled: (options?.enabled ?? true) && !!stopId,
    staleTime: 15 * 1000, // 15 seconds - realtime data
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
  });
}
