/**
 * Trip phase representing the current state of the journey
 */
export type TripPhase =
  | 'walking_to_stop'
  | 'waiting'
  | 'on_vehicle'
  | 'transferring'
  | 'arriving'
  | 'completed';

/**
 * Static attributes for the Live Activity (set at start, don't change)
 */
export interface BilbyTripAttributes {
  tripId: string;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  lineNumber: string;
  lineName: string;
  modeId: number;
  lineColor: string;
  totalLegs: number;
  plannedArrival: string; // ISO 8601 date string
}

/**
 * Dynamic content state that updates in real-time
 */
export interface ContentState {
  phase: TripPhase;
  nextEventTime: string; // ISO 8601 date string
  delayMinutes: number;
  isDelayed: boolean;
  isCancelled: boolean;
  currentStopName: string;
  nextStopName: string;
  stopsRemaining: number;
  platform: string | null;
  currentLeg: number;
  progress: number; // 0.0 - 1.0
  hasAlert: boolean;
  alertMessage: string | null;
  nextLineNumber: string | null;
  nextLineModeId: number | null;
  connectionTime: number | null;
  
  // Navigation (for walking legs)
  walkingDistanceMeters?: number;
  walkingDirection?: string | null;
  walkingBearing?: number | null;
  walkingEtaSeconds?: number;
}

/**
 * Result from starting a Live Activity
 */
export interface StartActivityResult {
  activityId: string;
  pushToken: string | null;
}

/**
 * Info about an active Live Activity
 */
export interface ActiveActivityInfo {
  activityId: string;
  tripId: string;
  destinationName: string;
  pushToken: string | null;
}

/**
 * Dismissal policy for ending an activity
 */
export type DismissalPolicy = 'default' | 'immediate';
