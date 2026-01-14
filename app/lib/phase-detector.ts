/**
 * Phase Detector
 * 
 * Journey phase state machine based on location and time
 */

import type { Coordinate } from './geo-utils'
import {
  calculateDistance,
  calculateBearing,
  bearingToHumanDirection,
  isNearLocation,
  estimateWalkingTime,
} from './geo-utils'
import type { Leg } from './api/types'

export type TripPhase =
  | 'walking_to_stop'
  | 'waiting'
  | 'on_vehicle'
  | 'transferring'
  | 'arriving'
  | 'completed'

export interface JourneyLeg {
  index: number
  origin: {
    id: string
    name: string
    coord: Coordinate
    departureTime: Date
    platform?: string
  }
  destination: {
    id: string
    name: string
    coord: Coordinate
    arrivalTime: Date
  }
  isWalking: boolean
  transportation?: {
    lineNumber: string
    lineName: string
    modeId: number
  }
  stopSequence?: {
    name: string
    coord: Coordinate
    arrivalTime?: Date
  }[]
  path?: Coordinate[]
}

export interface PhaseDetectionResult {
  phase: TripPhase
  currentLegIndex: number
  progress: number
  
  // Navigation info for walking legs
  walkingDistanceMeters?: number
  walkingDirection?: string
  walkingBearing?: number
  walkingEtaSeconds?: number
  
  // Stop info for transit legs
  currentStopName?: string
  nextStopName?: string
  stopsRemaining?: number
  
  // Transfer info
  nextLineNumber?: string
  nextLineModeId?: number
  connectionTimeMinutes?: number
  
  // Alerts
  shouldAlert?: boolean
  alertMessage?: string
}

// Proximity thresholds in meters
const THRESHOLDS = {
  AT_STOP: 50,           // Close enough to be "at" a stop
  NEAR_STOP: 150,        // Getting close to a stop
  ARRIVING_DISTANCE: 500, // Start showing "arriving" phase
  COMPLETED: 100,         // Close enough to final destination
  ON_PATH: 100,          // Max distance from path to be considered "on route"
}

/**
 * Detect the current journey phase based on user location and time
 */
export function detectPhase(
  userLocation: Coordinate,
  userSpeed: number | null,
  legs: JourneyLeg[],
  currentLegIndex: number,
  currentTime: Date = new Date()
): PhaseDetectionResult {
  if (legs.length === 0) {
    return { phase: 'completed', currentLegIndex: 0, progress: 1 }
  }

  // Check if journey is complete
  const finalDestination = legs[legs.length - 1].destination
  if (isNearLocation(userLocation, finalDestination.coord, THRESHOLDS.COMPLETED)) {
    return {
      phase: 'completed',
      currentLegIndex: legs.length - 1,
      progress: 1,
      currentStopName: finalDestination.name,
    }
  }

  // Find which leg we're on based on location and time
  let detectedLegIndex = currentLegIndex
  for (let i = currentLegIndex; i < legs.length; i++) {
    const leg = legs[i]
    
    // Check if we've arrived at this leg's destination
    if (isNearLocation(userLocation, leg.destination.coord, THRESHOLDS.AT_STOP)) {
      // Move to next leg if available
      if (i < legs.length - 1) {
        detectedLegIndex = i + 1
      } else {
        // This is the final leg, check if arriving
        detectedLegIndex = i
      }
      break
    }
    
    // Check if we're near this leg's origin (still on this leg)
    if (isNearLocation(userLocation, leg.origin.coord, THRESHOLDS.NEAR_STOP)) {
      detectedLegIndex = i
      break
    }
  }

  const currentLeg = legs[detectedLegIndex]
  const isLastLeg = detectedLegIndex === legs.length - 1

  // Determine phase based on leg type and location
  if (currentLeg.isWalking) {
    return detectWalkingPhase(
      userLocation,
      currentLeg,
      detectedLegIndex,
      legs,
      currentTime
    )
  } else {
    return detectTransitPhase(
      userLocation,
      userSpeed,
      currentLeg,
      detectedLegIndex,
      legs,
      isLastLeg,
      currentTime
    )
  }
}

/**
 * Detect phase for a walking leg
 */
function detectWalkingPhase(
  userLocation: Coordinate,
  leg: JourneyLeg,
  legIndex: number,
  allLegs: JourneyLeg[],
  currentTime: Date
): PhaseDetectionResult {
  const distanceToDestination = calculateDistance(userLocation, leg.destination.coord)
  const bearing = calculateBearing(userLocation, leg.destination.coord)
  const direction = bearingToHumanDirection(bearing)
  const walkingEta = estimateWalkingTime(distanceToDestination)
  
  // Calculate progress for this leg
  const totalLegDistance = calculateDistance(leg.origin.coord, leg.destination.coord)
  const distanceTraveled = totalLegDistance - distanceToDestination
  const legProgress = Math.max(0, Math.min(1, distanceTraveled / totalLegDistance))
  
  // Overall journey progress
  const overallProgress = (legIndex + legProgress) / allLegs.length

  // Determine if this is walking to first stop or transferring
  const phase: TripPhase = legIndex === 0 ? 'walking_to_stop' : 'transferring'
  
  // Get next transit leg info for transfers
  let nextLineNumber: string | undefined
  let nextLineModeId: number | undefined
  let connectionTimeMinutes: number | undefined
  
  if (legIndex < allLegs.length - 1) {
    const nextLeg = allLegs[legIndex + 1]
    if (nextLeg.transportation) {
      nextLineNumber = nextLeg.transportation.lineNumber
      nextLineModeId = nextLeg.transportation.modeId
      
      // Calculate connection time
      const timeToNextDeparture = nextLeg.origin.departureTime.getTime() - currentTime.getTime()
      connectionTimeMinutes = Math.max(0, Math.floor(timeToNextDeparture / 60000))
    }
  }

  return {
    phase,
    currentLegIndex: legIndex,
    progress: overallProgress,
    walkingDistanceMeters: Math.round(distanceToDestination),
    walkingDirection: `Head ${direction} to ${leg.destination.name}`,
    walkingBearing: bearing,
    walkingEtaSeconds: walkingEta,
    nextStopName: leg.destination.name,
    nextLineNumber,
    nextLineModeId,
    connectionTimeMinutes,
  }
}

/**
 * Detect phase for a transit leg
 */
function detectTransitPhase(
  userLocation: Coordinate,
  userSpeed: number | null,
  leg: JourneyLeg,
  legIndex: number,
  allLegs: JourneyLeg[],
  isLastLeg: boolean,
  currentTime: Date
): PhaseDetectionResult {
  const distanceToOrigin = calculateDistance(userLocation, leg.origin.coord)
  const distanceToDestination = calculateDistance(userLocation, leg.destination.coord)
  const departureTime = leg.origin.departureTime
  const arrivalTime = leg.destination.arrivalTime
  
  // Calculate overall progress
  const legProgress = calculateLegProgress(userLocation, leg, currentTime)
  const overallProgress = (legIndex + legProgress) / allLegs.length

  // Check if still waiting at stop
  if (distanceToOrigin <= THRESHOLDS.AT_STOP && currentTime < departureTime) {
    return {
      phase: 'waiting',
      currentLegIndex: legIndex,
      progress: overallProgress,
      currentStopName: leg.origin.name,
      nextStopName: leg.stopSequence?.[1]?.name || leg.destination.name,
      stopsRemaining: (leg.stopSequence?.length || 2) - 1,
    }
  }

  // Check if arriving at final destination
  if (isLastLeg && distanceToDestination <= THRESHOLDS.ARRIVING_DISTANCE) {
    return {
      phase: 'arriving',
      currentLegIndex: legIndex,
      progress: overallProgress,
      currentStopName: leg.destination.name,
      stopsRemaining: 1,
    }
  }

  // On vehicle - determine current stop position
  const stopInfo = determineCurrentStop(userLocation, leg)
  
  // Check for transfer coming up
  let nextLineNumber: string | undefined
  let nextLineModeId: number | undefined
  let connectionTimeMinutes: number | undefined
  
  if (!isLastLeg && legIndex < allLegs.length - 1) {
    const nextTransitLeg = allLegs.slice(legIndex + 1).find(l => l.transportation)
    if (nextTransitLeg?.transportation) {
      nextLineNumber = nextTransitLeg.transportation.lineNumber
      nextLineModeId = nextTransitLeg.transportation.modeId
      
      const timeToConnection = nextTransitLeg.origin.departureTime.getTime() - arrivalTime.getTime()
      connectionTimeMinutes = Math.max(0, Math.floor(timeToConnection / 60000))
    }
  }

  // Alert if approaching alight stop
  let shouldAlert = false
  let alertMessage: string | undefined
  
  if (stopInfo.stopsRemaining <= 1 && !isLastLeg) {
    shouldAlert = true
    alertMessage = `Alight at ${leg.destination.name} for your transfer`
  } else if (stopInfo.stopsRemaining <= 1 && isLastLeg) {
    shouldAlert = true
    alertMessage = `Arriving at ${leg.destination.name}`
  }

  return {
    phase: 'on_vehicle',
    currentLegIndex: legIndex,
    progress: overallProgress,
    currentStopName: stopInfo.currentStopName,
    nextStopName: stopInfo.nextStopName,
    stopsRemaining: stopInfo.stopsRemaining,
    nextLineNumber,
    nextLineModeId,
    connectionTimeMinutes,
    shouldAlert,
    alertMessage,
  }
}

/**
 * Calculate progress within a leg based on time and/or location
 */
function calculateLegProgress(
  userLocation: Coordinate,
  leg: JourneyLeg,
  currentTime: Date
): number {
  const departureTime = leg.origin.departureTime.getTime()
  const arrivalTime = leg.destination.arrivalTime.getTime()
  const now = currentTime.getTime()
  
  // Time-based progress
  if (now <= departureTime) return 0
  if (now >= arrivalTime) return 1
  
  const timeProgress = (now - departureTime) / (arrivalTime - departureTime)
  
  // Location-based progress (if stop sequence available)
  if (leg.stopSequence && leg.stopSequence.length > 1) {
    let minDistance = Infinity
    let closestIndex = 0
    
    for (let i = 0; i < leg.stopSequence.length; i++) {
      const stop = leg.stopSequence[i]
      const distance = calculateDistance(userLocation, stop.coord)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }
    
    const locationProgress = closestIndex / (leg.stopSequence.length - 1)
    
    // Average time and location progress
    return (timeProgress + locationProgress) / 2
  }
  
  return timeProgress
}

/**
 * Determine which stop the user is currently at/approaching
 */
function determineCurrentStop(
  userLocation: Coordinate,
  leg: JourneyLeg
): { currentStopName: string; nextStopName: string; stopsRemaining: number } {
  if (!leg.stopSequence || leg.stopSequence.length === 0) {
    return {
      currentStopName: leg.origin.name,
      nextStopName: leg.destination.name,
      stopsRemaining: 1,
    }
  }

  // Find closest stop
  let minDistance = Infinity
  let closestIndex = 0
  
  for (let i = 0; i < leg.stopSequence.length; i++) {
    const stop = leg.stopSequence[i]
    const distance = calculateDistance(userLocation, stop.coord)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = i
    }
  }
  
  const currentStop = leg.stopSequence[closestIndex]
  const nextStop = leg.stopSequence[closestIndex + 1] || leg.stopSequence[closestIndex]
  const stopsRemaining = leg.stopSequence.length - closestIndex - 1

  return {
    currentStopName: currentStop.name,
    nextStopName: nextStop.name,
    stopsRemaining: Math.max(0, stopsRemaining),
  }
}

/**
 * Convert API Leg to JourneyLeg for phase detection
 */
export function convertApiLegToJourneyLeg(leg: Leg, index: number): JourneyLeg {
  // Mode 99 or 100 typically indicates walking/footpath in TfNSW data
  const isWalking = !leg.transportation || 
    leg.transportation.product?.class === 99 || 
    leg.transportation.product?.class === 100
  
  return {
    index,
    origin: {
      id: leg.origin.id || '',
      name: leg.origin.disassembledName || leg.origin.name || 'Unknown',
      coord: {
        latitude: leg.origin.coord?.[0] || 0,
        longitude: leg.origin.coord?.[1] || 0,
      },
      departureTime: new Date(
        leg.origin.departureTimeEstimated || 
        leg.origin.departureTimePlanned || 
        new Date().toISOString()
      ),
      platform: leg.origin.properties?.platform as string | undefined,
    },
    destination: {
      id: leg.destination.id || '',
      name: leg.destination.disassembledName || leg.destination.name || 'Unknown',
      coord: {
        latitude: leg.destination.coord?.[0] || 0,
        longitude: leg.destination.coord?.[1] || 0,
      },
      arrivalTime: new Date(
        leg.destination.arrivalTimeEstimated || 
        leg.destination.arrivalTimePlanned || 
        new Date().toISOString()
      ),
    },
    isWalking,
    transportation: leg.transportation ? {
      lineNumber: leg.transportation.number || leg.transportation.disassembledName || '',
      lineName: leg.transportation.name || '',
      modeId: leg.transportation.product?.class ?? 1,
    } : undefined,
    stopSequence: leg.stopSequence?.map(stop => ({
      name: stop.disassembledName || stop.name || '',
      coord: {
        latitude: stop.coord?.[0] || 0,
        longitude: stop.coord?.[1] || 0,
      },
      arrivalTime: stop.arrivalTimeEstimated || stop.arrivalTimePlanned
        ? new Date((stop.arrivalTimeEstimated || stop.arrivalTimePlanned) as string)
        : undefined,
    })),
    path: leg.coords?.map(([lat, lon]) => ({ latitude: lat, longitude: lon })),
  }
}
