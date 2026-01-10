/**
 * Departures API Endpoint
 * Live departures with realtime data merged from Redis
 */

import { Router, type Router as RouterType } from 'express'
import { getDepartures, getStopById, getModeCode } from '../lib/tfnsw-tp-client.js'
import { loadRealtimeData, mergeDeparturesRealtime } from '../lib/realtime-merger.js'

const router: RouterType = Router()

/**
 * GET /api/departures/:stopId
 * Get live departures from a stop
 */
router.get('/:stopId', async (req, res) => {
  const { stopId } = req.params
  const { limit, modes, platform } = req.query

  try {
    // Parse options
    const limitNum = limit ? parseInt(limit as string, 10) : 20
    const modeList = modes ? (modes as string).split(',').map(m => getModeCode(m.trim())).filter(Boolean) as number[] : undefined

    // Fetch stop info and departures in parallel
    const [stop, departures, realtimeData] = await Promise.all([
      getStopById(stopId),
      getDepartures(stopId, new Date(), {
        limit: limitNum,
        modes: modeList,
        platformId: platform as string | undefined,
      }),
      loadRealtimeData(),
    ])

    if (!stop) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Stop ${stopId} not found` },
      })
      return
    }

    // Merge realtime data
    const mergedDepartures = mergeDeparturesRealtime(departures, realtimeData)

    // Sort by departure time, cancelled services at the end
    mergedDepartures.sort((a, b) => {
      if (a.cancelled && !b.cancelled) return 1
      if (!a.cancelled && b.cancelled) return -1
      
      const timeA = a.departureTimeEstimated ?? a.departureTimePlanned ?? ''
      const timeB = b.departureTimeEstimated ?? b.departureTimePlanned ?? ''
      return timeA.localeCompare(timeB)
    })

    res.json({
      success: true,
      data: {
        stop,
        departures: mergedDepartures,
        count: mergedDepartures.length,
      },
      meta: {
        timestamp: Date.now(),
        realtimeStatus: realtimeData.status,
        realtimeAge: realtimeData.ageSeconds,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Departures] Error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

export default router
