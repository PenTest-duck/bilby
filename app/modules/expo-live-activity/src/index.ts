import { requireNativeModule, Platform } from 'expo-modules-core';
import type {
  BilbyTripAttributes,
  ContentState,
  StartActivityResult,
  ActiveActivityInfo,
  DismissalPolicy,
} from './types';

export * from './types';

// Load the native module (iOS only)
const ExpoLiveActivityModule =
  Platform.OS === 'ios' ? requireNativeModule('ExpoLiveActivity') : null;

/**
 * Check if Live Activities are supported on this device
 */
export function isSupported(): boolean {
  return Platform.OS === 'ios' && ExpoLiveActivityModule !== null;
}

/**
 * Check if Live Activities are enabled by the user
 */
export function areActivitiesEnabled(): boolean {
  if (!isSupported()) return false;
  return ExpoLiveActivityModule.areActivitiesEnabled();
}

/**
 * Start a new Live Activity
 * @param attributes Static attributes for the activity
 * @param state Initial dynamic state
 * @returns Activity ID and push token
 */
export async function startActivity(
  attributes: BilbyTripAttributes,
  state: ContentState
): Promise<StartActivityResult> {
  if (!isSupported()) {
    throw new Error('Live Activities are not supported on this platform');
  }

  const attributesJson = JSON.stringify(attributes);
  const stateJson = JSON.stringify(state);

  const result = await ExpoLiveActivityModule.startActivity(
    attributesJson,
    stateJson
  );

  return {
    activityId: result.activityId,
    pushToken: result.pushToken ?? null,
  };
}

/**
 * Update an existing Live Activity
 * @param activityId The ID of the activity to update
 * @param state Partial state to merge with existing state
 */
export async function updateActivity(
  activityId: string,
  state: Partial<ContentState>
): Promise<boolean> {
  if (!isSupported()) {
    throw new Error('Live Activities are not supported on this platform');
  }

  const stateJson = JSON.stringify(state);
  return ExpoLiveActivityModule.updateActivity(activityId, stateJson);
}

/**
 * End a Live Activity
 * @param activityId The ID of the activity to end
 * @param finalState Optional final state to display
 * @param dismissalPolicy How to dismiss the activity ('default' or 'immediate')
 */
export async function endActivity(
  activityId: string,
  finalState?: ContentState,
  dismissalPolicy: DismissalPolicy = 'default'
): Promise<boolean> {
  if (!isSupported()) {
    throw new Error('Live Activities are not supported on this platform');
  }

  const stateJson = finalState ? JSON.stringify(finalState) : null;
  return ExpoLiveActivityModule.endActivity(activityId, stateJson, dismissalPolicy);
}

/**
 * End all active Live Activities
 * @returns Number of activities ended
 */
export async function endAllActivities(): Promise<number> {
  if (!isSupported()) {
    return 0;
  }

  return ExpoLiveActivityModule.endAllActivities();
}

/**
 * Get all currently active Live Activities
 */
export function getActiveActivities(): ActiveActivityInfo[] {
  if (!isSupported()) {
    return [];
  }

  return ExpoLiveActivityModule.getActiveActivities();
}

/**
 * Wait for a push token update for an activity
 * @param activityId The activity ID to observe
 * @returns The new push token
 */
export async function observePushToken(activityId: string): Promise<string> {
  if (!isSupported()) {
    throw new Error('Live Activities are not supported on this platform');
  }

  return ExpoLiveActivityModule.observePushToken(activityId);
}
