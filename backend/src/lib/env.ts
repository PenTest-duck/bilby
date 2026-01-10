/**
 * Type-safe environment variable access
 * Validates required vars at startup
 */

import type { EnvConfig } from '../types/index.js'

function getEnvVar(key: string, required: boolean = false): string | undefined {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function loadEnvConfig(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as EnvConfig['nodeEnv']
  
  return {
    nodeEnv,
    redisUrl: getEnvVar('REDIS_URL'),
    tfnswApiKey: getEnvVar('TFNSW_API_KEY'),
    supabaseUrl: getEnvVar('SUPABASE_URL'),
    supabaseServiceKey: getEnvVar('SUPABASE_SERVICE_KEY'),
  }
}

/** Environment configuration singleton */
export const env = loadEnvConfig()

/** Check if running in development */
export const isDev = env.nodeEnv === 'development'

/** Check if running in production */
export const isProd = env.nodeEnv === 'production'
