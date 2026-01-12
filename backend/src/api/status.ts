/**
 * Service Status API Endpoint
 * GET /api/status
 * 
 * Provides overall network service status summary based on active disruptions.
 */

import { Router, type Router as RouterType } from 'express'
import { getAlerts } from '../lib/cache.js'
import { getServiceAlerts, getModeCode } from '../lib/tfnsw-tp-client.js'
import type { Alert } from '../types/gtfs.js'

const router: RouterType = Router()

/** Mode ID to name mapping */
const modeNames: Record<number, string> = {
  1: 'Train',
  2: 'Metro',
  4: 'Light Rail',
  5: 'Bus',
  7: 'Coach',
  9: 'Ferry',
  11: 'School Bus',
}

/** Determine overall status from alert count and severity */
function determineStatus(alerts: Alert[]): 'normal' | 'minor' | 'major' {
  const severeCount = alerts.filter(a => a.severity === 'severe').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  
  if (severeCount > 0) return 'major'
  if (warningCount > 2) return 'major'
  if (warningCount > 0) return 'minor'
  return 'normal'
}

/** Count alerts by mode */
function getAlertsByMode(alerts: Alert[]): Map<number, Alert[]> {
  const byMode = new Map<number, Alert[]>()
  
  for (const alert of alerts) {
    // Extract mode from route IDs (TfNSW format includes mode prefix)
    for (const entity of alert.informedEntities) {
      if (entity.routeType !== undefined) {
        const existing = byMode.get(entity.routeType) || []
        if (!existing.includes(alert)) {
          existing.push(alert)
          byMode.set(entity.routeType, existing)
        }
      }
    }
  }
  
  return byMode
}

/**
 * GET /api/status
 * Get overall network service status
 */
router.get('/', async (_req, res) => {
  try {
    // Fetch alerts from cache
    const gtfsAlerts = await getAlerts('all') ?? []
    
    // Get overall status
    const status = determineStatus(gtfsAlerts)
    
    // Group by mode
    const alertsByMode = getAlertsByMode(gtfsAlerts)
    
    // Build mode status list
    const byMode = Object.entries(modeNames).map(([modeIdStr, modeName]) => {
      const modeId = parseInt(modeIdStr, 10)
      const modeAlerts = alertsByMode.get(modeId) || []
      return {
        modeId,
        modeName,
        status: determineStatus(modeAlerts),
        alertCount: modeAlerts.length,
      }
    })
    
    // Build simplified alerts for response
    const alerts = gtfsAlerts.slice(0, 10).map(a => ({
      id: a.id,
      title: a.headerText,
      description: a.descriptionText,
      severity: a.severity,
      effect: a.effect,
      cause: a.cause,
      affectedRoutes: a.informedEntities.filter(e => e.routeId).map(e => e.routeId!),
      affectedStops: a.informedEntities.filter(e => e.stopId).map(e => e.stopId!),
    }))

    res.json({
      success: true,
      data: {
        status,
        message: status === 'normal' 
          ? 'All services operating normally' 
          : status === 'minor'
            ? 'Minor disruptions on some services'
            : 'Major disruptions affecting services',
        alerts,
        byMode,
        totalAlerts: gtfsAlerts.length,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Status] Error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

export default router
