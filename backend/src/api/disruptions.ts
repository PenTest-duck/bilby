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
import type { AlertCause, AlertEffect, TimeRange } from '../types/gtfs.js'
import type { AlertType } from '../types/api-schema.js'
import type { ServiceAlert } from '../types/trip-planner.js'

const router: RouterType = Router()

/** Transform service alert to app format */
function transformAlert(alert: ServiceAlert): AppAlert {
  const id = alert.id ?? `alert-${Date.now()}`
  const type = getAlertType(alert)
  const text = normalizeAlertText(alert)

  return {
    id,
    title: alert.subtitle ?? alert.title ?? 'Service Alert',
    description: alert.content,
    url: alert.url,
    severity: mapPriorityToSeverity(alert.priority),
    priority: alert.priority ?? 'normal',
    type,
    effect: inferEffect(text, type),
    cause: inferCause(text, type),
    activePeriods: buildActivePeriods(alert),
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
    source: 'trip_planner_add_info',
  }
}

/** Get alert type from content analysis */
function getAlertType(alert: ServiceAlert): AlertType {
  const content = (alert.content ?? '').toLowerCase()
  const title = (alert.title ?? '').toLowerCase()
  
  if (content.includes('lift') || content.includes('escalator') || content.includes('elevator')) {
    return 'infrastructure'
  }
  if (content.includes('cancelled') || content.includes('canceled') || content.includes('not running') || content.includes('suspended')) {
    return 'cancellation'
  }
  if (content.includes('delay') || content.includes('running late')) {
    return 'delay'
  }
  if (content.includes('closed') || content.includes('closure')) {
    return 'closure'
  }
  if (title.includes('planned') || content.includes('planned work') || content.includes('trackwork') || content.includes('maintenance')) {
    return 'planned_works'
  }
  return 'info'
}

/** Build a normalized text blob for keyword matching */
function normalizeAlertText(alert: ServiceAlert): string {
  return [
    alert.title,
    alert.subtitle,
    alert.content,
  ].filter(Boolean).join(' ').toLowerCase()
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some(phrase => text.includes(phrase))
}

/** Infer GTFS-style cause from alert text */
function inferCause(text: string, type: AlertType): AlertCause {
  if (includesAny(text, ['trackwork', 'maintenance', 'planned work', 'planned works', 'weekend work'])) {
    return 'maintenance'
  }
  if (includesAny(text, ['construction', 'upgrade', 'works site', 'worksite'])) {
    return 'construction'
  }
  if (includesAny(text, ['accident', 'collision', 'crash', 'incident'])) {
    return 'accident'
  }
  if (includesAny(text, ['weather', 'storm', 'rain', 'flood', 'wind', 'heat'])) {
    return 'weather'
  }
  if (includesAny(text, ['police'])) {
    return 'police_activity'
  }
  if (includesAny(text, ['medical', 'illness'])) {
    return 'medical_emergency'
  }
  if (includesAny(text, ['signal', 'technical', 'equipment', 'fault', 'power'])) {
    return 'technical_problem'
  }
  if (includesAny(text, ['strike', 'industrial action'])) {
    return 'strike'
  }
  if (includesAny(text, ['protest', 'demonstration'])) {
    return 'demonstration'
  }
  if (includesAny(text, ['holiday', 'public holiday'])) {
    return 'holiday'
  }
  if (type === 'planned_works') {
    return 'maintenance'
  }
  return 'unknown'
}

/** Infer GTFS-style effect from alert text */
function inferEffect(text: string, type: AlertType): AlertEffect {
  if (includesAny(text, ['cancelled', 'canceled', 'not running', 'suspended'])) {
    return 'no_service'
  }
  if (includesAny(text, ['delay', 'running late', 'late'])) {
    return 'significant_delays'
  }
  if (includesAny(text, ['detour', 'divert', 'diverted', 'diversion', 'reroute', 'rerouted', 'replacement bus', 'shuttle bus'])) {
    return 'detour'
  }
  if (includesAny(text, ['reduced', 'limited', 'fewer services', 'shorter services'])) {
    return 'reduced_service'
  }
  if (includesAny(text, ['additional service', 'additional services', 'extra services'])) {
    return 'additional_service'
  }
  if (includesAny(text, ['stop moved', 'relocated stop', 'temporary stop', 'stop relocated'])) {
    return 'stop_moved'
  }
  if (includesAny(text, ['lift', 'escalator', 'elevator', 'wheelchair access'])) {
    return 'accessibility_issue'
  }
  if (includesAny(text, ['closed', 'closure', 'not stopping', 'skipping stops', 'platform closed', 'station closed'])) {
    return 'modified_service'
  }
  if (type === 'cancellation') {
    return 'no_service'
  }
  if (type === 'delay') {
    return 'significant_delays'
  }
  if (type === 'closure' || type === 'planned_works') {
    return 'modified_service'
  }
  if (type === 'infrastructure') {
    return 'accessibility_issue'
  }
  if (type === 'info') {
    return 'no_effect'
  }
  return 'unknown'
}

/** Parse TfNSW timestamp string to unix seconds */
function parseTimestamp(value?: string): number | undefined {
  if (!value) return undefined
  const numeric = Number(value)
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    if (numeric > 1_000_000_000_000) {
      return Math.floor(numeric / 1000)
    }
    if (numeric > 1_000_000_000) {
      return Math.floor(numeric)
    }
  }
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return Math.floor(parsed / 1000)
}

/** Build active periods from add_info validity fields */
function buildActivePeriods(alert: ServiceAlert): TimeRange[] {
  const periods = (alert.timestamps?.validity ?? [])
    .map(period => ({
      start: parseTimestamp(period.from),
      end: parseTimestamp(period.to),
    }))
    .filter(period => period.start !== undefined || period.end !== undefined)

  if (periods.length > 0) {
    return periods
  }

  const fallbackStart = parseTimestamp(alert.timestamps?.creation) ??
    parseTimestamp(alert.timestamps?.lastModification)

  return [{ start: fallbackStart, end: undefined }]
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
  type: AlertType
  effect: AlertEffect
  cause: AlertCause
  activePeriods: TimeRange[]
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
  source?: 'gtfs' | 'trip_planner' | 'trip_planner_add_info'
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
