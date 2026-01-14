/**
 * User Preferences Endpoints
 * Get and update user preferences
 */

import { Router, type Router as RouterType } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

const router: RouterType = Router()

// All routes require authentication
router.use(requireAuth)

/**
 * GET /api/user/preferences
 * Get user preferences (creates default if not exists)
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  
  try {
    // Try to get existing preferences
    let { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    // If not found, create default preferences
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('preferences')
        .insert({ user_id: user.id })
        .select()
        .single()
      
      if (insertError) throw insertError
      data = newData
    } else if (error) {
      throw error
    }
    
    res.json({
      success: true,
      data: { preferences: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Preferences] Get error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * PUT /api/user/preferences
 * Update preferences (partial update supported)
 */
router.put('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { default_strategy, preferred_modes, accessibility_required, notifications_enabled, theme, opal_card_type } = req.body
  
  try {
    // Build updates object
    const updates: Record<string, unknown> = {}
    if (default_strategy !== undefined) updates.default_strategy = default_strategy
    if (preferred_modes !== undefined) updates.preferred_modes = preferred_modes
    if (accessibility_required !== undefined) updates.accessibility_required = accessibility_required
    if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled
    if (theme !== undefined) updates.theme = theme
    if (opal_card_type !== undefined) updates.opal_card_type = opal_card_type
    
    // Upsert to handle case where preferences don't exist yet
    const { data, error } = await supabase
      .from('preferences')
      .upsert({ 
        user_id: user.id,
        ...updates,
      })
      .select()
      .single()
    
    if (error) throw error
    
    res.json({
      success: true,
      data: { preferences: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Preferences] Update error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message },
    })
  }
})

export default router
