/**
 * Departures API
 * Live departure queries with real-time polling
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from './client';
import type { Departure, Stop } from './types';

interface DeparturesResponse {
  stop: Stop;
  departures: Departure[];
  count: number;
  timestamp?: string;
}

const POLLING_INTERVAL = 15 * 1000; // 15 seconds for live departures
const STALE_TIME = 10 * 1000; // Consider data stale after 10s

/** Get live departures for a stop with auto-polling */
export function useDepartures(
  stopId: string | null,
  options?: { 
    enabled?: boolean;
    limit?: number;
    modes?: number[];
    pollingEnabled?: boolean;
  }
) {
  const [isAppActive, setIsAppActive] = useState(true);

  // Pause polling when app is backgrounded
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const queryParams = new URLSearchParams({
    ...(options?.limit && { limit: options.limit.toString() }),
    ...(options?.modes?.length && { modes: options.modes.join(',') }),
  }).toString();

  const endpoint = `/api/departures/${encodeURIComponent(stopId || '')}${queryParams ? `?${queryParams}` : ''}`;

  const pollingEnabled = options?.pollingEnabled ?? true;

  return useQuery({
    queryKey: ['departures', stopId, options?.limit, options?.modes],
    queryFn: () => api.get<DeparturesResponse>(endpoint),
    enabled: (options?.enabled ?? true) && !!stopId,
    staleTime: STALE_TIME,
    refetchInterval: pollingEnabled && isAppActive ? POLLING_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

/** Hook to track data freshness */
export function useDataFreshness(dataUpdatedAt: number | undefined) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!dataUpdatedAt) return;

    const updateFreshness = () => {
      const now = Date.now();
      setSecondsAgo(Math.floor((now - dataUpdatedAt) / 1000));
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  return {
    secondsAgo,
    isStale: secondsAgo > 30,
    isFresh: secondsAgo < 15,
    label: formatFreshnessLabel(secondsAgo),
  };
}

function formatFreshnessLabel(seconds: number): string {
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
