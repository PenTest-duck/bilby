/**
 * Alerts API
 * Service alerts and disruption queries
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Alert } from './types';

interface AlertsResponse {
  alerts: Alert[];
  count: number;
  lastUpdated: string;
}

interface ServiceStatusResponse {
  status: 'normal' | 'minor' | 'major';
  message?: string;
  alerts: Alert[];
  byMode: {
    modeId: number;
    modeName: string;
    status: 'normal' | 'minor' | 'major';
    alertCount: number;
  }[];
}

/** Get service alerts for specific routes */
export function useAlerts(options?: {
  routes?: string[];
  modes?: number[];
  severity?: Alert['severity'];
  enabled?: boolean;
}) {
  const queryParams = new URLSearchParams({
    ...(options?.routes?.length && { routes: options.routes.join(',') }),
    ...(options?.modes?.length && { modes: options.modes.join(',') }),
    ...(options?.severity && { severity: options.severity }),
  }).toString();

  return useQuery({
    queryKey: ['alerts', options?.routes, options?.modes, options?.severity],
    queryFn: () => api.get<AlertsResponse>(`/api/alerts${queryParams ? `?${queryParams}` : ''}`),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

/** Get overall network service status */
export function useServiceStatus() {
  return useQuery({
    queryKey: ['service-status'],
    queryFn: () => api.get<ServiceStatusResponse>('/api/status'),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

/** Get alerts affecting a specific trip/journey */
export function useTripAlerts(journeyId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['trip-alerts', journeyId],
    queryFn: () => api.get<AlertsResponse>(`/api/trips/${journeyId}/alerts`),
    enabled: (options?.enabled ?? true) && !!journeyId,
    staleTime: 30 * 1000,
  });
}
