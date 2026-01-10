/**
 * Supabase Client Factory
 * Creates typed Supabase clients for server-side use
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env.js'
import type { Database } from '../types/database.js'

/** Supabase client type with database schema */
export type TypedSupabaseClient = SupabaseClient<Database>

/** Cached admin client (service role) */
let adminClient: TypedSupabaseClient | null = null

/**
 * Get Supabase admin client (service role)
 * Bypasses RLS - use for admin operations only
 */
export function getAdminClient(): TypedSupabaseClient {
  if (adminClient) return adminClient

  const supabaseUrl = env.supabaseUrl
  const secretKey = env.supabaseSecretKey

  if (!supabaseUrl || !secretKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set')
  }

  adminClient = createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

/**
 * Create Supabase client for a specific user
 * Respects RLS using user's JWT
 */
export function createUserClient(accessToken: string): TypedSupabaseClient {
  const supabaseUrl = env.supabaseUrl
  const publishableKey = env.supabasePublishableKey

  if (!supabaseUrl || !publishableKey) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set')
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create anonymous Supabase client
 * Uses publishable key, respects RLS (will have no access to user data)
 */
export function createAnonClient(): TypedSupabaseClient {
  const supabaseUrl = env.supabaseUrl
  const publishableKey = env.supabasePublishableKey

  if (!supabaseUrl || !publishableKey) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set')
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
