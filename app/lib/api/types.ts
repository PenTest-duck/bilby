/**
 * API Response Types
 * 
 * This file re-exports types from the shared API schema.
 * The canonical source is: backend/src/types/api-schema.ts
 * A symlink exists at: app/lib/api-schema.ts
 * 
 * Import from '@/lib/api-schema' for the full type definitions,
 * or from this file for backward compatibility.
 */

// Re-export types from the shared schema for backward compatibility
// Note: ApiResponse and ApiError are defined in client.ts, so we exclude them here
export type {
  // Common types (excluding ApiResponse/ApiError which are in client.ts)
  ResponseMeta,
  RealtimeStatus,
  
  // Transport/Domain types
  LocationType,
  Coord,
  ParentLocation,
  Stop,
  RouteProduct,
  Transportation,
  
  // Departures
  Departure,
  DeparturesResponse,
  
  // Disruptions/Alerts
  DisruptionAlert,
  TripAlert,
  DisruptionsResponse,
  DisruptionsStopResponse,
  DisruptionsRouteResponse,
  
  // Service Status
  ModeStatus,
  StatusAlert,
  ServiceStatusResponse,
  
  // Trips
  RankingStrategy,
  StopSequenceItem,
  LegLocation,
  Leg,
  FareTicket,
  Fare,
  EnrichedFare,
  TravelInCarsInfo,
  OccupancyInfo,
  RankingScore,
  Journey,
  RankedJourney,
  TripQuery,
  TripsRequest,
  TripsResponse,
  
  // Stops
  StopsSearchResponse,
  StopsNearbyResponse,
  StopDetailsResponse,
  
  // Auth
  AuthUser,
  AuthVerifyResponse,
  AuthMeResponse,
  
  // User
  UserProfile,
  UserPreferences,
  SavedTrip,
  RecentStop,
  
  // Utilities
  OpalCardType,
  FareBreakdown,
  TransportModeName,
} from '@/lib/api-schema';

// Export the mode maps
export { MODE_CODE_MAP, MODE_NAME_MAP } from '@/lib/api-schema';

/**
 * Common alert type that works with both DisruptionAlert and StatusAlert
 * Used by UI components that can display either type
 */
export type Alert = import('@/lib/api-schema').DisruptionAlert | import('@/lib/api-schema').StatusAlert;

/**
 * @deprecated Use FareBreakdown instead  
 * Kept for backward compatibility
 */
export type FareInfo = import('@/lib/api-schema').FareBreakdown;
