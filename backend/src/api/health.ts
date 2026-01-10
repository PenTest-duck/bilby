/**
 * Health check endpoint
 * GET /api/health
 */

import { Router, type Router as RouterType } from 'express'
import { checkRedisHealth } from '../lib/redis.js'
import type { HealthResponse } from '../types/index.js'

const router: RouterType = Router()

router.get('/', async (_req, res) => {
  const redisHealth = await checkRedisHealth()
  
  const response: HealthResponse = {
    status: redisHealth.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      redis: {
        connected: redisHealth.connected,
        latencyMs: redisHealth.latencyMs,
      },
    },
    version: '1.0.0',
  }

  res.json(response)
})

export default router
