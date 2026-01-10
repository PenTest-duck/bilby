/**
 * Stops API Endpoint
 * Search and lookup stops, stations, and platforms
 */

import { Router, type Router as RouterType } from 'express'
import { searchStops, getStopById, findNearbyStops } from '../lib/tfnsw-tp-client.js'

const router: RouterType = Router()

/**
 * GET /api/stops/search
 * Search for stops by name
 */
router.get('/search', async (req, res) => {
  const { q, limit } = req.query

  if (!q || typeof q !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_QUERY', message: 'Query parameter "q" is required' },
    })
    return
  }

  try {
    const stops = await searchStops(q, {
      limit: limit ? parseInt(limit as string, 10) : 10,
    })

    res.json({
      success: true,
      data: {
        stops,
        query: q,
        count: stops.length,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stops] Search error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_FAILED', message },
    })
  }
})

/**
 * GET /api/stops/nearby
 * Find stops near a coordinate
 */
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius } = req.query

  if (!lat || !lng) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_COORDS', message: 'Query parameters "lat" and "lng" are required' },
    })
    return
  }

  const latitude = parseFloat(lat as string)
  const longitude = parseFloat(lng as string)
  const radiusMeters = radius ? parseInt(radius as string, 10) : 500

  if (isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_COORDS', message: 'Invalid latitude or longitude' },
    })
    return
  }

  try {
    const stops = await findNearbyStops(latitude, longitude, radiusMeters)

    res.json({
      success: true,
      data: {
        stops,
        location: { lat: latitude, lng: longitude },
        radius: radiusMeters,
        count: stops.length,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stops] Nearby search error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_FAILED', message },
    })
  }
})

/**
 * GET /api/stops/:stopId
 * Get stop details by ID
 */
router.get('/:stopId', async (req, res) => {
  const { stopId } = req.params

  try {
    const stop = await getStopById(stopId)

    if (!stop) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Stop ${stopId} not found` },
      })
      return
    }

    res.json({
      success: true,
      data: { stop },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stops] Lookup error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'LOOKUP_FAILED', message },
    })
  }
})

export default router
