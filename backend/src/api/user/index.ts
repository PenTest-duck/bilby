/**
 * User API Router
 * Aggregates all user-related endpoints
 */

import { Router, type Router as RouterType } from 'express'
import tripsRouter from './trips.js'
import preferencesRouter from './preferences.js'
import recentStopsRouter from './recent-stops.js'
import profileRouter from './profile.js'

const router: RouterType = Router()

// Mount user routes
router.use('/trips', tripsRouter)
router.use('/preferences', preferencesRouter)
router.use('/recent-stops', recentStopsRouter)
router.use('/profile', profileRouter)

export default router
