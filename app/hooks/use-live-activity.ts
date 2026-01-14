import { useState, useEffect, useCallback } from 'react';
import * as LiveActivity from '../modules/expo-live-activity/src';
import type {
  BilbyTripAttributes,
  ContentState,
  ActiveActivityInfo,
  TripPhase,
} from '../modules/expo-live-activity/src';
import type { RankedJourney, Leg } from '@/lib/api-schema';

export type { TripPhase, ContentState, BilbyTripAttributes };

interface UseLiveActivityReturn {
  isSupported: boolean;
  isEnabled: boolean;
  activeActivity: ActiveActivityInfo | null;
  startActivity: (journey: RankedJourney) => Promise<string | null>;
  updateActivity: (state: Partial<ContentState>) => Promise<boolean>;
  endActivity: (showFinalState?: boolean) => Promise<boolean>;
  refreshActiveActivities: () => void;
}

/**
 * Helper to get transport mode ID from leg
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
 * Helper to get line color from leg
 */
function getLineColor(leg: Leg): string {
  // Default colors by mode
  const modeColors: Record<number, string> = {
    1: '#F99D1C', // Train - orange
    2: '#009B77', // Metro - teal
    4: '#BE1E2D', // Light Rail - red
    5: '#00B5EF', // Bus - blue
    7: '#742283', // Coach - purple
    9: '#5AB031', // Ferry - green
  };
  
  return modeColors[getModeId(leg)] ?? '#666666';
}

/**
 * Calculate delay in minutes from planned vs estimated times
 */
function calculateDelay(planned?: string, estimated?: string): number {
  if (!planned || !estimated) return 0;
  const plannedDate = new Date(planned);
  const estimatedDate = new Date(estimated);
  const diffMs = estimatedDate.getTime() - plannedDate.getTime();
  return Math.round(diffMs / 60000);
}

/**
 * Get platform from leg location properties
 */
function getPlatform(location: Leg['origin']): string | null {
  const props = location.properties as Record<string, unknown> | undefined;
  if (props?.platform) return String(props.platform);
  if (props?.STOP_POINT_PLANNED_BAY) return String(props.STOP_POINT_PLANNED_BAY);
  return null;
}

/**
 * Convert a Journey to Live Activity attributes
 */
function journeyToAttributes(journey: RankedJourney): BilbyTripAttributes {
  const firstLeg = journey.legs.find(l => l.transportation) ?? journey.legs[0];
  const origin = journey.legs[0].origin;
  const destination = journey.legs[journey.legs.length - 1].destination;
  
  return {
    tripId: `trip-${Date.now()}`,
    originId: origin.id ?? '',
    originName: origin.name ?? origin.disassembledName ?? 'Origin',
    destinationId: destination.id ?? '',
    destinationName: destination.name ?? destination.disassembledName ?? 'Destination',
    lineNumber: firstLeg.transportation?.number ?? firstLeg.transportation?.disassembledName ?? '',
    lineName: firstLeg.transportation?.product?.name ?? '',
    modeId: getModeId(firstLeg),
    lineColor: getLineColor(firstLeg),
    totalLegs: journey.legs.filter(l => l.transportation).length,
    plannedArrival: destination.departureTimeEstimated ?? destination.departureTimePlanned ?? new Date().toISOString(),
  };
}

/**
 * Create initial content state for a journey
 */
function createInitialState(journey: RankedJourney): ContentState {
  const firstLeg = journey.legs[0];
  const origin = firstLeg.origin;
  const destination = journey.legs[journey.legs.length - 1].destination;
  
  // Calculate total stops
  const totalStops = journey.legs.reduce((acc, leg) => {
    return acc + (leg.stopSequence?.length ?? 0);
  }, 0);
  
  // Determine initial phase
  const isWalking = !firstLeg.transportation;
  const phase: TripPhase = isWalking ? 'walking_to_stop' : 'waiting';
  
  // Get delay info from estimated vs planned times
  const delayMinutes = calculateDelay(
    origin.departureTimePlanned,
    origin.departureTimeEstimated
  );
  
  return {
    phase,
    nextEventTime: origin.departureTimeEstimated ?? origin.departureTimePlanned ?? new Date().toISOString(),
    delayMinutes: Math.abs(delayMinutes),
    isDelayed: delayMinutes > 2,
    isCancelled: false, // Will be updated via push notifications
    currentStopName: origin.name ?? origin.disassembledName ?? 'Current',
    nextStopName: firstLeg.stopSequence?.[1]?.name ?? destination.name ?? 'Next',
    stopsRemaining: totalStops,
    platform: getPlatform(origin),
    currentLeg: 1,
    progress: 0,
    hasAlert: false,
    alertMessage: null,
    nextLineNumber: null,
    nextLineModeId: null,
    connectionTime: null,
  };
}

/**
 * Hook to manage Live Activities for transit journeys
 */
export function useLiveActivity(): UseLiveActivityReturn {
  const [isSupported] = useState(() => LiveActivity.isSupported());
  const [isEnabled, setIsEnabled] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActiveActivityInfo | null>(null);
  const [currentState, setCurrentState] = useState<ContentState | null>(null);

  // Check if activities are enabled
  useEffect(() => {
    if (isSupported) {
      setIsEnabled(LiveActivity.areActivitiesEnabled());
    }
  }, [isSupported]);

  // Refresh active activities on mount
  const refreshActiveActivities = useCallback(() => {
    if (!isSupported) return;
    
    const activities = LiveActivity.getActiveActivities();
    if (activities.length > 0) {
      setActiveActivity(activities[0]);
    } else {
      setActiveActivity(null);
    }
  }, [isSupported]);

  useEffect(() => {
    refreshActiveActivities();
  }, [refreshActiveActivities]);

  // Start a new Live Activity
  const startActivity = useCallback(
    async (journey: RankedJourney): Promise<string | null> => {
      if (!isSupported || !isEnabled) {
        console.warn('Live Activities not available');
        return null;
      }

      try {
        // End any existing activity first
        if (activeActivity) {
          await LiveActivity.endActivity(activeActivity.activityId);
        }

        const attributes = journeyToAttributes(journey);
        const initialState = createInitialState(journey);

        const result = await LiveActivity.startActivity(attributes, initialState);
        
        setActiveActivity({
          activityId: result.activityId,
          tripId: attributes.tripId,
          destinationName: attributes.destinationName,
          pushToken: result.pushToken,
        });
        setCurrentState(initialState);

        // If we got a push token, register it with the backend
        if (result.pushToken) {
          // TODO: Send to backend for push updates
          console.log('Push token received:', result.pushToken);
        }

        return result.activityId;
      } catch (error) {
        console.error('Failed to start Live Activity:', error);
        return null;
      }
    },
    [isSupported, isEnabled, activeActivity]
  );

  // Update the current Live Activity
  const updateActivity = useCallback(
    async (stateUpdate: Partial<ContentState>): Promise<boolean> => {
      if (!activeActivity || !currentState) {
        return false;
      }

      try {
        const newState: ContentState = {
          ...currentState,
          ...stateUpdate,
        };

        const success = await LiveActivity.updateActivity(
          activeActivity.activityId,
          newState
        );

        if (success) {
          setCurrentState(newState);
        }

        return success;
      } catch (error) {
        console.error('Failed to update Live Activity:', error);
        return false;
      }
    },
    [activeActivity, currentState]
  );

  // End the current Live Activity
  const endActivity = useCallback(
    async (showFinalState = true): Promise<boolean> => {
      if (!activeActivity) {
        return false;
      }

      try {
        const finalState = showFinalState && currentState
          ? { ...currentState, phase: 'completed' as TripPhase, progress: 1.0 }
          : undefined;

        const success = await LiveActivity.endActivity(
          activeActivity.activityId,
          finalState,
          'default'
        );

        if (success) {
          setActiveActivity(null);
          setCurrentState(null);
        }

        return success;
      } catch (error) {
        console.error('Failed to end Live Activity:', error);
        return false;
      }
    },
    [activeActivity, currentState]
  );

  return {
    isSupported,
    isEnabled,
    activeActivity,
    startActivity,
    updateActivity,
    endActivity,
    refreshActiveActivities,
  };
}
