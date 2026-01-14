/**
 * Live Activity API Endpoints
 * 
 * Manages iOS Live Activity registration, updates, and lifecycle
 */

import { Router, type Router as RouterType } from 'express'
import {
  registerActivity,
  getActivity,
  updateActivityState,
  endActivity,
  getActiveActivities,
  processActiveActivities,
} from '../lib/live-activity-manager.js'
import {
  registerDeviceToken,
  isValidExpoPushToken,
  checkPushReceipts,
} from '../lib/push-notification-service.js'
import type {
  LiveActivityRegisterRequest,
  ContentState,
} from '../types/live-activity.js'

const router: RouterType = Router()

/**
 * POST /api/live-activity/register
 * Register a new Live Activity and store push token for updates
 */
router.post('/register', async (req, res) => {
  try {
    const body = req.body as LiveActivityRegisterRequest
    
    // Validate required fields
    if (!body.activityId || !body.pushToken || !body.journey || !body.attributes || !body.initialState) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['activityId', 'pushToken', 'journey', 'attributes', 'initialState'],
      })
    }

    // Validate push token format
    if (!isValidExpoPushToken(body.pushToken)) {
      return res.status(400).json({
        error: 'Invalid Expo push token format',
      })
    }

    // Get user ID from auth if available
    const userId = (req as any).user?.id

    // Register the activity
    const activity = await registerActivity(
      body.activityId,
      body.pushToken,
      body.journey,
      body.attributes,
      body.initialState,
      userId
    )

    // Also register the device token for the user if authenticated
    if (userId) {
      await registerDeviceToken(userId, body.pushToken)
    }

    return res.status(201).json({
      success: true,
      activityId: activity.activityId,
      message: 'Live Activity registered successfully',
    })
  } catch (error) {
    console.error('Failed to register Live Activity:', error)
    return res.status(500).json({
      error: 'Failed to register Live Activity',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/live-activity/:activityId
 * Get the current state of a Live Activity
 */
router.get('/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params

    const activity = await getActivity(activityId)
    
    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found',
      })
    }

    return res.json({
      activityId: activity.activityId,
      attributes: activity.attributes,
      currentState: activity.currentState,
      createdAt: activity.createdAt,
      lastUpdatedAt: activity.lastUpdatedAt,
    })
  } catch (error) {
    console.error('Failed to get Live Activity:', error)
    return res.status(500).json({
      error: 'Failed to get Live Activity',
    })
  }
})

/**
 * PATCH /api/live-activity/:activityId
 * Update a Live Activity's state
 */
router.patch('/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params
    const stateUpdate = req.body as Partial<ContentState>
    const sendPush = req.query.push !== 'false'

    const result = await updateActivityState(activityId, stateUpdate, sendPush)
    
    if (!result.success) {
      return res.status(404).json({
        error: result.error || 'Activity not found',
      })
    }

    return res.json({
      success: true,
      message: 'Activity updated',
    })
  } catch (error) {
    console.error('Failed to update Live Activity:', error)
    return res.status(500).json({
      error: 'Failed to update Live Activity',
    })
  }
})

/**
 * POST /api/live-activity/:activityId/end
 * End a Live Activity
 */
router.post('/:activityId/end', async (req, res) => {
  try {
    const { activityId } = req.params
    const { finalState, message } = req.body as {
      finalState?: ContentState
      message?: { title: string; body: string }
    }

    const result = await endActivity(activityId, finalState, message)
    
    if (!result.success) {
      return res.status(404).json({
        error: result.error || 'Activity not found',
      })
    }

    return res.json({
      success: true,
      message: 'Activity ended',
    })
  } catch (error) {
    console.error('Failed to end Live Activity:', error)
    return res.status(500).json({
      error: 'Failed to end Live Activity',
    })
  }
})

/**
 * DELETE /api/live-activity/:activityId
 * Delete/end a Live Activity immediately
 */
router.delete('/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params

    const result = await endActivity(activityId)
    
    if (!result.success) {
      return res.status(404).json({
        error: result.error || 'Activity not found',
      })
    }

    return res.json({
      success: true,
      message: 'Activity deleted',
    })
  } catch (error) {
    console.error('Failed to delete Live Activity:', error)
    return res.status(500).json({
      error: 'Failed to delete Live Activity',
    })
  }
})

/**
 * GET /api/live-activity
 * Get all active Live Activities (admin/debug endpoint)
 */
router.get('/', async (req, res) => {
  try {
    const activities = await getActiveActivities()
    
    return res.json({
      count: activities.length,
      activities: activities.map(a => ({
        activityId: a.activityId,
        tripId: a.attributes.tripId,
        destination: a.attributes.destinationName,
        phase: a.currentState.phase,
        createdAt: a.createdAt,
        lastUpdatedAt: a.lastUpdatedAt,
      })),
    })
  } catch (error) {
    console.error('Failed to get Live Activities:', error)
    return res.status(500).json({
      error: 'Failed to get Live Activities',
    })
  }
})

/**
 * POST /api/live-activity/process
 * Trigger processing of all active activities (for testing/manual trigger)
 * In production, this would be called by a cron job
 */
router.post('/process', async (req, res) => {
  try {
    const result = await processActiveActivities()
    
    return res.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Failed to process Live Activities:', error)
    return res.status(500).json({
      error: 'Failed to process Live Activities',
    })
  }
})

/**
 * POST /api/live-activity/check-receipts
 * Check push notification receipts (for testing/manual trigger)
 */
router.post('/check-receipts', async (req, res) => {
  try {
    const result = await checkPushReceipts()
    
    return res.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Failed to check push receipts:', error)
    return res.status(500).json({
      error: 'Failed to check push receipts',
    })
  }
})

export default router
