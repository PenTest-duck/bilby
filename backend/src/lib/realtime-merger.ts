/**
 * Realtime Data Merger
 * Merges Redis realtime data (GTFS) with Trip Planner responses
 */

import { getTripUpdates, getVehiclePositions, getAlerts, getFeedMeta } from './cache.js'
import type { TripUpdate, VehiclePosition, Alert, TfnswFeed } from '../types/gtfs.js'
import type { Journey, Departure, Leg, RealtimeStatus } from '../types/trip-planner.js'

/** Realtime data bundle */
interface RealtimeData {
  tripUpdates: Map<TfnswFeed, TripUpdate[]>
  vehiclePositions: Map<TfnswFeed, VehiclePosition[]>
  alerts: Alert[]
  status: RealtimeStatus
  ageSeconds: number | null
}

/**
 * Load all realtime data from Redis
 */
export async function loadRealtimeData(): Promise<RealtimeData> {
  const feeds: TfnswFeed[] = ['sydneytrains', 'metro', 'lightrail']
  
  const tripUpdates = new Map<TfnswFeed, TripUpdate[]>()
  const vehiclePositions = new Map<TfnswFeed, VehiclePosition[]>()
  let oldestAge: number | null = null
  
  for (const feed of feeds) {
    const updates = await getTripUpdates(feed)
    if (updates) {
      tripUpdates.set(feed, updates)
    }
    
    const positions = await getVehiclePositions(feed)
    if (positions) {
      vehiclePositions.set(feed, positions)
    }
    
    const meta = await getFeedMeta('tripupdates', feed)
    if (meta) {
      const age = Math.round((Date.now() - meta.fetchedAt) / 1000)
      if (oldestAge === null || age > oldestAge) {
        oldestAge = age
      }
    }
  }
  
  const alerts = await getAlerts('all') ?? []
  
  // Determine status based on data age
  let status: RealtimeStatus = 'unavailable'
  if (tripUpdates.size > 0) {
    status = oldestAge !== null && oldestAge < 60 ? 'fresh' : 'stale'
  }
  
  return {
    tripUpdates,
    vehiclePositions,
    alerts,
    status,
    ageSeconds: oldestAge,
  }
}

/**
 * Find trip update by trip ID
 */
function findTripUpdate(
  tripId: string | undefined,
  tripUpdates: Map<TfnswFeed, TripUpdate[]>
): TripUpdate | null {
  if (!tripId) return null
  
  for (const updates of tripUpdates.values()) {
    const found = updates.find(u => u.trip.tripId === tripId)
    if (found) return found
  }
  
  return null
}

/**
 * Find vehicle position by trip ID
 */
function findVehiclePosition(
  tripId: string | undefined,
  vehiclePositions: Map<TfnswFeed, VehiclePosition[]>
): VehiclePosition | null {
  if (!tripId) return null
  
  for (const positions of vehiclePositions.values()) {
    const found = positions.find(p => p.trip?.tripId === tripId)
    if (found) return found
  }
  
  return null
}

/**
 * Calculate delay in minutes from realtime data
 */
function calculateDelayMinutes(tripUpdate: TripUpdate): number {
  // Use overall delay if available
  if (tripUpdate.delay !== undefined) {
    return Math.round(tripUpdate.delay / 60)
  }
  
  // Otherwise, use first stop time update with delay
  for (const stu of tripUpdate.stopTimeUpdates) {
    if (stu.departure?.delay !== undefined) {
      return Math.round(stu.departure.delay / 60)
    }
    if (stu.arrival?.delay !== undefined) {
      return Math.round(stu.arrival.delay / 60)
    }
  }
  
  return 0
}

/**
 * Check if trip is cancelled
 */
function isTripCancelled(tripUpdate: TripUpdate): boolean {
  return tripUpdate.trip.scheduleRelationship === 'canceled'
}

/**
 * Merge realtime data into journey legs
 */
export function mergeJourneyRealtime(
  journey: Journey,
  realtimeData: RealtimeData
): Journey & { realtimeDelayMinutes?: number; hasCancellations?: boolean } {
  let totalDelayMinutes = 0
  let hasCancellations = false
  
  const mergedLegs = journey.legs.map(leg => {
    // Skip walking legs
    if (!leg.transportation?.id) {
      return leg
    }
    
    // Try to find trip update
    const tripId = extractTripId(leg)
    const tripUpdate = findTripUpdate(tripId, realtimeData.tripUpdates)
    
    if (!tripUpdate) {
      return leg
    }
    
    // Check for cancellation
    if (isTripCancelled(tripUpdate)) {
      hasCancellations = true
      return {
        ...leg,
        properties: {
          ...leg.properties,
          cancelled: true,
        },
      }
    }
    
    // Apply delay
    const delayMinutes = calculateDelayMinutes(tripUpdate)
    totalDelayMinutes += delayMinutes
    
    // Find vehicle position
    const vehiclePos = findVehiclePosition(tripId, realtimeData.vehiclePositions)
    
    return {
      ...leg,
      properties: {
        ...leg.properties,
        realtimeDelay: delayMinutes,
        vehiclePosition: vehiclePos?.position,
      },
    }
  })
  
  return {
    ...journey,
    legs: mergedLegs,
    realtimeDelayMinutes: totalDelayMinutes,
    hasCancellations,
  }
}

/**
 * Merge realtime data into departures
 */
export function mergeDeparturesRealtime(
  departures: Departure[],
  realtimeData: RealtimeData
): (Departure & { realtimeDelay?: number; cancelled?: boolean; vehiclePosition?: unknown })[] {
  return departures.map(dep => {
    const tripId = extractDepartureTripId(dep)
    const tripUpdate = findTripUpdate(tripId, realtimeData.tripUpdates)
    
    if (!tripUpdate) {
      return dep
    }
    
    const cancelled = isTripCancelled(tripUpdate)
    const delayMinutes = cancelled ? 0 : calculateDelayMinutes(tripUpdate)
    const vehiclePos = findVehiclePosition(tripId, realtimeData.vehiclePositions)
    
    return {
      ...dep,
      realtimeDelay: delayMinutes,
      cancelled,
      vehiclePosition: vehiclePos?.position,
    }
  })
}

/**
 * Extract trip ID from journey leg
 */
function extractTripId(leg: Leg): string | undefined {
  // TfNSW trip IDs are sometimes in the transportation ID
  const transportId = leg.transportation?.id
  if (transportId) {
    // Format: "nsw:XXXX:TRIP_ID:..."
    const parts = transportId.split(':')
    if (parts.length >= 3) {
      return parts[2]
    }
  }
  
  // Check properties
  const props = leg.properties as Record<string, unknown> | undefined
  if (props?.tripId) {
    return String(props.tripId)
  }
  
  return undefined
}

/**
 * Extract trip ID from departure
 */
function extractDepartureTripId(dep: Departure): string | undefined {
  const transportId = dep.transportation?.id
  if (transportId) {
    const parts = transportId.split(':')
    if (parts.length >= 3) {
      return parts[2]
    }
  }
  
  const props = dep.properties as Record<string, unknown> | undefined
  if (props?.tripId) {
    return String(props.tripId)
  }
  
  return undefined
}

/**
 * Filter alerts relevant to a journey
 */
export function filterAlertsForJourney(
  journey: Journey,
  alerts: Alert[]
): Alert[] {
  const relevantAlerts: Alert[] = []
  
  for (const leg of journey.legs) {
    if (!leg.transportation) continue
    
    const routeId = leg.transportation.id
    const stops = leg.stopSequence?.map(s => s.id).filter(Boolean) ?? []
    
    for (const alert of alerts) {
      // Check if alert affects this route or any stops
      const affectsRoute = alert.informedEntities.some(e => 
        e.routeId && routeId?.includes(e.routeId)
      )
      
      const affectsStop = alert.informedEntities.some(e =>
        e.stopId && stops.includes(e.stopId)
      )
      
      if (affectsRoute || affectsStop) {
        if (!relevantAlerts.find(a => a.id === alert.id)) {
          relevantAlerts.push(alert)
        }
      }
    }
  }
  
  return relevantAlerts
}
