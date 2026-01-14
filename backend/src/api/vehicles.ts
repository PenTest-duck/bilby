/**
 * Vehicles API Endpoint
 * Real-time vehicle positions for map display
 */

import { Router, type Router as RouterType } from 'express'
import { loadRealtimeData, getVehiclesOnRoute } from '../lib/realtime-merger.js'
import type { VehiclePosition, CongestionLevel } from '../types/gtfs.js'

const router: RouterType = Router()

/** Format vehicle position for API response */
function formatVehicle(v: VehiclePosition): {
  id: string
  position: { lat: number; lng: number }
  bearing?: number
  speed?: number
  tripId?: string
  routeId?: string
  direction?: number
  nextStopId?: string
  currentStatus?: string
  occupancy?: string
  congestion?: string | null  // null if unknown
  timestamp?: number
  carriages?: {
    label?: string
    position: number
    occupancy?: string
    quietCarriage?: boolean
  }[]
} {
  // Only include congestion if it's a known value
  const congestion = v.congestionLevel && v.congestionLevel !== 'unknown' 
    ? v.congestionLevel 
    : null

  return {
    id: v.id,
    position: {
      lat: v.position.latitude,
      lng: v.position.longitude,
    },
    bearing: v.position.bearing,
    speed: v.position.speed,
    tripId: v.trip?.tripId,
    routeId: v.trip?.routeId,
    direction: v.trip?.directionId,
    nextStopId: v.stopId,
    currentStatus: v.currentStatus,
    occupancy: v.occupancyStatus,
    congestion,
    timestamp: v.timestamp,
    carriages: v.carriages?.map(c => ({
      label: c.label,
      position: c.positionInConsist,
      occupancy: c.occupancyStatus,
      quietCarriage: c.quietCarriage,
    })),
  }
}

/**
 * GET /api/vehicles/route/:routeId
 * Get all vehicles currently on a specific route
 */
router.get('/route/:routeId', async (req, res) => {
  const { routeId } = req.params

  try {
    const realtimeData = await loadRealtimeData()
    const vehicles = getVehiclesOnRoute(routeId, realtimeData.vehiclePositions)

    res.json({
      success: true,
      data: {
        routeId,
        count: vehicles.length,
        vehicles: vehicles.map(formatVehicle),
      },
      meta: {
        timestamp: Date.now(),
        realtimeStatus: realtimeData.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Vehicles] Route error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * GET /api/vehicles/nearby
 * Get vehicles near a coordinate (for map display)
 */
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius } = req.query

  if (!lat || !lng) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'lat and lng are required' },
    })
    return
  }

  const centerLat = parseFloat(lat as string)
  const centerLng = parseFloat(lng as string)
  const radiusKm = parseFloat(radius as string) || 5 // Default 5km

  if (isNaN(centerLat) || isNaN(centerLng)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMS', message: 'lat and lng must be numbers' },
    })
    return
  }

  try {
    const realtimeData = await loadRealtimeData()
    const nearbyVehicles: VehiclePosition[] = []

    // Simple distance filter (Haversine approximation for small distances)
    const kmPerDegLat = 111
    const kmPerDegLng = 111 * Math.cos(centerLat * Math.PI / 180)

    for (const positions of realtimeData.vehiclePositions.values()) {
      for (const pos of positions) {
        const dLat = Math.abs(pos.position.latitude - centerLat) * kmPerDegLat
        const dLng = Math.abs(pos.position.longitude - centerLng) * kmPerDegLng
        const distance = Math.sqrt(dLat * dLat + dLng * dLng)

        if (distance <= radiusKm) {
          nearbyVehicles.push(pos)
        }
      }
    }

    res.json({
      success: true,
      data: {
        center: { lat: centerLat, lng: centerLng },
        radiusKm,
        count: nearbyVehicles.length,
        vehicles: nearbyVehicles.map(formatVehicle),
      },
      meta: {
        timestamp: Date.now(),
        realtimeStatus: realtimeData.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Vehicles] Nearby error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * GET /api/vehicles/trip/:tripId
 * Get vehicle for a specific trip
 */
router.get('/trip/:tripId', async (req, res) => {
  const { tripId } = req.params

  try {
    const realtimeData = await loadRealtimeData()
    
    let vehicle: VehiclePosition | null = null
    for (const positions of realtimeData.vehiclePositions.values()) {
      const found = positions.find(p => p.trip?.tripId === tripId)
      if (found) {
        vehicle = found
        break
      }
    }

    if (!vehicle) {
      res.json({
        success: true,
        data: null,
        meta: {
          timestamp: Date.now(),
          message: 'No vehicle found for this trip',
        },
      })
      return
    }

    res.json({
      success: true,
      data: formatVehicle(vehicle),
      meta: {
        timestamp: Date.now(),
        realtimeStatus: realtimeData.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Vehicles] Trip error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

export default router
