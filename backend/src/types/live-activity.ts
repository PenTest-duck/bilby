/**
 * Live Activity Types
 * 
 * Types for managing iOS Live Activities for journey tracking
 */

import type { Leg } from './api-schema.js';

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
}

/**
 * Journey data stored with a Live Activity registration
 */
export interface LiveActivityJourney {
  tripId: string;
  originId: string;
  destinationId: string;
  legs: Leg[];
  plannedDeparture: string;
  plannedArrival: string;
}

/**
 * Live Activity registration request
 */
export interface LiveActivityRegisterRequest {
  activityId: string;
  pushToken: string;
  journey: LiveActivityJourney;
  attributes: BilbyTripAttributes;
  initialState: ContentState;
}

/**
 * Live Activity stored in Redis
 */
export interface StoredLiveActivity {
  activityId: string;
  pushToken: string;
  journey: LiveActivityJourney;
  attributes: BilbyTripAttributes;
  currentState: ContentState;
  createdAt: string;
  lastUpdatedAt: string;
  userId?: string;
}

/**
 * APNs push notification payload for Live Activity update
 */
export interface LiveActivityPushPayload {
  aps: {
    timestamp: number;
    event: 'update' | 'end';
    'content-state': ContentState;
    'stale-date'?: number;
    'dismissal-date'?: number;
    'relevance-score'?: number;
    alert?: {
      title?: string;
      body?: string;
      sound?: string;
    };
  };
}

/**
 * APNs push notification headers
 */
export interface APNsHeaders {
  'apns-push-type': 'liveactivity';
  'apns-topic': string; // e.g., "com.bilby.app.push-type.liveactivity"
  'apns-priority': '5' | '10';
  'apns-expiration'?: string;
  authorization: string; // Bearer token
}
