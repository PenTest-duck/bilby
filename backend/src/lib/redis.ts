/**
 * Redis client singleton with connection handling
 * Designed for Vercel serverless context
 */

import { createClient, type RedisClientType } from 'redis'
import { env } from './env.js'

let redisClient: RedisClientType | null = null
let connectionPromise: Promise<RedisClientType> | null = null

/**
 * Get connected Redis client (singleton pattern)
 * Connection is established lazily on first call
 */
export async function getRedis(): Promise<RedisClientType> {
  if (redisClient?.isOpen) {
    return redisClient
  }

  if (connectionPromise) {
    return connectionPromise
  }

  if (!env.redisUrl) {
    throw new Error('REDIS_URL environment variable is not set')
  }

  connectionPromise = (async () => {
    const client = createClient({
      url: env.redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            return new Error('Redis connection failed after 3 retries')
          }
          return Math.min(retries * 100, 1000)
        },
      },
    })

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
    })

    client.on('connect', () => {
      console.log('[Redis] Connected')
    })

    client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...')
    })

    await client.connect()
    redisClient = client as RedisClientType
    connectionPromise = null
    return redisClient
  })()

  return connectionPromise
}

/**
 * Check Redis connection health
 * @returns Connection status and latency
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean
  latencyMs?: number
  error?: string
}> {
  if (!env.redisUrl) {
    return { connected: false, error: 'REDIS_URL not configured' }
  }

  try {
    const client = await getRedis()
    const start = performance.now()
    await client.ping()
    const latencyMs = Math.round(performance.now() - start)
    return { connected: true, latencyMs }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { connected: false, error: message }
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit()
    redisClient = null
    console.log('[Redis] Connection closed')
  }
}
