/**
 * Shared TypeScript types for Bilby backend
 */

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

/** API error structure */
export interface ApiError {
  code: string
  message: string
  details?: unknown
}

/** Response metadata */
export interface ResponseMeta {
  timestamp: string
  version: string
  requestId?: string
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  services: {
    redis: {
      connected: boolean
      latencyMs?: number
    }
  }
  version: string
}

/** Environment configuration */
export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test'
  redisUrl: string | undefined
  tfnswApiKey: string | undefined
  supabaseUrl: string | undefined
  supabaseSecretKey: string | undefined
}
