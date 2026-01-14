/**
 * Disruptions API Endpoint
 * Active alerts from TfNSW Trip Planner /add_info endpoint
 * 
 * NOTE: Previously fetched from both GTFS Realtime Alerts and /add_info.
 * Simplified to use only /add_info as it provides richer metadata
 * (priority levels, validity periods, affected stops/lines) and
 * both sources originate from TfNSW's Incident Capture System.
 */

import { Router, type Router as RouterType } from 'express'
import { getServiceAlerts, getModeCode } from '../lib/tfnsw-tp-client.js'
import type { ServiceAlert } from '../types/trip-planner.js'

const router: RouterType = Router()

/** Transform service alert to app format */
function transformAlert(alert: ServiceAlert): AppAlert {
  const id = alert.id ?? `alert-${Date.now()}`
  
  return {
    id,
    title: alert.subtitle ?? alert.title ?? 'Service Alert',
    description: alert.content,
    url: alert.url,
    severity: mapPriorityToSeverity(alert.priority),
    priority: alert.priority ?? 'normal',
    type: getAlertType(alert),
    affectedRoutes: alert.affected?.lines?.map(l => l.id).filter(Boolean) as string[] ?? [],
    affectedStops: alert.affected?.stops?.map(s => s.id).filter(Boolean) as string[] ?? [],
    affectedLines: alert.affected?.lines?.map(l => ({
      id: l.id,
      name: l.name,
      number: l.number,
      mode: l.product?.class,
    })).filter(l => l.id) ?? [],
    validity: alert.timestamps?.validity?.map(v => ({
      from: v.from,
      to: v.to,
    })) ?? [],
    updatedAt: alert.timestamps?.lastModification 
      ? new Date(alert.timestamps.lastModification).getTime() / 1000 
      : Date.now() / 1000,
  }
}

/** Get alert type from content analysis */
function getAlertType(alert: ServiceAlert): string {
  const content = (alert.content ?? '').toLowerCase()
  const title = (alert.title ?? '').toLowerCase()
  
  if (content.includes('lift') || content.includes('escalator') || content.includes('elevator')) {
    return 'infrastructure'
  }
  if (content.includes('cancelled') || content.includes('not running')) {
    return 'cancellation'
  }
  if (content.includes('delay') || content.includes('running late')) {
    return 'delay'
  }
  if (content.includes('closed') || content.includes('closure')) {
    return 'closure'
  }
  if (title.includes('planned') || content.includes('planned work')) {
    return 'planned_works'
  }
  return 'info'
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
function sortBySeverity(alerts: AppAlert[]): AppAlert[] {
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

interface AppAlert {
  id: string
  title: string
  description?: string
  url?: string
  severity: string
  priority: string
  type: string
  affectedRoutes: string[]
  affectedStops: string[]
  affectedLines: {
    id?: string
    name?: string
    number?: string
    mode?: number
  }[]
  validity: { from?: string; to?: string }[]
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

    // Fetch from Trip Planner /add_info (single source of truth)
    const serviceAlerts = await getServiceAlerts({ modes: modeList, currentOnly: true })

    // Transform and sort
    let alerts = serviceAlerts.map(transformAlert)
    alerts = sortBySeverity(alerts)

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        filters: { modes: modes ? (modes as string).split(',') : undefined },
      },
      meta: {
        timestamp: Date.now(),
        source: 'trip_planner_add_info',
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
    // Fetch alerts filtered by stop
    const serviceAlerts = await getServiceAlerts({ stopId, currentOnly: true })

    // Transform and filter by stop
    let alerts = serviceAlerts.map(transformAlert)
    alerts = alerts.filter(a => a.affectedStops.includes(stopId))
    alerts = sortBySeverity(alerts)

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        stopId,
      },
      meta: {
        timestamp: Date.now(),
        source: 'trip_planner_add_info',
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
    // Fetch alerts filtered by line
    const serviceAlerts = await getServiceAlerts({ lineId: routeId, currentOnly: true })

    // Transform and filter by route
    let alerts = serviceAlerts.map(transformAlert)
    alerts = alerts.filter(a => 
      a.affectedRoutes.some(r => r.includes(routeId) || routeId.includes(r))
    )
    alerts = sortBySeverity(alerts)

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        routeId,
      },
      meta: {
        timestamp: Date.now(),
        source: 'trip_planner_add_info',
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
