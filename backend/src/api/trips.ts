/**
 * Trips API Endpoint
 * Trip planning with ranked options and explainability
 */

import { Router, type Router as RouterType } from 'express'
import { planTrip, planTripFromCoords, planTripMixed, getModeCode } from '../lib/tfnsw-tp-client.js'
import { loadRealtimeData, mergeJourneyRealtime, filterAlertsForJourney } from '../lib/realtime-merger.js'
import { getBestAndAlternatives } from '../lib/ranking.js'
import { enrichJourneysWithFares, isFareEnrichmentEnabled, extractTravelInCars, extractOccupancy } from '../lib/fare-enricher.js'
import type { RankingStrategy, TripQuery } from '../types/trip-planner.js'

const router: RouterType = Router()

/** Check if string is coordinate format (lat,lng) */
function isCoordinate(value: string): boolean {
  return /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(value)
}

/** Parse coordinate string */
function parseCoordinate(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',')
  if (parts.length !== 2) return null
  
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  
  if (isNaN(lat) || isNaN(lng)) return null
  
  return { lat, lng }
}

/**
 * GET /api/trips
 * Plan a trip with ranked options
 */
router.get('/', async (req, res) => {
  const { from, to, when, arriveBy, strategy, modes, excludeModes, accessible } = req.query

  // Validate required params
  if (!from || !to) {
    res.status(400).json({
      success: false,
      error: { 
        code: 'MISSING_PARAMS', 
        message: 'Query parameters "from" and "to" are required' 
      },
    })
    return
  }

  try {
    // Parse time
    let departureTime = new Date()
    if (when && when !== 'now') {
      departureTime = new Date(when as string)
      if (isNaN(departureTime.getTime())) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TIME', message: 'Invalid "when" parameter' },
        })
        return
      }
    }

    // Parse strategy
    const rankingStrategy = (strategy as RankingStrategy) ?? 'best'
    if (!['best', 'fastest', 'least_walking', 'fewest_transfers'].includes(rankingStrategy)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STRATEGY', message: 'Invalid ranking strategy' },
      })
      return
    }

    // Parse modes (inclusion list)
    const includedModes = modes 
      ? (modes as string).split(',').map(m => getModeCode(m.trim())).filter(Boolean) as number[]
      : undefined

    // Parse excluded modes
    const excludedModes = excludeModes
      ? (excludeModes as string).split(',').map(m => getModeCode(m.trim())).filter(Boolean) as number[]
      : undefined

    // Build query object
    const query: TripQuery = {
      from: from as string,
      to: to as string,
      when: departureTime.toISOString(),
      arriveBy: arriveBy === 'true',
      strategy: rankingStrategy,
      modes: modes ? (modes as string).split(',') : undefined,
      excludeModes: excludeModes ? (excludeModes as string).split(',') : undefined,
      accessible: accessible === 'true',
    }

    // Plan trip - handle coordinates vs stop IDs
    const fromStr = from as string
    const toStr = to as string
    const isFromCoord = isCoordinate(fromStr)
    const isToCoord = isCoordinate(toStr)

    let journeys
    if (isFromCoord && isToCoord) {
      // Both are coordinates
      const fromCoord = parseCoordinate(fromStr)!
      const toCoord = parseCoordinate(toStr)!
      journeys = await planTripFromCoords(
        fromCoord.lat, fromCoord.lng,
        toCoord.lat, toCoord.lng,
        departureTime,
        { arriveBy: arriveBy === 'true', accessible: accessible === 'true', includedModes, excludedModes }
      )
    } else if (isFromCoord || isToCoord) {
      // Mixed: one is coordinate, one is stop ID
      // Use planTripMixed for proper TfNSW API formatting
      const fromCoord = isFromCoord ? parseCoordinate(fromStr) : null
      const toCoord = isToCoord ? parseCoordinate(toStr) : null
      
      journeys = await planTripMixed(
        {
          type: isFromCoord ? 'coord' : 'stop',
          value: fromStr,
          lat: fromCoord?.lat,
          lng: fromCoord?.lng,
        },
        {
          type: isToCoord ? 'coord' : 'stop',
          value: toStr,
          lat: toCoord?.lat,
          lng: toCoord?.lng,
        },
        departureTime,
        { arriveBy: arriveBy === 'true', accessible: accessible === 'true', includedModes, excludedModes }
      )
    } else {
      // Both are stop IDs
      journeys = await planTrip(fromStr, toStr, departureTime, {
        arriveBy: arriveBy === 'true',
        accessible: accessible === 'true',
        includedModes,
        excludedModes,
      })
    }

    if (journeys.length === 0) {
      res.json({
        success: true,
        data: {
          best: null,
          alternatives: [],
          query,
          message: 'No journeys found for the specified criteria',
        },
        meta: {
          timestamp: Date.now(),
          realtimeStatus: 'unavailable',
        },
      })
      return
    }

    // Load realtime data and merge
    const realtimeData = await loadRealtimeData()
    const mergedJourneys = journeys.map(j => mergeJourneyRealtime(j, realtimeData))

    // Enrich with fare data from GraphQL (if enabled)
    let enrichedJourneys = mergedJourneys
    let fareSource: 'graphql' | 'unavailable' = 'unavailable'
    if (isFareEnrichmentEnabled()) {
      const withFares = await enrichJourneysWithFares(
        mergedJourneys,
        fromStr,
        toStr,
        { excludedModes }
      )
      enrichedJourneys = withFares as typeof mergedJourneys
      fareSource = withFares.some(j => j.enrichedFare) ? 'graphql' : 'unavailable'
    }

    // Rank journeys
    const { best, alternatives } = getBestAndAlternatives(enrichedJourneys, rankingStrategy)

    // Helper to add extras to a journey
    const addJourneyExtras = (journey: typeof best) => {
      if (!journey) return null
      const j = journey as unknown as Record<string, unknown>
      j.alerts = filterAlertsForJourney(journey, realtimeData.alerts)
      const travelInCars = extractTravelInCars(journey)
      const occupancy = extractOccupancy(journey)
      if (travelInCars.length > 0) j.travelInCars = travelInCars
      if (occupancy.length > 0) j.occupancy = occupancy
      return journey
    }

    // Add extras to best and all alternatives
    const enrichedBest = addJourneyExtras(best)
    const enrichedAlternatives = alternatives.map(addJourneyExtras).filter(Boolean)

    res.json({
      success: true,
      data: {
        best: enrichedBest,
        alternatives: enrichedAlternatives,
        query,
        totalOptions: journeys.length,
      },
      meta: {
        timestamp: Date.now(),
        realtimeStatus: realtimeData.status,
        realtimeAge: realtimeData.ageSeconds,
        fareSource,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] Error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'PLANNING_FAILED', message },
    })
  }
})

/**
 * POST /api/trips
 * Plan a trip with body parameters (for complex queries)
 */
router.post('/', async (req, res) => {
  const { from, to, when, arriveBy, strategy, modes, excludeModes, accessible } = req.body

  if (!from || !to) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'Body must include "from" and "to"' },
    })
    return
  }

  // Redirect to GET handler logic
  const query = new URLSearchParams()
  query.set('from', from)
  query.set('to', to)
  if (when) query.set('when', when)
  if (arriveBy) query.set('arriveBy', String(arriveBy))
  if (strategy) query.set('strategy', strategy)
  if (modes) query.set('modes', Array.isArray(modes) ? modes.join(',') : modes)
  if (excludeModes) query.set('excludeModes', Array.isArray(excludeModes) ? excludeModes.join(',') : excludeModes)
  if (accessible) query.set('accessible', String(accessible))

  // Forward to GET handler
  req.query = Object.fromEntries(query)
  
  // Re-invoke the GET handler logic (simplified - in production use proper routing)
  try {
    const departureTime = when && when !== 'now' ? new Date(when) : new Date()
    const rankingStrategy = (strategy as RankingStrategy) ?? 'best'
    const includedModes = modes 
      ? (Array.isArray(modes) ? modes : modes.split(',')).map((m: string) => getModeCode(m.trim())).filter(Boolean) as number[]
      : undefined
    const excludedModesList = excludeModes
      ? (Array.isArray(excludeModes) ? excludeModes : excludeModes.split(',')).map((m: string) => getModeCode(m.trim())).filter(Boolean) as number[]
      : undefined

    const tripQuery: TripQuery = {
      from,
      to,
      when: departureTime.toISOString(),
      arriveBy: Boolean(arriveBy),
      strategy: rankingStrategy,
      modes: modes ? (Array.isArray(modes) ? modes : modes.split(',')) : undefined,
      excludeModes: excludeModes ? (Array.isArray(excludeModes) ? excludeModes : excludeModes.split(',')) : undefined,
      accessible: Boolean(accessible),
    }

    const journeys = await planTrip(from, to, departureTime, {
      arriveBy: Boolean(arriveBy),
      accessible: Boolean(accessible),
      includedModes,
      excludedModes: excludedModesList,
    })

    const realtimeData = await loadRealtimeData()
    const mergedJourneys = journeys.map(j => mergeJourneyRealtime(j, realtimeData))

    // Enrich with fare data from GraphQL (if enabled)
    let enrichedJourneys = mergedJourneys
    let fareSource: 'graphql' | 'unavailable' = 'unavailable'
    if (isFareEnrichmentEnabled()) {
      const withFares = await enrichJourneysWithFares(
        mergedJourneys,
        from,
        to,
        { excludedModes: excludedModesList }
      )
      enrichedJourneys = withFares as typeof mergedJourneys
      fareSource = withFares.some(j => j.enrichedFare) ? 'graphql' : 'unavailable'
    }

    const { best, alternatives } = getBestAndAlternatives(enrichedJourneys, rankingStrategy)

    // Helper to add extras to a journey
    const addJourneyExtras = (journey: typeof best) => {
      if (!journey) return null
      const j = journey as unknown as Record<string, unknown>
      const travelInCars = extractTravelInCars(journey)
      const occupancy = extractOccupancy(journey)
      if (travelInCars.length > 0) j.travelInCars = travelInCars
      if (occupancy.length > 0) j.occupancy = occupancy
      return journey
    }

    // Add extras to best and all alternatives
    const enrichedBest = addJourneyExtras(best)
    const enrichedAlternatives = alternatives.map(addJourneyExtras).filter(Boolean)

    res.json({
      success: true,
      data: {
        best: enrichedBest,
        alternatives: enrichedAlternatives,
        query: tripQuery,
        totalOptions: journeys.length,
      },
      meta: {
        timestamp: Date.now(),
        realtimeStatus: realtimeData.status,
        realtimeAge: realtimeData.ageSeconds,
        fareSource,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] POST Error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'PLANNING_FAILED', message },
    })
  }
})

export default router
