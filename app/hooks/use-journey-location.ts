/**
 * Journey Location Hook
 * 
 * Real-time location tracking for automatic journey phase detection
 * and navigation instructions during Live Activities.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as LiveActivity from '../modules/expo-live-activity/src'
import {
  detectPhase,
  convertApiLegToJourneyLeg,
  type JourneyLeg,
  type PhaseDetectionResult,
  type TripPhase,
} from '../lib/phase-detector'
import type { Coordinate } from '../lib/geo-utils'
import type { RankedJourney, Leg } from '../lib/api/types'

const LOCATION_TASK_NAME = 'bilby-journey-tracking'

// Location tracking configuration
const LOCATION_CONFIG: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,        // Update every 5 seconds
  distanceInterval: 10,      // Or every 10 meters
}

const BACKGROUND_LOCATION_CONFIG: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 10000,       // Update every 10 seconds in background
  distanceInterval: 25,      // Or every 25 meters
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Bilby Journey Tracking',
    notificationBody: 'Tracking your journey progress',
    notificationColor: '#0066CC',
  },
}

interface JourneyLocationState {
  isTracking: boolean
  currentLocation: Coordinate | null
  currentSpeed: number | null
  phase: TripPhase | null
  phaseResult: PhaseDetectionResult | null
  error: string | null
}

interface UseJourneyLocationOptions {
  activityId: string | null
  journey: RankedJourney | null
  onPhaseChange?: (phase: TripPhase, result: PhaseDetectionResult) => void
  onJourneyComplete?: () => void
  onError?: (error: string) => void
}

// Store for background task access
let journeyLegsStore: JourneyLeg[] = []
let currentLegIndexStore = 0
let activityIdStore: string | null = null
let onPhaseChangeCallback: ((phase: TripPhase, result: PhaseDetectionResult) => void) | null = null

// Define background location task
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: { data: unknown; error: unknown }) => {
  if (error) {
    console.error('Background location error:', error)
    return
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] }
    const location = locations[0]
    
    if (location && journeyLegsStore.length > 0) {
      const userLocation: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
      
      const result = detectPhase(
        userLocation,
        location.coords.speed,
        journeyLegsStore,
        currentLegIndexStore
      )
      
      // Update current leg index
      if (result.currentLegIndex !== currentLegIndexStore) {
        currentLegIndexStore = result.currentLegIndex
      }
      
      // Update Live Activity if we have an activity ID
      if (activityIdStore) {
        try {
          await LiveActivity.updateActivity(activityIdStore, {
            phase: result.phase,
            progress: result.progress,
            currentStopName: result.currentStopName || '',
            nextStopName: result.nextStopName || '',
            stopsRemaining: result.stopsRemaining ?? 0,
            walkingDistanceMeters: result.walkingDistanceMeters,
            walkingDirection: result.walkingDirection ?? null,
            walkingBearing: result.walkingBearing ?? null,
            nextLineNumber: result.nextLineNumber ?? null,
            nextLineModeId: result.nextLineModeId ?? null,
            connectionTime: result.connectionTimeMinutes ?? null,
          })
        } catch (e) {
          console.error('Failed to update Live Activity from background:', e)
        }
      }
      
      // Trigger callback
      onPhaseChangeCallback?.(result.phase, result)
    }
  }
})

export function useJourneyLocation(options: UseJourneyLocationOptions): JourneyLocationState & {
  startTracking: () => Promise<boolean>
  stopTracking: () => Promise<void>
  requestPermissions: () => Promise<boolean>
} {
  const { activityId, journey, onPhaseChange, onJourneyComplete, onError } = options
  
  const [state, setState] = useState<JourneyLocationState>({
    isTracking: false,
    currentLocation: null,
    currentSpeed: null,
    phase: null,
    phaseResult: null,
    error: null,
  })
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null)
  const journeyLegs = useRef<JourneyLeg[]>([])
  const currentLegIndex = useRef(0)
  const previousPhase = useRef<TripPhase | null>(null)

  // Convert journey to JourneyLeg format
  useEffect(() => {
    if (journey?.legs) {
      const legs = journey.legs.map((leg: Leg, index: number) => 
        convertApiLegToJourneyLeg(leg, index)
      )
      journeyLegs.current = legs
      journeyLegsStore = legs
      currentLegIndex.current = 0
      currentLegIndexStore = 0
    }
  }, [journey])

  // Store activity ID and callback for background task
  useEffect(() => {
    activityIdStore = activityId
    onPhaseChangeCallback = onPhaseChange || null
  }, [activityId, onPhaseChange])

  // Request location permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Request foreground permission first
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync()
      if (foregroundStatus !== 'granted') {
        setState(prev => ({ ...prev, error: 'Foreground location permission denied' }))
        onError?.('Foreground location permission denied')
        return false
      }

      // Request background permission for journey tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied - tracking will only work in foreground')
      }

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request permissions'
      setState(prev => ({ ...prev, error: message }))
      onError?.(message)
      return false
    }
  }, [onError])

  // Process location update
  const processLocation = useCallback(
    (location: Location.LocationObject) => {
      const userLocation: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }

      setState(prev => ({
        ...prev,
        currentLocation: userLocation,
        currentSpeed: location.coords.speed,
      }))

      if (journeyLegs.current.length === 0) return

      // Detect current phase
      const result = detectPhase(
        userLocation,
        location.coords.speed,
        journeyLegs.current,
        currentLegIndex.current
      )

      // Update current leg index
      if (result.currentLegIndex !== currentLegIndex.current) {
        currentLegIndex.current = result.currentLegIndex
        currentLegIndexStore = result.currentLegIndex
      }

      setState(prev => ({
        ...prev,
        phase: result.phase,
        phaseResult: result,
      }))

      // Trigger phase change callback if phase changed
      if (result.phase !== previousPhase.current) {
        previousPhase.current = result.phase
        onPhaseChange?.(result.phase, result)
      }

      // Update Live Activity
      if (activityId) {
        LiveActivity.updateActivity(activityId, {
          phase: result.phase,
          progress: result.progress,
          currentStopName: result.currentStopName || '',
          nextStopName: result.nextStopName || '',
          stopsRemaining: result.stopsRemaining ?? 0,
          walkingDistanceMeters: result.walkingDistanceMeters,
          walkingDirection: result.walkingDirection ?? null,
          walkingBearing: result.walkingBearing ?? null,
          nextLineNumber: result.nextLineNumber ?? null,
          nextLineModeId: result.nextLineModeId ?? null,
          connectionTime: result.connectionTimeMinutes ?? null,
        }).catch(err => console.error('Failed to update Live Activity:', err))
      }

      // Check for journey completion
      if (result.phase === 'completed') {
        onJourneyComplete?.()
      }
    },
    [activityId, onPhaseChange, onJourneyComplete]
  )

  // Start location tracking
  const startTracking = useCallback(async (): Promise<boolean> => {
    try {
      // Check permissions
      const hasPermission = await requestPermissions()
      if (!hasPermission) return false

      // Check if background tracking is available
      const hasBackgroundPermission = await Location.getBackgroundPermissionsAsync()
      
      if (hasBackgroundPermission.status === 'granted') {
        // Start background location updates
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, BACKGROUND_LOCATION_CONFIG)
      }

      // Start foreground location updates for more frequent updates when app is active
      locationSubscription.current = await Location.watchPositionAsync(
        LOCATION_CONFIG,
        processLocation
      )

      setState(prev => ({ ...prev, isTracking: true, error: null }))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start tracking'
      setState(prev => ({ ...prev, error: message }))
      onError?.(message)
      return false
    }
  }, [requestPermissions, processLocation, onError])

  // Stop location tracking
  const stopTracking = useCallback(async () => {
    try {
      // Stop foreground subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove()
        locationSubscription.current = null
      }

      // Stop background task
      const isTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)
      if (isTaskRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }

      setState(prev => ({
        ...prev,
        isTracking: false,
        currentLocation: null,
        currentSpeed: null,
        phase: null,
        phaseResult: null,
      }))

      // Clear stores
      journeyLegsStore = []
      currentLegIndexStore = 0
      activityIdStore = null
      onPhaseChangeCallback = null
    } catch (error) {
      console.error('Failed to stop tracking:', error)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    ...state,
    startTracking,
    stopTracking,
    requestPermissions,
  }
}

/**
 * Check if location services are available
 */
export async function isLocationAvailable(): Promise<boolean> {
  return Location.hasServicesEnabledAsync()
}

/**
 * Get current location once (for initial state)
 */
export async function getCurrentLocation(): Promise<Coordinate | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }
  } catch {
    return null
  }
}
