/**
 * Redis cache utilities with namespacing and TTL management
 */

import { getRedis } from './redis.js'
import type { Alert, TripUpdate, VehiclePosition, FeedMeta, TfnswFeed } from '../types/gtfs.js'

/** Cache key prefixes */
const CACHE_PREFIX = 'bilby'

/** Feed types for cache keys */
type FeedType = 'alerts' | 'tripupdates' | 'vehiclepos'

/** TTL values in seconds */
export const CACHE_TTL = {
  alerts: 60,
  tripupdates: 30,
  vehiclepos: 15,
  meta: 120,
} as const

/** Build cache key for feed data */
function buildDataKey(feedType: FeedType, feed: TfnswFeed): string {
  return `${CACHE_PREFIX}:${feedType}:${feed}`
}

/** Build cache key for feed metadata */
function buildMetaKey(feedType: FeedType, feed: TfnswFeed): string {
  return `${CACHE_PREFIX}:meta:${feedType}:${feed}`
}

/**
 * Store alerts in Redis
 */
export async function setAlerts(feed: TfnswFeed, alerts: Alert[]): Promise<void> {
  const redis = await getRedis()
  const key = buildDataKey('alerts', feed)
  await redis.setEx(key, CACHE_TTL.alerts, JSON.stringify(alerts))
}

/**
 * Retrieve alerts from Redis
 */
export async function getAlerts(feed: TfnswFeed): Promise<Alert[] | null> {
  const redis = await getRedis()
  const key = buildDataKey('alerts', feed)
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

/**
 * Store trip updates in Redis
 */
export async function setTripUpdates(feed: TfnswFeed, updates: TripUpdate[]): Promise<void> {
  const redis = await getRedis()
  const key = buildDataKey('tripupdates', feed)
  await redis.setEx(key, CACHE_TTL.tripupdates, JSON.stringify(updates))
}

/**
 * Retrieve trip updates from Redis
 */
export async function getTripUpdates(feed: TfnswFeed): Promise<TripUpdate[] | null> {
  const redis = await getRedis()
  const key = buildDataKey('tripupdates', feed)
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

/**
 * Store vehicle positions in Redis
 */
export async function setVehiclePositions(feed: TfnswFeed, positions: VehiclePosition[]): Promise<void> {
  const redis = await getRedis()
  const key = buildDataKey('vehiclepos', feed)
  await redis.setEx(key, CACHE_TTL.vehiclepos, JSON.stringify(positions))
}

/**
 * Retrieve vehicle positions from Redis
 */
export async function getVehiclePositions(feed: TfnswFeed): Promise<VehiclePosition[] | null> {
  const redis = await getRedis()
  const key = buildDataKey('vehiclepos', feed)
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

/**
 * Store feed metadata in Redis
 */
export async function setFeedMeta(feedType: FeedType, feed: TfnswFeed, meta: FeedMeta): Promise<void> {
  const redis = await getRedis()
  const key = buildMetaKey(feedType, feed)
  await redis.setEx(key, CACHE_TTL.meta, JSON.stringify(meta))
}

/**
 * Retrieve feed metadata from Redis
 */
export async function getFeedMeta(feedType: FeedType, feed: TfnswFeed): Promise<FeedMeta | null> {
  const redis = await getRedis()
  const key = buildMetaKey(feedType, feed)
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

/**
 * Get all cached data for a specific feed type across all modes
 */
export async function getAllFeedData<T>(feedType: FeedType): Promise<Map<TfnswFeed, T[]>> {
  const redis = await getRedis()
  const pattern = `${CACHE_PREFIX}:${feedType}:*`
  const keys = await redis.keys(pattern)
  
  const result = new Map<TfnswFeed, T[]>()
  
  for (const key of keys) {
    const feed = key.split(':').pop() as TfnswFeed
    const data = await redis.get(key)
    if (data) {
      result.set(feed, JSON.parse(data))
    }
  }
  
  return result
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  alerts: { feed: string; count: number; age: number | null }[]
  tripupdates: { feed: string; count: number; age: number | null }[]
  vehiclepos: { feed: string; count: number; age: number | null }[]
}> {
  const redis = await getRedis()
  const now = Date.now()
  
  const stats = {
    alerts: [] as { feed: string; count: number; age: number | null }[],
    tripupdates: [] as { feed: string; count: number; age: number | null }[],
    vehiclepos: [] as { feed: string; count: number; age: number | null }[],
  }
  
  for (const feedType of ['alerts', 'tripupdates', 'vehiclepos'] as const) {
    const pattern = `${CACHE_PREFIX}:${feedType}:*`
    const keys = await redis.keys(pattern)
    
    for (const key of keys) {
      const feed = key.split(':').pop() as string
      const data = await redis.get(key)
      const metaKey = buildMetaKey(feedType, feed as TfnswFeed)
      const meta = await redis.get(metaKey)
      
      let age: number | null = null
      if (meta) {
        const parsedMeta = JSON.parse(meta) as FeedMeta
        age = Math.round((now - parsedMeta.fetchedAt) / 1000)
      }
      
      stats[feedType].push({
        feed,
        count: data ? JSON.parse(data).length : 0,
        age,
      })
    }
  }
  
  return stats
}

/**
 * Clear all cached data (for testing)
 */
export async function clearAllCache(): Promise<void> {
  const redis = await getRedis()
  const pattern = `${CACHE_PREFIX}:*`
  const keys = await redis.keys(pattern)
  
  if (keys.length > 0) {
    await redis.del(keys)
  }
}
