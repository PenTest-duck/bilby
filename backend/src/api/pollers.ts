/**
 * Pollers API Endpoint
 * For monitoring and manual triggering (dev only)
 */

import { Router, type Router as RouterType } from 'express'
import { getOrchestrator, getAlertsPoller, getTripUpdatesPoller, getVehiclePositionsPoller } from '../pollers/index.js'
import { getCacheStats } from '../lib/cache.js'
import { isDev } from '../lib/env.js'

const router: RouterType = Router()

/**
 * GET /api/pollers/status
 * Get status of all pollers and cache stats
 */
router.get('/status', async (_req, res) => {
  const orchestrator = getOrchestrator()
  const status = orchestrator.getStatus()
  
  let cacheStats = null
  try {
    cacheStats = await getCacheStats()
  } catch {
    // Redis not available
  }

  res.json({
    orchestrator: {
      running: status.running,
      startedAt: status.startedAt,
      uptime: status.startedAt ? Math.round((Date.now() - status.startedAt) / 1000) : null,
    },
    pollers: status.pollers,
    cache: cacheStats,
    redisConfigured: cacheStats !== null,
  })
})

/**
 * POST /api/pollers/start
 * Start all pollers (dev only)
 */
router.post('/start', async (_req, res) => {
  if (!isDev) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only available in development' } })
    return
  }

  const orchestrator = getOrchestrator()
  await orchestrator.start()
  
  res.json({ message: 'Pollers started' })
})

/**
 * POST /api/pollers/stop
 * Stop all pollers (dev only)
 */
router.post('/stop', (_req, res) => {
  if (!isDev) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only available in development' } })
    return
  }

  const orchestrator = getOrchestrator()
  orchestrator.stop()
  
  res.json({ message: 'Pollers stopped' })
})

/**
 * POST /api/pollers/trigger/:feed
 * Manually trigger a specific poller (dev only)
 */
router.post('/trigger/:feed', async (req, res) => {
  if (!isDev) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only available in development' } })
    return
  }

  const { feed } = req.params
  
  try {
    switch (feed) {
      case 'alerts':
        await getAlertsPoller().trigger()
        break
      case 'tripupdates':
        await getTripUpdatesPoller().trigger()
        break
      case 'vehiclepos':
        await getVehiclePositionsPoller().trigger()
        break
      case 'all':
        await getOrchestrator().triggerAll()
        break
      default:
        res.status(400).json({ error: { code: 'INVALID_FEED', message: `Unknown feed: ${feed}` } })
        return
    }
    
    res.json({ message: `Triggered ${feed} poller` })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: { code: 'TRIGGER_FAILED', message } })
  }
})

export default router
