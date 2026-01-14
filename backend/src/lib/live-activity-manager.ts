/**
 * Live Activity Manager
 * 
 * Manages the lifecycle of Live Activities:
 * - Stores active activities in Redis
 * - Computes journey state updates based on realtime data
 * - Triggers push notifications for state changes
 */

import { getRedis } from './redis.js'
import { 
  sendLiveActivityUpdate, 
  sendLiveActivityEnd,
  sendJourneyAlert 
} from './push-notification-service.js'
import type { 
  StoredLiveActivity, 
  ContentState, 
  TripPhase,
  LiveActivityJourney,
  BilbyTripAttributes 
} from '../types/live-activity.js'
import type { Leg } from '../types/api-schema.js'

// Redis key prefix for Live Activities
const ACTIVITY_KEY_PREFIX = 'live_activity:';
const ACTIVE_ACTIVITIES_SET = 'live_activities:active';

// Maximum activity duration (8 hours in seconds)
const MAX_ACTIVITY_TTL = 8 * 60 * 60;

/**
 * Register a new Live Activity
 */
export async function registerActivity(
  activityId: string,
  expoPushToken: string,
  journey: LiveActivityJourney,
  attributes: BilbyTripAttributes,
  initialState: ContentState,
  userId?: string
): Promise<StoredLiveActivity> {
  const now = new Date().toISOString();
  
  const activity: StoredLiveActivity = {
    activityId,
    pushToken: expoPushToken,
    journey,
    attributes,
    currentState: initialState,
    createdAt: now,
    lastUpdatedAt: now,
    userId,
  };

  const key = `${ACTIVITY_KEY_PREFIX}${activityId}`
  const redis = await getRedis()
  
  // Store activity with TTL
  await redis.setEx(key, MAX_ACTIVITY_TTL, JSON.stringify(activity))
  
  // Add to active activities set
  await redis.sAdd(ACTIVE_ACTIVITIES_SET, activityId)

  console.log(`Registered Live Activity: ${activityId}`);
  
  return activity;
}

/**
 * Get a stored Live Activity
 */
export async function getActivity(
  activityId: string
): Promise<StoredLiveActivity | null> {
  const key = `${ACTIVITY_KEY_PREFIX}${activityId}`
  const redis = await getRedis()
  const data = await redis.get(key)
  
  if (!data) return null;
  
  return JSON.parse(data) as StoredLiveActivity;
}

/**
 * Update a Live Activity's state
 */
export async function updateActivityState(
  activityId: string,
  newState: Partial<ContentState>,
  sendPush = true
): Promise<{ success: boolean; error?: string }> {
  const activity = await getActivity(activityId);
  
  if (!activity) {
    return { success: false, error: 'Activity not found' };
  }

  // Merge with existing state
  const updatedState: ContentState = {
    ...activity.currentState,
    ...newState,
  };

  // Update stored activity
  const updatedActivity: StoredLiveActivity = {
    ...activity,
    currentState: updatedState,
    lastUpdatedAt: new Date().toISOString(),
  };

  const key = `${ACTIVITY_KEY_PREFIX}${activityId}`
  const redis = await getRedis()
  const ttl = await redis.ttl(key)
  await redis.setEx(key, ttl > 0 ? ttl : MAX_ACTIVITY_TTL, JSON.stringify(updatedActivity))

  // Send push notification if requested
  if (sendPush) {
    const result = await sendLiveActivityUpdate(
      activity.pushToken,
      activityId,
      updatedState
    );
    
    if (!result.success) {
      console.warn(`Failed to send push for activity ${activityId}:`, result.error);
    }
  }

  return { success: true };
}

/**
 * End a Live Activity
 */
export async function endActivity(
  activityId: string,
  finalState?: ContentState,
  message?: { title: string; body: string }
): Promise<{ success: boolean; error?: string }> {
  const activity = await getActivity(activityId);
  
  if (!activity) {
    return { success: false, error: 'Activity not found' };
  }

  // Create completed state
  const completedState: ContentState = finalState || {
    ...activity.currentState,
    phase: 'completed',
    progress: 1.0,
  };

  // Send end notification
  await sendLiveActivityEnd(
    activity.pushToken,
    activityId,
    completedState,
    message
  );

  // Remove from Redis
  const key = `${ACTIVITY_KEY_PREFIX}${activityId}`
  const redis = await getRedis()
  await redis.del(key)
  await redis.sRem(ACTIVE_ACTIVITIES_SET, activityId)

  console.log(`Ended Live Activity: ${activityId}`);

  return { success: true };
}

/**
 * Get all active Live Activity IDs
 */
export async function getActiveActivityIds(): Promise<string[]> {
  const redis = await getRedis()
  return redis.sMembers(ACTIVE_ACTIVITIES_SET)
}

/**
 * Get all active Live Activities
 */
export async function getActiveActivities(): Promise<StoredLiveActivity[]> {
  const ids = await getActiveActivityIds();
  const activities: StoredLiveActivity[] = [];

  for (const id of ids) {
    const activity = await getActivity(id);
    if (activity) {
      activities.push(activity);
    } else {
      // Clean up stale reference
      const redis = await getRedis()
      await redis.sRem(ACTIVE_ACTIVITIES_SET, id)
    }
  }

  return activities;
}

/**
 * Calculate journey progress based on current time and leg data
 */
export function calculateJourneyProgress(
  journey: LiveActivityJourney,
  currentLegIndex: number,
  currentTime: Date
): number {
  const legs = journey.legs.filter(leg => leg.transportation);
  if (legs.length === 0) return 0;

  const totalLegs = legs.length;
  const completedLegs = currentLegIndex;
  
  // Base progress from completed legs
  const legProgress = completedLegs / totalLegs;
  
  // Add progress within current leg based on time
  if (currentLegIndex < legs.length) {
    const currentLeg = legs[currentLegIndex];
    const legStart = new Date(
      currentLeg.origin.departureTimeEstimated || 
      currentLeg.origin.departureTimePlanned || 
      currentTime.toISOString()
    );
    const legEnd = new Date(
      currentLeg.destination.arrivalTimeEstimated || 
      currentLeg.destination.arrivalTimePlanned || 
      currentTime.toISOString()
    );
    
    const legDuration = legEnd.getTime() - legStart.getTime();
    const elapsed = currentTime.getTime() - legStart.getTime();
    
    if (legDuration > 0) {
      const withinLegProgress = Math.min(1, Math.max(0, elapsed / legDuration));
      return legProgress + (withinLegProgress / totalLegs);
    }
  }

  return Math.min(1, legProgress);
}

/**
 * Determine the current trip phase based on journey state
 */
export function determineTripPhase(
  journey: LiveActivityJourney,
  currentLegIndex: number,
  currentTime: Date
): TripPhase {
  const legs = journey.legs;
  if (currentLegIndex >= legs.length) {
    return 'completed';
  }

  const currentLeg = legs[currentLegIndex];
  const isLastLeg = currentLegIndex === legs.length - 1;
  
  // Check if this is a walking leg (no transportation)
  if (!currentLeg.transportation) {
    // Check if next leg exists and has transportation
    if (currentLegIndex < legs.length - 1 && legs[currentLegIndex + 1].transportation) {
      return 'walking_to_stop';
    }
    return 'transferring';
  }

  // Get departure time
  const departureTime = new Date(
    currentLeg.origin.departureTimeEstimated || 
    currentLeg.origin.departureTimePlanned || 
    currentTime.toISOString()
  );
  
  // Get arrival time
  const arrivalTime = new Date(
    currentLeg.destination.arrivalTimeEstimated || 
    currentLeg.destination.arrivalTimePlanned || 
    currentTime.toISOString()
  );

  // Before departure = waiting
  if (currentTime < departureTime) {
    return 'waiting';
  }
  
  // Near arrival on last leg
  if (isLastLeg) {
    const timeToArrival = arrivalTime.getTime() - currentTime.getTime();
    if (timeToArrival <= 2 * 60 * 1000) { // 2 minutes or less
      return 'arriving';
    }
  }
  
  // After departure = on vehicle
  if (currentTime >= departureTime && currentTime < arrivalTime) {
    return 'on_vehicle';
  }
  
  // After arrival = check for transfer
  if (currentTime >= arrivalTime && currentLegIndex < legs.length - 1) {
    return 'transferring';
  }

  return 'completed';
}

/**
 * Calculate delay in minutes between planned and estimated times
 */
export function calculateDelay(
  plannedTime?: string,
  estimatedTime?: string
): number {
  if (!plannedTime || !estimatedTime) return 0;
  
  const planned = new Date(plannedTime);
  const estimated = new Date(estimatedTime);
  const diffMs = estimated.getTime() - planned.getTime();
  
  return Math.round(diffMs / 60000);
}

/**
 * Compute updated state for an activity based on realtime data
 */
export function computeUpdatedState(
  activity: StoredLiveActivity,
  realtimeData?: {
    delayMinutes?: number;
    isCancelled?: boolean;
    currentStopIndex?: number;
    platform?: string;
    alertMessage?: string;
  }
): ContentState {
  const currentTime = new Date();
  const journey = activity.journey;
  const currentState = activity.currentState;
  
  // Determine current leg (simplified - in production would use location/time)
  const currentLegIndex = currentState.currentLeg - 1;
  
  // Calculate new phase
  const phase = determineTripPhase(journey, currentLegIndex, currentTime);
  
  // Calculate progress
  const progress = calculateJourneyProgress(journey, currentLegIndex, currentTime);
  
  // Get current leg for stop information
  const currentLeg = journey.legs[currentLegIndex];
  const transportLegs = journey.legs.filter(l => l.transportation);
  
  // Determine next event time based on phase
  let nextEventTime: string;
  switch (phase) {
    case 'waiting':
      nextEventTime = currentLeg?.origin.departureTimeEstimated || 
                      currentLeg?.origin.departureTimePlanned || 
                      currentTime.toISOString();
      break;
    case 'on_vehicle':
    case 'arriving':
      nextEventTime = currentLeg?.destination.arrivalTimeEstimated || 
                      currentLeg?.destination.arrivalTimePlanned || 
                      currentTime.toISOString();
      break;
    case 'transferring':
      const nextLeg = journey.legs[currentLegIndex + 1];
      nextEventTime = nextLeg?.origin.departureTimeEstimated || 
                      nextLeg?.origin.departureTimePlanned || 
                      currentTime.toISOString();
      break;
    default:
      nextEventTime = journey.plannedArrival;
  }

  // Calculate stops remaining
  const stopsRemaining = currentLeg?.stopSequence?.length 
    ? currentLeg.stopSequence.length - (realtimeData?.currentStopIndex ?? 0) - 1
    : currentState.stopsRemaining;

  // Get delay info
  const delayMinutes = realtimeData?.delayMinutes ?? 
    calculateDelay(
      currentLeg?.origin.departureTimePlanned,
      currentLeg?.origin.departureTimeEstimated
    );

  // Get next line info for transfers
  let nextLineNumber: string | null = null;
  let nextLineModeId: number | null = null;
  let connectionTime: number | null = null;

  if (phase === 'transferring' && currentLegIndex < journey.legs.length - 1) {
    const nextTransportLeg = journey.legs
      .slice(currentLegIndex + 1)
      .find(l => l.transportation);
    
    if (nextTransportLeg) {
      nextLineNumber = nextTransportLeg.transportation?.number || null;
      nextLineModeId = getModeId(nextTransportLeg);
      
      const currentArrival = new Date(
        currentLeg?.destination.arrivalTimeEstimated || 
        currentLeg?.destination.arrivalTimePlanned || 
        currentTime.toISOString()
      );
      const nextDeparture = new Date(
        nextTransportLeg.origin.departureTimeEstimated || 
        nextTransportLeg.origin.departureTimePlanned || 
        currentTime.toISOString()
      );
      connectionTime = Math.round(
        (nextDeparture.getTime() - currentArrival.getTime()) / 60000
      );
    }
  }

  return {
    phase,
    nextEventTime,
    delayMinutes: Math.abs(delayMinutes),
    isDelayed: delayMinutes > 2,
    isCancelled: realtimeData?.isCancelled ?? false,
    currentStopName: currentLeg?.origin.name || 
                     currentLeg?.origin.disassembledName || 
                     currentState.currentStopName,
    nextStopName: currentLeg?.stopSequence?.[1]?.name || 
                  currentLeg?.destination.name || 
                  currentState.nextStopName,
    stopsRemaining,
    platform: realtimeData?.platform || currentState.platform,
    currentLeg: currentLegIndex + 1,
    progress,
    hasAlert: !!realtimeData?.alertMessage,
    alertMessage: realtimeData?.alertMessage || null,
    nextLineNumber,
    nextLineModeId,
    connectionTime,
  };
}

/**
 * Get transport mode ID from leg
 */
function getModeId(leg: Leg): number {
  const modeMap: Record<string, number> = {
    train: 1,
    metro: 2,
    lightRail: 4,
    bus: 5,
    coach: 7,
    ferry: 9,
    schoolBus: 11,
  };
  return modeMap[leg.transportation?.product?.class ?? 'train'] ?? 1;
}

/**
 * Process all active activities and send updates if needed
 * This should be called periodically (e.g., every 30 seconds)
 */
export async function processActiveActivities(): Promise<{
  processed: number;
  updated: number;
  ended: number;
  errors: number;
}> {
  const activities = await getActiveActivities();
  let updated = 0;
  let ended = 0;
  let errors = 0;

  for (const activity of activities) {
    try {
      // Compute new state
      const newState = computeUpdatedState(activity);
      
      // Check if state has meaningfully changed
      const hasChanged = 
        newState.phase !== activity.currentState.phase ||
        newState.stopsRemaining !== activity.currentState.stopsRemaining ||
        newState.delayMinutes !== activity.currentState.delayMinutes ||
        newState.isCancelled !== activity.currentState.isCancelled ||
        Math.abs(newState.progress - activity.currentState.progress) > 0.05;

      if (newState.phase === 'completed') {
        // End the activity
        await endActivity(activity.activityId, newState, {
          title: 'Journey Complete',
          body: `You've arrived at ${activity.attributes.destinationName}`,
        });
        ended++;
      } else if (hasChanged) {
        // Update the activity
        await updateActivityState(activity.activityId, newState, true);
        updated++;
      }
    } catch (error) {
      console.error(`Error processing activity ${activity.activityId}:`, error);
      errors++;
    }
  }

  return {
    processed: activities.length,
    updated,
    ended,
    errors,
  };
}
