/**
 * User Recent Stops Endpoints
 * Track recently used stops for quick access
 */

import { Router, type Router as RouterType } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

const router: RouterType = Router()

// All routes require authentication
router.use(requireAuth)

/** Max number of recent stops to keep */
const MAX_RECENT_STOPS = 20

/**
 * GET /api/user/recent-stops
 * List recent stops (sorted by recency)
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  
  try {
    const { data, error } = await supabase
      .from('recent_stops')
      .select('*')
      .eq('user_id', user.id)
      .order('used_at', { ascending: false })
      .limit(MAX_RECENT_STOPS)
    
    if (error) throw error
    
    res.json({
      success: true,
      data: { stops: data, count: data.length },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[RecentStops] List error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * POST /api/user/recent-stops
 * Add/update a recent stop (upserts - increments use_count if exists)
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { stop_id, stop_name } = req.body
  
  if (!stop_id || !stop_name) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'stop_id and stop_name are required' },
    })
    return
  }
  
  try {
    // Check if stop already exists
    const { data: existing } = await supabase
      .from('recent_stops')
      .select('id, use_count')
      .eq('user_id', user.id)
      .eq('stop_id', stop_id)
      .single()
    
    let data
    if (existing) {
      // Update existing - increment use_count and update used_at
      const { data: updated, error } = await supabase
        .from('recent_stops')
        .update({
          stop_name, // Update name in case it changed
          used_at: new Date().toISOString(),
          use_count: (existing.use_count || 1) + 1,
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      data = updated
    } else {
      // Insert new
      const { data: inserted, error } = await supabase
        .from('recent_stops')
        .insert({
          user_id: user.id,
          stop_id,
          stop_name,
        })
        .select()
        .single()
      
      if (error) throw error
      data = inserted
      
      // Clean up old entries if over limit
      await cleanupOldStops(supabase, user.id)
    }
    
    res.status(201).json({
      success: true,
      data: { stop: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[RecentStops] Add error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message },
    })
  }
})

/**
 * DELETE /api/user/recent-stops/:id
 * Remove from recents
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { id } = req.params
  
  try {
    const { error } = await supabase
      .from('recent_stops')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    
    if (error) throw error
    
    res.json({
      success: true,
      data: { deleted: true },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[RecentStops] Delete error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message },
    })
  }
})

/**
 * Clean up old stops if over limit
 */
async function cleanupOldStops(supabase: AuthenticatedRequest['supabase'], userId: string) {
  if (!supabase) return
  
  try {
    // Get all stops ordered by used_at
    const { data: stops } = await supabase
      .from('recent_stops')
      .select('id')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
    
    if (stops && stops.length > MAX_RECENT_STOPS) {
      // Delete oldest entries
      const toDelete = stops.slice(MAX_RECENT_STOPS).map(s => s.id)
      await supabase
        .from('recent_stops')
        .delete()
        .in('id', toDelete)
    }
  } catch (error) {
    console.error('[RecentStops] Cleanup error:', error)
  }
}

export default router
