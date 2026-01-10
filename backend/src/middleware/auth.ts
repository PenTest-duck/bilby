/**
 * Authentication Middleware
 * JWT verification using Supabase Auth
 */

import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../lib/env.js'
import { createUserClient, type TypedSupabaseClient } from '../lib/supabase.js'

/** User info extracted from JWT */
export interface AuthUser {
  id: string
  email?: string
  role: string
}

/** Extended request with auth context */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser
  supabase?: TypedSupabaseClient
  accessToken?: string
}

/** JWKS endpoint for Supabase */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (jwks) return jwks
  
  if (!env.supabaseUrl) {
    throw new Error('SUPABASE_URL is required for JWT verification')
  }
  
  jwks = createRemoteJWKSet(
    new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`)
  )
  return jwks
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  
  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) return null
  
  return token
}

/**
 * Verify JWT and extract user info
 */
async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const issuer = `${env.supabaseUrl}/auth/v1`
    const { payload } = await jwtVerify(token, getJWKS(), { issuer })
    
    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      role: payload.role as string || 'authenticated',
    }
  } catch (error) {
    console.error('[Auth] JWT verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Optional auth middleware
 * Sets req.user if valid token present, continues otherwise
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req)
  
  if (token) {
    const user = await verifyToken(token)
    if (user) {
      req.user = user
      req.accessToken = token
      req.supabase = createUserClient(token)
    }
  }
  
  next()
}

/**
 * Required auth middleware
 * Returns 401 if no valid token
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req)
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
    return
  }
  
  const user = await verifyToken(token)
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    })
    return
  }
  
  req.user = user
  req.accessToken = token
  req.supabase = createUserClient(token)
  
  next()
}
