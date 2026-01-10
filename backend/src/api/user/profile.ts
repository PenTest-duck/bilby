/**
 * User Profile Endpoints
 * Get and update user profile
 */

import { Router, type Router as RouterType } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

const router: RouterType = Router()

// All routes require authentication
router.use(requireAuth)

/**
 * GET /api/user/profile
 * Get user profile
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      // Profile should exist (auto-created on signup) but handle gracefully
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        })
        return
      }
      throw error
    }
    
    res.json({
      success: true,
      data: { profile: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Profile] Get error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * PUT /api/user/profile
 * Update profile (partial update supported)
 */
router.put('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { display_name, home_stop_id, work_stop_id } = req.body
  
  try {
    const updates: Record<string, unknown> = {}
    if (display_name !== undefined) updates.display_name = display_name
    if (home_stop_id !== undefined) updates.home_stop_id = home_stop_id
    if (work_stop_id !== undefined) updates.work_stop_id = work_stop_id
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        })
        return
      }
      throw error
    }
    
    res.json({
      success: true,
      data: { profile: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Profile] Update error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message },
    })
  }
})

export default router
