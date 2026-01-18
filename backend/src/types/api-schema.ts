/**
 * Bilby API Schema - Shared Types
 * ================================
 * 
 * This file serves as the single source of truth for API request/response types.
 * It is shared between the backend and the Expo mobile app via symlink.
 * 
 * IMPORTANT: When modifying this file, ensure both backend and app remain compatible.
 * 
 * API Base URL: /api
 * 
 * Available Endpoints:
 * --------------------
 * PUBLIC (no auth required):
 *   GET  /api/health                    - Health check
 *   GET  /api/status                    - Network service status summary
 *   GET  /api/stops/search              - Search stops by name
 *   GET  /api/stops/nearby              - Find stops near coordinates
 *   GET  /api/stops/:stopId             - Get stop details
 *   GET  /api/departures/:stopId        - Get live departures
 *   GET  /api/disruptions               - Get service disruptions/alerts
 *   GET  /api/disruptions/stop/:stopId  - Get disruptions for a stop
 *   GET  /api/disruptions/route/:routeId - Get disruptions for a route
 *   GET  /api/trips                     - Plan a trip (GET)
 *   POST /api/trips                     - Plan a trip (POST)
 * 
 * AUTHENTICATED (requires Bearer token):
 *   POST /api/auth/verify               - Verify token and get user info
 *   GET  /api/auth/me                   - Get current user details
 *   GET  /api/user/profile              - Get user profile
 *   PUT  /api/user/profile              - Update user profile
 *   GET  /api/user/preferences          - Get user preferences
 *   PUT  /api/user/preferences          - Update user preferences
 *   GET  /api/user/trips                - List saved trips
 *   POST /api/user/trips                - Save a new trip
 *   GET  /api/user/trips/:id            - Get a saved trip
 *   PUT  /api/user/trips/:id            - Update a saved trip
 *   DELETE /api/user/trips/:id          - Delete a saved trip
 *   POST /api/user/trips/:id/use        - Mark trip as recently used
 *   GET  /api/user/recent-stops         - List recent stops
 *   POST /api/user/recent-stops         - Add a recent stop
 *   DELETE /api/user/recent-stops/:id   - Remove a recent stop
 * 
 * DEV ONLY:
 *   GET  /api/pollers/status            - Get poller status
 *   POST /api/pollers/start             - Start pollers
 *   POST /api/pollers/stop              - Stop pollers
 *   POST /api/pollers/trigger/:feed     - Trigger a specific poller
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * Standard API response wrapper
 * All API responses follow this structure
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response payload (present on success) */
  data?: T;
  /** Error details (present on failure) */
  error?: ApiError;
  /** Response metadata */
  meta?: ResponseMeta;
}

/**
 * API error structure
 * Returned in the `error` field when success=false
 */
export interface ApiError {
  /** Machine-readable error code (e.g., 'NOT_FOUND', 'UNAUTHORIZED') */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details (optional) */
  details?: unknown;
}

/**
 * Response metadata
 * Included in most successful responses
 */
export interface ResponseMeta {
  /** Unix timestamp (milliseconds) when response was generated */
  timestamp: number;
  /** Realtime data status */
  realtimeStatus?: RealtimeStatus;
  /** Age of realtime data in seconds */
  realtimeAge?: number;
}

/** Realtime data freshness status */
export type RealtimeStatus = 'fresh' | 'stale' | 'unavailable';

// =============================================================================
// TRANSPORT / DOMAIN TYPES
// =============================================================================

/**
 * Location types for stops and places
 */
export type LocationType = 'stop' | 'platform' | 'poi' | 'street' | 'locality' | 'suburb' | 'singlehouse' | 'unknown';

/**
 * Coordinate pair [latitude, longitude]
 */
export type Coord = [number, number];

/**
 * Parent location reference (e.g., station for platform)
 */
export interface ParentLocation {
  id?: string;
  name?: string;
  type?: LocationType;
}

/**
 * Stop/Station/Platform
 * Represents a transit stop or location
 */
export interface Stop {
  /** Unique stop identifier (TfNSW stop ID) */
  id: string;
  /** Full display name */
  name: string;
  /** Short/simplified name */
  disassembledName?: string;
  /** Location type */
  type: LocationType;
  /** Geographic coordinates [lat, lng] */
  coord?: Coord;
  /** Transport modes available at this stop (TfNSW mode codes) */
  modes?: number[];
  /** Parent location (e.g., station for platforms) */
  parent?: ParentLocation;
  /** Search match quality (0-1000, only in search results) */
  matchQuality?: number;
  /** Whether this is the best match (only in search results) */
  isBest?: boolean;
  /** Additional properties from TfNSW */
  properties?: Record<string, unknown>;
}

/**
 * Route/Line product information
 */
export interface RouteProduct {
  /** Product class (corresponds to mode) */
  class?: number;
  /** Product name (e.g., "Sydney Trains") */
  name?: string;
  /** Icon identifier */
  iconId?: number;
}

/**
 * Transportation/Route/Line
 * Information about a specific service
 */
export interface Transportation {
  /** Route/line identifier */
  id?: string;
  /** Full route name */
  name?: string;
  /** Short route name/number */
  disassembledName?: string;
  /** Line number (e.g., "T1", "333") */
  number?: string;
  /** Icon identifier */
  iconId?: number;
  /** Route description */
  description?: string;
  /** Product info */
  product?: RouteProduct;
  /** Service destination */
  destination?: {
    id?: string;
    name?: string;
    type?: LocationType;
  };
}

// =============================================================================
// HEALTH CHECK - GET /api/health
// =============================================================================

/**
 * GET /api/health
 * 
 * Health check endpoint to verify API and service status.
 * No authentication required.
 * 
 * Response: ApiResponse<HealthData> (but actually returns HealthResponse directly)
 */
export interface HealthResponse {
  /** Overall system status */
  status: 'ok' | 'degraded';
  /** ISO timestamp */
  timestamp: string;
  /** Individual service statuses */
  services: {
    redis: {
      connected: boolean;
      latencyMs?: number;
    };
  };
  /** API version */
  version: string;
}

// =============================================================================
// SERVICE STATUS - GET /api/status
// =============================================================================

/**
 * Mode status summary
 */
export interface ModeStatus {
  /** TfNSW mode ID */
  modeId: number;
  /** Human-readable mode name */
  modeName: string;
  /** Status for this mode */
  status: 'normal' | 'minor' | 'major';
  /** Number of active alerts affecting this mode */
  alertCount: number;
}

/**
 * Simplified alert for status response
 */
export interface StatusAlert {
  id: string;
  title: string;
  description?: string;
  severity: 'info' | 'warning' | 'severe' | 'unknown';
  effect?: string;
  cause?: string;
  affectedRoutes: string[];
  affectedStops: string[];
}

/**
 * GET /api/status
 * 
 * Get overall network service status summary.
 * Aggregates disruption data to provide a quick status overview.
 * No authentication required.
 */
export interface ServiceStatusResponse {
  /** Overall network status */
  status: 'normal' | 'minor' | 'major';
  /** Human-readable status message */
  message?: string;
  /** Top alerts (limited to 10) */
  alerts: StatusAlert[];
  /** Status breakdown by transport mode */
  byMode: ModeStatus[];
  /** Total number of active alerts */
  totalAlerts: number;
}

// =============================================================================
// STOPS - /api/stops/*
// =============================================================================

/**
 * GET /api/stops/search?q={query}&limit={limit}
 * 
 * Search for stops by name.
 * 
 * Query Parameters:
 * - q (required): Search query string
 * - limit (optional): Max results (default: 10)
 */
export interface StopsSearchRequest {
  /** Search query (required, min 1 character) */
  q: string;
  /** Maximum results to return (default: 10) */
  limit?: number;
}

export interface StopsSearchResponse {
  /** List of matching stops */
  stops: Stop[];
  /** Original query */
  query: string;
  /** Number of results */
  count: number;
}

/**
 * GET /api/stops/nearby?lat={lat}&lng={lng}&radius={radius}
 * 
 * Find stops near geographic coordinates.
 * 
 * Query Parameters:
 * - lat (required): Latitude
 * - lng (required): Longitude  
 * - radius (optional): Search radius in meters (default: 500)
 */
export interface StopsNearbyRequest {
  /** Latitude (required) */
  lat: number;
  /** Longitude (required) */
  lng: number;
  /** Search radius in meters (default: 500) */
  radius?: number;
}

export interface StopsNearbyResponse {
  /** List of nearby stops (sorted by distance) */
  stops: Stop[];
  /** Search center coordinates */
  location: { lat: number; lng: number };
  /** Search radius used */
  radius: number;
  /** Number of results */
  count: number;
}

/**
 * GET /api/stops/:stopId
 * 
 * Get detailed information about a specific stop.
 * 
 * Path Parameters:
 * - stopId: The TfNSW stop ID
 */
export interface StopDetailsResponse {
  /** Stop details */
  stop: Stop;
}

// =============================================================================
// DEPARTURES - GET /api/departures/:stopId
// =============================================================================

/**
 * Departure information
 * Represents a single scheduled/realtime departure
 */
export interface Departure {
  /** Departure location */
  location?: Stop;
  /** Scheduled departure time (ISO string) */
  departureTimePlanned?: string;
  /** Estimated departure time with realtime (ISO string) */
  departureTimeEstimated?: string;
  /** Scheduled arrival time (ISO string) */
  arrivalTimePlanned?: string;
  /** Estimated arrival time (ISO string) */
  arrivalTimeEstimated?: string;
  /** Route/service information */
  transportation?: Transportation;
  /** Service alerts affecting this departure */
  infos?: TripAlert[];
  /** Additional properties */
  properties?: Record<string, unknown>;
  /** Whether realtime data is available for this departure */
  isRealtimeControlled?: boolean;
  /** Whether the service is cancelled */
  cancelled?: boolean;
  /** Delay in minutes (positive = late, negative = early) */
  realtimeDelayMinutes?: number;
  /** Platform/stand number */
  platform?: string;
}

/**
 * GET /api/departures/:stopId?limit={limit}&modes={modes}&platform={platform}
 * 
 * Get live departures from a stop with realtime data.
 * 
 * Path Parameters:
 * - stopId: The TfNSW stop ID
 * 
 * Query Parameters:
 * - limit (optional): Max departures (default: 20)
 * - modes (optional): Comma-separated mode filter (e.g., "train,bus")
 * - platform (optional): Filter by platform ID
 */
export interface DeparturesRequest {
  /** Maximum departures to return (default: 20) */
  limit?: number;
  /** Filter by transport modes (comma-separated names: train,bus,ferry,metro,light_rail,coach) */
  modes?: string;
  /** Filter by platform ID */
  platform?: string;
}

export interface DeparturesResponse {
  /** Stop information */
  stop: Stop;
  /** List of upcoming departures */
  departures: Departure[];
  /** Number of departures returned */
  count: number;
}

// =============================================================================
// DISRUPTIONS/ALERTS - /api/disruptions/*
// =============================================================================

/** Alert priority levels from TfNSW (descending order of importance) */
export type AlertPriority = 'veryHigh' | 'high' | 'normal' | 'low' | 'veryLow';

/** Alert severity levels mapped from priority */
export type AlertSeverity = 'severe' | 'warning' | 'info' | 'unknown';

/** Alert type categories derived from content analysis */
export type AlertType = 
  | 'infrastructure'   // Lift/escalator issues
  | 'cancellation'     // Service cancellations
  | 'delay'            // Service delays
  | 'closure'          // Station/line closures
  | 'planned_works'    // Planned trackwork/maintenance
  | 'info';            // General information

/** Priority to numeric value mapping for sorting (lower = more important) */
export const ALERT_PRIORITY_ORDER: Record<AlertPriority, number> = {
  veryHigh: 1,
  high: 2,
  normal: 3,
  low: 4,
  veryLow: 5,
};

/** Alert type to display config */
export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: string }> = {
  infrastructure: { label: 'Infrastructure', icon: 'wrench.and.screwdriver.fill' },
  cancellation: { label: 'Cancellation', icon: 'xmark.octagon.fill' },
  delay: { label: 'Delay', icon: 'clock.badge.exclamationmark.fill' },
  closure: { label: 'Closure', icon: 'door.left.hand.closed' },
  planned_works: { label: 'Planned Works', icon: 'calendar.badge.clock' },
  info: { label: 'Information', icon: 'info.circle.fill' },
};

/**
 * Combined alert from GTFS and Trip Planner sources
 */
export interface DisruptionAlert {
  /** Unique alert identifier */
  id: string;
  /** Alert title/header */
  title: string;
  /** Detailed description */
  description?: string;
  /** Link for more information */
  url?: string;
  /** Severity level (mapped from priority) */
  severity: AlertSeverity;
  /** TfNSW priority level (for sorting) */
  priority?: AlertPriority;
  /** Alert type category */
  type?: AlertType;
  /** Effect on service (GTFS effect) */
  effect: string;
  /** Cause of disruption (GTFS cause) */
  cause: string;
  /** Time periods when alert is active */
  activePeriods: { start?: number; end?: number }[];
  /** Affected route IDs */
  affectedRoutes: string[];
  /** Affected stop IDs */
  affectedStops: string[];
  /** Affected lines with detailed info */
  affectedLines?: {
    id?: string;
    name?: string;
    number?: string;
    mode?: number;
  }[];
  /** Validity periods */
  validity?: { from?: string; to?: string }[];
  /** Data source */
  source?: 'gtfs' | 'trip_planner' | 'trip_planner_add_info';
  /** Last update timestamp (Unix seconds) */
  updatedAt?: number;
}

/** Alert in trip/departure context */
export interface TripAlert {
  id?: string;
  title?: string;
  content?: string;
  priority?: 'veryLow' | 'low' | 'normal' | 'high' | 'veryHigh';
  url?: string;
}

/**
 * GET /api/disruptions?modes={modes}
 * 
 * Get all active service disruptions/alerts.
 * 
 * Query Parameters:
 * - modes (optional): Comma-separated mode filter (e.g., "train,bus")
 */
export interface DisruptionsRequest {
  /** Filter by transport modes (comma-separated) */
  modes?: string;
}

export interface DisruptionsResponse {
  /** List of active alerts */
  alerts: DisruptionAlert[];
  /** Number of alerts */
  count: number;
  /** Applied filters */
  filters: {
    modes?: string[];
  };
}

/**
 * GET /api/disruptions/stop/:stopId
 * 
 * Get disruptions affecting a specific stop.
 */
export interface DisruptionsStopResponse {
  alerts: DisruptionAlert[];
  count: number;
  stopId: string;
}

/**
 * GET /api/disruptions/route/:routeId
 * 
 * Get disruptions affecting a specific route.
 */
export interface DisruptionsRouteResponse {
  alerts: DisruptionAlert[];
  count: number;
  routeId: string;
}

// =============================================================================
// TRIPS - /api/trips
// =============================================================================

/** Ranking strategy for trip planning */
export type RankingStrategy = 'best' | 'fastest' | 'least_walking' | 'fewest_transfers';

/**
 * Stop in journey leg stop sequence
 */
export interface StopSequenceItem {
  id?: string;
  name?: string;
  disassembledName?: string;
  type?: LocationType;
  coord?: Coord;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  properties?: Record<string, unknown>;
}

/**
 * Journey leg location (origin/destination of a leg)
 */
export interface LegLocation {
  id?: string;
  name?: string;
  disassembledName?: string;
  type?: LocationType;
  coord?: Coord;
  parent?: ParentLocation;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  properties?: Record<string, unknown>;
}

/**
 * Journey leg (one segment of a trip)
 */
export interface Leg {
  /** Duration in seconds */
  duration?: number;
  /** Distance in meters */
  distance?: number;
  /** Leg origin */
  origin: LegLocation;
  /** Leg destination */
  destination: LegLocation;
  /** Transport information (null for walking) */
  transportation?: Transportation;
  /** Intermediate stops */
  stopSequence?: StopSequenceItem[];
  /** Path coordinates for map display */
  coords?: Coord[];
  /** Additional properties */
  properties?: Record<string, unknown>;
  /** Service alerts for this leg */
  infos?: TripAlert[];
  /** Whether realtime data is controlling this leg */
  isRealtimeControlled?: boolean;
}

/**
 * Fare ticket information
 */
export interface FareTicket {
  id?: string;
  name?: string;
  person?: string;
  priceBrutto?: number;
  priceNetto?: number;
  fromLeg?: number;
  toLeg?: number;
  properties?: Record<string, unknown>;
}

/**
 * Fare information for a journey
 */
export interface Fare {
  tickets?: FareTicket[];
  zones?: unknown[];
}

/**
 * GraphQL enriched fare data (from unofficial API)
 * Only available when ENABLE_GRAPHQL_FARES=true
 */
export interface EnrichedFare {
  /** Total journey fare in dollars */
  total: number;
  /** Per-leg fare breakdown */
  legs: {
    /** Adult fare amount */
    adult?: number;
    /** Child fare amount */
    child?: number;
    /** Concession fare amount */
    concession?: number;
    /** Senior fare amount */
    senior?: number;
    /** Station access fee (airport stations) */
    stationAccessFee?: number;
  }[];
}

/**
 * Travel in cars info for trains
 * Indicates which carriages to board for interchange
 */
export interface TravelInCarsInfo {
  /** Leg index this applies to */
  legIndex: number;
  /** Total number of cars */
  numberOfCars?: string;
  /** Board in cars from */
  from?: string;
  /** Board in cars to */
  to?: string;
  /** Display message */
  message?: string;
}

/**
 * Occupancy info for a leg
 */
export interface OccupancyInfo {
  /** Leg index */
  legIndex: number;
  /** Occupancy status (e.g., 'MANY_SEATS', 'FEW_SEATS', 'STANDING_ROOM') */
  status: string;
}

/**
 * Ranking score breakdown (explainability)
 */
export interface RankingScore {
  /** Total ranking score (higher is better) */
  total: number;
  /** Individual scoring factors */
  factors: {
    arrivalTime: { value: number; weight: number; score: number };
    duration: { value: number; weight: number; score: number };
    walking: { value: number; weight: number; score: number };
    transfers: { value: number; weight: number; score: number };
    reliability: { value: number; weight: number; score: number };
  };
  /** Human-readable explanation */
  why: string;
}

/**
 * Complete journey
 */
export interface Journey {
  /** Whether this is an additional/alternative journey */
  isAdditional?: boolean;
  /** Number of interchanges/transfers */
  interchanges?: number;
  /** Journey legs */
  legs: Leg[];
  /** Fare information */
  fare?: Fare;
}

/**
 * Journey with ranking metadata
 */
export interface RankedJourney extends Journey {
  /** Ranking score breakdown */
  ranking: RankingScore;
  /** Total realtime delay in minutes */
  realtimeDelayMinutes?: number;
  /** Whether any legs have cancellations */
  hasCancellations?: boolean;
  /** Alerts affecting this journey */
  alerts?: DisruptionAlert[];
  /** Enriched fare from GraphQL (null if unavailable) */
  enrichedFare?: EnrichedFare | null;
  /** Travel in cars info for train legs */
  travelInCars?: TravelInCarsInfo[];
  /** Occupancy info per leg */
  occupancy?: OccupancyInfo[];
  /** Realtime trip IDs from GraphQL (for vehicle matching) */
  realtimeTripIds?: string[];
}

/**
 * Trip query parameters (returned in response for reference)
 */
export interface TripQuery {
  /** Origin stop ID or coordinates (lat,lng) */
  from: string;
  /** Destination stop ID or coordinates (lat,lng) */
  to: string;
  /** Departure/arrival time (ISO string) */
  when: string;
  /** If true, 'when' is arrival time; if false, departure time */
  arriveBy?: boolean;
  /** Ranking strategy */
  strategy?: RankingStrategy;
  /** Mode filters */
  modes?: string[];
  /** Require wheelchair accessibility */
  accessible?: boolean;
}

/**
 * GET /api/trips?from={from}&to={to}&when={when}&arriveBy={arriveBy}&strategy={strategy}&modes={modes}&accessible={accessible}
 * POST /api/trips (same params in body)
 * 
 * Plan a trip with ranked options.
 * 
 * Query/Body Parameters:
 * - from (required): Origin stop ID or coordinates "lat,lng"
 * - to (required): Destination stop ID or coordinates "lat,lng"
 * - when (optional): ISO datetime or "now" (default: now)
 * - arriveBy (optional): If "true", time is arrival time (default: false = departure time)
 * - strategy (optional): Ranking strategy (default: "best")
 * - modes (optional): Comma-separated mode filter
 * - accessible (optional): If "true", prefer accessible routes
 */
export interface TripsRequest {
  /** Origin stop ID or "lat,lng" coordinates (required) */
  from: string;
  /** Destination stop ID or "lat,lng" coordinates (required) */
  to: string;
  /** 
   * Departure/arrival time
   * - ISO 8601 datetime string (e.g., "2024-01-15T09:30:00+11:00")
   * - "now" for current time
   * - If omitted, defaults to current time
   */
  when?: string;
  /** 
   * Time interpretation
   * - false (default): 'when' is departure time
   * - true: 'when' is arrival time
   */
  arriveBy?: boolean;
  /** 
   * Ranking strategy
   * - "best": balanced recommendation (default)
   * - "fastest": minimize total journey time
   * - "least_walking": minimize walking distance
   * - "fewest_transfers": minimize interchanges
   */
  strategy?: RankingStrategy;
  /** Transport modes to include (comma-separated or array) */
  modes?: string | string[];
  /** Prefer wheelchair accessible routes */
  accessible?: boolean;
}

export interface TripsResponse {
  /** Best recommended journey (null if no journeys found) */
  best: RankedJourney | null;
  /** Alternative journey options */
  alternatives: RankedJourney[];
  /** Original query parameters */
  query: TripQuery;
  /** Total journey options found */
  totalOptions: number;
  /** Message when no journeys found */
  message?: string;
}

// =============================================================================
// AUTH - /api/auth/*
// =============================================================================

/**
 * User information from auth token
 */
export interface AuthUser {
  /** User UUID */
  id: string;
  /** User email */
  email?: string;
  /** User role */
  role?: string;
}

/**
 * POST /api/auth/verify
 * 
 * Verify authentication token and return user info.
 * Requires: Authorization header with Bearer token
 */
export interface AuthVerifyResponse {
  /** Authenticated user info */
  user: AuthUser;
  /** User profile (may be null if not created) */
  profile: UserProfile | null;
}

/**
 * GET /api/auth/me
 * 
 * Get current authenticated user details.
 * Requires: Authorization header with Bearer token
 */
export interface AuthMeResponse {
  /** Authenticated user info */
  user: AuthUser;
  /** User profile */
  profile: UserProfile | null;
  /** User preferences */
  preferences: UserPreferences | null;
}

// =============================================================================
// USER PROFILE - /api/user/profile
// =============================================================================

/**
 * User profile data
 */
export interface UserProfile {
  /** User UUID (same as auth user ID) */
  id: string;
  /** Display name */
  display_name?: string | null;
  /** Home stop ID for quick access */
  home_stop_id?: string | null;
  /** Work stop ID for quick access */
  work_stop_id?: string | null;
  /** Profile creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * GET /api/user/profile
 * 
 * Get user profile.
 * Requires: Authorization header with Bearer token
 */
export interface UserProfileResponse {
  profile: UserProfile;
}

/**
 * PUT /api/user/profile
 * 
 * Update user profile (partial update supported).
 * Requires: Authorization header with Bearer token
 */
export interface UserProfileUpdateRequest {
  /** New display name */
  display_name?: string;
  /** New home stop ID */
  home_stop_id?: string | null;
  /** New work stop ID */
  work_stop_id?: string | null;
}

// =============================================================================
// USER PREFERENCES - /api/user/preferences
// =============================================================================

/**
 * User preferences data
 */
export interface UserPreferences {
  /** User UUID */
  user_id: string;
  /** Default ranking strategy */
  default_strategy?: string | null;
  /** Preferred transport modes */
  preferred_modes?: string[] | null;
  /** Require accessible routes */
  accessibility_required?: boolean | null;
  /** Enable push notifications */
  notifications_enabled?: boolean | null;
  /** UI theme preference */
  theme?: string | null;
  /** Opal card type for fare display */
  opal_card_type?: OpalCardType | null;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * GET /api/user/preferences
 * 
 * Get user preferences (creates defaults if not exist).
 * Requires: Authorization header with Bearer token
 */
export interface UserPreferencesResponse {
  preferences: UserPreferences;
}

/**
 * PUT /api/user/preferences
 * 
 * Update user preferences (partial update supported).
 * Requires: Authorization header with Bearer token
 */
export interface UserPreferencesUpdateRequest {
  default_strategy?: RankingStrategy;
  preferred_modes?: string[];
  accessibility_required?: boolean;
  notifications_enabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
  opal_card_type?: OpalCardType;
}

// =============================================================================
// USER SAVED TRIPS - /api/user/trips
// =============================================================================

/**
 * Saved trip data
 */
export interface SavedTrip {
  /** Trip UUID */
  id: string;
  /** User UUID */
  user_id: string;
  /** User-defined trip name */
  name: string;
  /** Origin stop ID */
  origin_id: string;
  /** Origin stop name (cached) */
  origin_name: string;
  /** Destination stop ID */
  destination_id: string;
  /** Destination stop name (cached) */
  destination_name: string;
  /** Preferred ranking strategy for this trip */
  preferred_strategy?: string | null;
  /** Whether this trip is marked as favorite */
  is_favorite?: boolean | null;
  /** Last time this trip was used */
  last_used_at?: string | null;
  /** Trip creation timestamp */
  created_at: string;
}

/**
 * GET /api/user/trips
 * 
 * List all saved trips for the user.
 * Sorted by: favorites first, then by last used, then by created date.
 * Requires: Authorization header with Bearer token
 */
export interface UserTripsListResponse {
  trips: SavedTrip[];
  count: number;
}

/**
 * POST /api/user/trips
 * 
 * Save a new trip.
 * Requires: Authorization header with Bearer token
 */
export interface UserTripCreateRequest {
  /** User-defined name (required) */
  name: string;
  /** Origin stop ID (required) */
  origin_id: string;
  /** Origin stop name (required) */
  origin_name: string;
  /** Destination stop ID (required) */
  destination_id: string;
  /** Destination stop name (required) */
  destination_name: string;
  /** Preferred ranking strategy */
  preferred_strategy?: RankingStrategy;
  /** Mark as favorite */
  is_favorite?: boolean;
}

export interface UserTripCreateResponse {
  trip: SavedTrip;
}

/**
 * GET /api/user/trips/:id
 * 
 * Get a specific saved trip.
 * Requires: Authorization header with Bearer token
 */
export interface UserTripDetailsResponse {
  trip: SavedTrip;
}

/**
 * PUT /api/user/trips/:id
 * 
 * Update a saved trip (partial update supported).
 * Requires: Authorization header with Bearer token
 */
export interface UserTripUpdateRequest {
  name?: string;
  origin_id?: string;
  origin_name?: string;
  destination_id?: string;
  destination_name?: string;
  preferred_strategy?: RankingStrategy;
  is_favorite?: boolean;
}

export interface UserTripUpdateResponse {
  trip: SavedTrip;
}

/**
 * DELETE /api/user/trips/:id
 * 
 * Delete a saved trip.
 * Requires: Authorization header with Bearer token
 */
export interface UserTripDeleteResponse {
  deleted: boolean;
}

/**
 * POST /api/user/trips/:id/use
 * 
 * Mark a trip as recently used (updates last_used_at).
 * Requires: Authorization header with Bearer token
 */
export interface UserTripUseResponse {
  trip: SavedTrip;
}

// =============================================================================
// USER RECENT STOPS - /api/user/recent-stops
// =============================================================================

/**
 * Recent stop data
 */
export interface RecentStop {
  /** Record UUID */
  id: string;
  /** User UUID */
  user_id: string;
  /** Stop ID */
  stop_id: string;
  /** Stop name (cached) */
  stop_name: string;
  /** Number of times this stop was used */
  use_count?: number | null;
  /** Last time this stop was used */
  used_at: string;
}

/**
 * GET /api/user/recent-stops
 * 
 * List recent stops (max 20, sorted by recency).
 * Requires: Authorization header with Bearer token
 */
export interface UserRecentStopsResponse {
  stops: RecentStop[];
  count: number;
}

/**
 * POST /api/user/recent-stops
 * 
 * Add/update a recent stop.
 * If stop already exists, increments use_count and updates used_at.
 * Requires: Authorization header with Bearer token
 */
export interface UserRecentStopCreateRequest {
  /** Stop ID (required) */
  stop_id: string;
  /** Stop name (required) */
  stop_name: string;
}

export interface UserRecentStopCreateResponse {
  stop: RecentStop;
}

/**
 * DELETE /api/user/recent-stops/:id
 * 
 * Remove a stop from recent history.
 * Requires: Authorization header with Bearer token
 */
export interface UserRecentStopDeleteResponse {
  deleted: boolean;
}

// =============================================================================
// POLLERS (DEV ONLY) - /api/pollers/*
// =============================================================================

/**
 * Poller status information
 */
export interface PollerStatus {
  name: string;
  running: boolean;
  lastRun?: number;
  lastSuccess?: number;
  errorCount: number;
  itemCount: number;
}

/**
 * GET /api/pollers/status
 * 
 * Get status of all background pollers.
 * Note: Also works in production for monitoring.
 */
export interface PollersStatusResponse {
  orchestrator: {
    running: boolean;
    startedAt: number | null;
    uptime: number | null;
  };
  pollers: PollerStatus[];
  cache: {
    keys: number;
    memory: string;
  } | null;
  redisConfigured: boolean;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Opal card types for fare calculations
 */
export type OpalCardType = 'adult' | 'child' | 'concession' | 'senior' | 'student';

/**
 * Fare breakdown by card type
 */
export interface FareBreakdown {
  adult: number;
  child: number;
  concession: number;
  senior: number;
  student: number;
  peakMultiplier?: number;
  isPeak?: boolean;
}

/**
 * Transport mode names
 * These correspond to TfNSW mode names used in API filters
 */
export type TransportModeName = 
  | 'train' 
  | 'metro' 
  | 'bus' 
  | 'ferry' 
  | 'light_rail' 
  | 'coach' 
  | 'school_bus';

/**
 * Map of TfNSW mode codes to mode names
 */
export const MODE_CODE_MAP: Record<number, TransportModeName> = {
  1: 'train',
  2: 'metro',
  4: 'light_rail',
  5: 'bus',
  7: 'coach',
  9: 'ferry',
  11: 'school_bus',
};

/**
 * Map of mode names to TfNSW mode codes
 */
export const MODE_NAME_MAP: Record<TransportModeName, number> = {
  train: 1,
  metro: 2,
  light_rail: 4,
  bus: 5,
  coach: 7,
  ferry: 9,
  school_bus: 11,
};
