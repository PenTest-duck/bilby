/**
 * API Router
 * Mounts all API route modules
 */

import { Router, type Router as RouterType } from 'express'
import healthRouter from './health.js'
import pollersRouter from './pollers.js'
import stopsRouter from './stops.js'
import departuresRouter from './departures.js'
import disruptionsRouter from './disruptions.js'
import tripsRouter from './trips.js'
import vehiclesRouter from './vehicles.js'
import authRouter from './auth.js'
import userRouter from './user/index.js'
import statusRouter from './status.js'
import liveActivityRouter from './live-activity.js'

const router: RouterType = Router()

// Mount routes
router.use('/health', healthRouter)
router.use('/status', statusRouter)
router.use('/pollers', pollersRouter)
router.use('/stops', stopsRouter)
router.use('/departures', departuresRouter)
router.use('/disruptions', disruptionsRouter)
router.use('/trips', tripsRouter)
router.use('/vehicles', vehiclesRouter)
router.use('/auth', authRouter)
router.use('/user', userRouter)
router.use('/live-activity', liveActivityRouter)

export default router
