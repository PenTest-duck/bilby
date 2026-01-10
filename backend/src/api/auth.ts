/**
 * Auth API Endpoints
 * Token verification and user info
 */

import { Router, type Router as RouterType } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { getAdminClient } from '../lib/supabase.js'

const router: RouterType = Router()

/**
 * POST /api/auth/verify
 * Verify token and return user info
 */
router.post('/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  
  try {
    // Fetch profile from database
    const supabase = req.supabase!
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Auth] Verify error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'VERIFY_FAILED', message },
    })
  }
})

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!
  const supabase = req.supabase!
  
  try {
    // Fetch profile and preferences
    const [profileResult, prefsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('preferences').select('*').eq('user_id', user.id).single(),
    ])
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile: profileResult.data,
        preferences: prefsResult.data,
      },
      meta: {
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Auth] Me error:', message)
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    })
  }
})

export default router
