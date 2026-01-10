/**
 * Disruptions API Endpoint
 * Active alerts filtered by relevance
 */

import { Router, type Router as RouterType } from 'express'
import { getServiceAlerts, getModeCode } from '../lib/tfnsw-tp-client.js'
import { getAlerts } from '../lib/cache.js'
import type { Alert } from '../types/gtfs.js'
import type { ServiceAlert } from '../types/trip-planner.js'

const router: RouterType = Router()

/** Combine and deduplicate alerts from both sources */
function combineAlerts(gtfsAlerts: Alert[], tpAlerts: ServiceAlert[]): CombinedAlert[] {
  const combined: CombinedAlert[] = []
  const seenIds = new Set<string>()

  // Add GTFS alerts first (usually more structured)
  for (const alert of gtfsAlerts) {
    if (!seenIds.has(alert.id)) {
      seenIds.add(alert.id)
      combined.push({
        id: alert.id,
        title: alert.headerText,
        description: alert.descriptionText,
        url: alert.url,
        severity: alert.severity,
        effect: alert.effect,
        cause: alert.cause,
        activePeriods: alert.activePeriods,
        affectedRoutes: alert.informedEntities.filter(e => e.routeId).map(e => e.routeId!),
        affectedStops: alert.informedEntities.filter(e => e.stopId).map(e => e.stopId!),
        source: 'gtfs',
        updatedAt: alert.updatedAt,
      })
    }
  }

  // Add Trip Planner alerts (may have more detail)
  for (const alert of tpAlerts) {
    const id = alert.id ?? `tp-${alert.title}`
    if (!seenIds.has(id)) {
      seenIds.add(id)
      combined.push({
        id,
        title: alert.subtitle ?? alert.title ?? 'Service Alert',
        description: alert.content,
        url: alert.url,
        severity: mapPriorityToSeverity(alert.priority),
        effect: 'unknown',
        cause: 'unknown',
        activePeriods: [],
        affectedRoutes: alert.affected?.lines?.map(l => l.id).filter(Boolean) as string[] ?? [],
        affectedStops: alert.affected?.stops?.map(s => s.id).filter(Boolean) as string[] ?? [],
        source: 'trip_planner',
        updatedAt: alert.timestamps?.lastModification 
          ? new Date(alert.timestamps.lastModification).getTime() / 1000 
          : Date.now() / 1000,
      })
    }
  }

  return combined
}

/** Map TfNSW priority to severity */
function mapPriorityToSeverity(priority: string | undefined): string {
  switch (priority) {
    case 'veryHigh': return 'severe'
    case 'high': return 'warning'
    case 'normal': return 'info'
    case 'low':
    case 'veryLow':
    default:
      return 'info'
  }
}

/** Sort alerts by severity */
function sortBySeverity(alerts: CombinedAlert[]): CombinedAlert[] {
  const severityOrder: Record<string, number> = {
    severe: 0,
    warning: 1,
    info: 2,
    unknown: 3,
  }

  return alerts.sort((a, b) => {
    const orderA = severityOrder[a.severity] ?? 99
    const orderB = severityOrder[b.severity] ?? 99
    if (orderA !== orderB) return orderA - orderB
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
}

interface CombinedAlert {
  id: string
  title: string
  description?: string
  url?: string
  severity: string
  effect: string
  cause: string
  activePeriods: { start?: number; end?: number }[]
  affectedRoutes: string[]
  affectedStops: string[]
  source: 'gtfs' | 'trip_planner'
  updatedAt?: number
}

/**
 * GET /api/disruptions
 * Get all active disruptions, optionally filtered by mode
 */
router.get('/', async (req, res) => {
  const { modes } = req.query

  try {
    // Parse mode filters
    const modeList = modes 
      ? (modes as string).split(',').map(m => getModeCode(m.trim())).filter(Boolean) as number[]
      : undefined

    // Fetch from both sources
    const [gtfsAlerts, tpAlerts] = await Promise.all([
      getAlerts('all') ?? Promise.resolve([]),
      getServiceAlerts({ modes: modeList, currentOnly: true }),
    ])

    // Combine and sort
    let combined = combineAlerts(gtfsAlerts ?? [], tpAlerts)
    combined = sortBySeverity(combined)

    res.json({
      success: true,
      data: {
        alerts: combined,
        count: combined.length,
        filters: { modes: modes ? (modes as string).split(',') : undefined },
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Disruptions] Error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * GET /api/disruptions/stop/:stopId
 * Get disruptions affecting a specific stop
 */
router.get('/stop/:stopId', async (req, res) => {
  const { stopId } = req.params

  try {
    const [gtfsAlerts, tpAlerts] = await Promise.all([
      getAlerts('all') ?? Promise.resolve([]),
      getServiceAlerts({ stopId, currentOnly: true }),
    ])

    // Combine and filter by stop
    let combined = combineAlerts(gtfsAlerts ?? [], tpAlerts)
    combined = combined.filter(a => a.affectedStops.includes(stopId))
    combined = sortBySeverity(combined)

    res.json({
      success: true,
      data: {
        alerts: combined,
        count: combined.length,
        stopId,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Disruptions] Stop error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * GET /api/disruptions/route/:routeId
 * Get disruptions affecting a specific route
 */
router.get('/route/:routeId', async (req, res) => {
  const { routeId } = req.params

  try {
    const [gtfsAlerts, tpAlerts] = await Promise.all([
      getAlerts('all') ?? Promise.resolve([]),
      getServiceAlerts({ lineId: routeId, currentOnly: true }),
    ])

    // Combine and filter by route
    let combined = combineAlerts(gtfsAlerts ?? [], tpAlerts)
    combined = combined.filter(a => 
      a.affectedRoutes.some(r => r.includes(routeId) || routeId.includes(r))
    )
    combined = sortBySeverity(combined)

    res.json({
      success: true,
      data: {
        alerts: combined,
        count: combined.length,
        routeId,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Disruptions] Route error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

export default router
