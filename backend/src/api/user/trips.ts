/**
 * User Saved Trips Endpoints
 * CRUD for saved/favorite trips
 */

import { Router, type Router as RouterType } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

const router: RouterType = Router()

// All routes require authentication
router.use(requireAuth)

/**
 * GET /api/user/trips
 * List user's saved trips
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  
  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .select('*')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    res.json({
      success: true,
      data: { trips: data, count: data.length },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] List error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * POST /api/user/trips
 * Save a new trip
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { name, origin_id, origin_name, destination_id, destination_name, preferred_strategy, is_favorite } = req.body
  
  if (!name || !origin_id || !origin_name || !destination_id || !destination_name) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'name, origin_id, origin_name, destination_id, destination_name are required' },
    })
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .insert({
        user_id: user.id,
        name,
        origin_id,
        origin_name,
        destination_id,
        destination_name,
        preferred_strategy: preferred_strategy || 'best',
        is_favorite: is_favorite || false,
      })
      .select()
      .single()
    
    if (error) throw error
    
    res.status(201).json({
      success: true,
      data: { trip: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] Create error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message },
    })
  }
})

/**
 * GET /api/user/trips/:id
 * Get single trip
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { id } = req.params
  
  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Trip not found' },
        })
        return
      }
      throw error
    }
    
    res.json({
      success: true,
      data: { trip: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] Get error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

/**
 * PUT /api/user/trips/:id
 * Update trip
 */
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { id } = req.params
  const { name, origin_id, origin_name, destination_id, destination_name, preferred_strategy, is_favorite } = req.body
  
  try {
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (origin_id !== undefined) updates.origin_id = origin_id
    if (origin_name !== undefined) updates.origin_name = origin_name
    if (destination_id !== undefined) updates.destination_id = destination_id
    if (destination_name !== undefined) updates.destination_name = destination_name
    if (preferred_strategy !== undefined) updates.preferred_strategy = preferred_strategy
    if (is_favorite !== undefined) updates.is_favorite = is_favorite
    
    const { data, error } = await supabase
      .from('saved_trips')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Trip not found' },
        })
        return
      }
      throw error
    }
    
    res.json({
      success: true,
      data: { trip: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] Update error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message },
    })
  }
})

/**
 * DELETE /api/user/trips/:id
 * Delete trip
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { id } = req.params
  
  try {
    const { error } = await supabase
      .from('saved_trips')
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
    console.error('[Trips] Delete error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message },
    })
  }
})

/**
 * POST /api/user/trips/:id/use
 * Mark trip as used (updates last_used_at)
 */
router.post('/:id/use', async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  const { id } = req.params
  
  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Trip not found' },
        })
        return
      }
      throw error
    }
    
    res.json({
      success: true,
      data: { trip: data },
      meta: { timestamp: Date.now() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Trips] Use error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message },
    })
  }
})

export default router
