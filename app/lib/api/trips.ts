/**
 * Trips API
 * Trip planning queries
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { RankedJourney, RankingStrategy, Alert } from './types';

interface TripPlanResponse {
  best: RankedJourney;
  alternatives: RankedJourney[];
  query: {
    from: string;
    to: string;
    time: string;
    strategy: RankingStrategy;
  };
  alerts?: Alert[];
}

export interface TripPlanParams {
  from: string;
  to: string;
  time?: string;
  arriveBy?: boolean;
  strategy?: RankingStrategy;
  modes?: string[];
  accessible?: boolean;
}

/** Plan a trip */
export function useTripPlan(params: TripPlanParams | null, options?: { enabled?: boolean }) {
  const queryParams = params ? new URLSearchParams({
    from: params.from,
    to: params.to,
    ...(params.time && { time: params.time }),
    ...(params.arriveBy && { arriveBy: 'true' }),
    ...(params.strategy && { strategy: params.strategy }),
    ...(params.modes?.length && { modes: params.modes.join(',') }),
    ...(params.accessible && { accessible: 'true' }),
  }).toString() : '';

  return useQuery({
    queryKey: ['trips', 'plan', params],
    queryFn: () => api.get<TripPlanResponse>(`/api/trips?${queryParams}`),
    enabled: (options?.enabled ?? true) && !!params?.from && !!params?.to,
    staleTime: 30 * 1000, // 30 seconds for realtime freshness
  });
}
