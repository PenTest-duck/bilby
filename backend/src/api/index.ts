/**
 * API Router
 * Mounts all API route modules
 */

import { Router, type Router as RouterType } from 'express'
import healthRouter from './health.js'

const router: RouterType = Router()

// Mount routes
router.use('/health', healthRouter)

// Future routes:
// router.use('/trips', tripsRouter)
// router.use('/departures', departuresRouter)
// router.use('/disruptions', disruptionsRouter)
// router.use('/stops', stopsRouter)
// router.use('/routes', routesRouter)

export default router
