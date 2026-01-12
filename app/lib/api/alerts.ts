/**
 * Alerts/Disruptions API
 * Service alerts and disruption queries
 * 
 * Backend endpoint: /api/disruptions (NOT /api/alerts)
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { 
  DisruptionsResponse, 
  DisruptionsStopResponse,
  DisruptionsRouteResponse,
  ServiceStatusResponse,
} from '@/lib/api-schema';

/**
 * Get service disruptions/alerts
 * Endpoint: GET /api/disruptions
 */
export function useDisruptions(options?: {
  modes?: string[];
  enabled?: boolean;
}) {
  const queryParams = new URLSearchParams({
    ...(options?.modes?.length && { modes: options.modes.join(',') }),
  }).toString();

  return useQuery({
    queryKey: ['disruptions', options?.modes],
    queryFn: () => api.get<DisruptionsResponse>(`/api/disruptions${queryParams ? `?${queryParams}` : ''}`),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

/**
 * Get disruptions affecting a specific stop
 * Endpoint: GET /api/disruptions/stop/:stopId
 */
export function useStopDisruptions(stopId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['disruptions', 'stop', stopId],
    queryFn: () => api.get<DisruptionsStopResponse>(`/api/disruptions/stop/${encodeURIComponent(stopId!)}`),
    enabled: (options?.enabled ?? true) && !!stopId,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

/**
 * Get disruptions affecting a specific route
 * Endpoint: GET /api/disruptions/route/:routeId
 */
export function useRouteDisruptions(routeId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['disruptions', 'route', routeId],
    queryFn: () => api.get<DisruptionsRouteResponse>(`/api/disruptions/route/${encodeURIComponent(routeId!)}`),
    enabled: (options?.enabled ?? true) && !!routeId,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

/**
 * Get overall network service status
 * Endpoint: GET /api/status
 */
export function useServiceStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['service-status'],
    queryFn: () => api.get<ServiceStatusResponse>('/api/status'),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}
