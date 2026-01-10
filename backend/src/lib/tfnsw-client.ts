/**
 * TfNSW API Client
 * HTTP client with HEAD/GET optimization and error handling
 */

import { env } from './env.js'
import { parseAlerts, parseAlertsFromJson, parseTripUpdates, parseVehiclePositions } from './gtfs-parser.js'
import type { Alert, TripUpdate, VehiclePosition, TfnswFeed } from '../types/gtfs.js'

const TFNSW_BASE_URL = 'https://api.transport.nsw.gov.au'

/** Feed type configuration */
interface FeedConfig {
  basePath: string
  endpoints: Partial<Record<TfnswFeed, string>>
  supportsJson?: boolean
}

/** API feed configurations */
const FEED_CONFIGS: Record<string, FeedConfig> = {
  alerts: {
    basePath: '/v2/gtfs/alerts',
    endpoints: {
      all: '/all',
      sydneytrains: '/sydneytrains',
      metro: '/metro',
      buses: '/buses',
      ferries: '/ferries',
      lightrail: '/lightrail',
      nswtrains: '/nswtrains',
      regionbuses: '/regionbuses',
    },
    supportsJson: true,
  },
  tripupdates: {
    basePath: '/v2/gtfs/realtime',
    endpoints: {
      sydneytrains: '/sydneytrains',
      metro: '/metro',
      lightrail: '/lightrail/innerwest',
    },
  },
  vehiclepos: {
    basePath: '/v2/gtfs/vehiclepos',
    endpoints: {
      sydneytrains: '/sydneytrains',
      metro: '/metro',
      lightrail: '/lightrail/innerwest',
    },
  },
}

/** Result of a HEAD request to check if feed has changed */
interface FeedCheckResult {
  modified: boolean
  lastModified: string | null
  etag: string | null
}

/** Result of a feed fetch */
interface FeedFetchResult<T> {
  data: T[]
  lastModified: string | null
  fetchedAt: number
}

/** Build full URL for a feed endpoint */
function buildUrl(feedType: string, feed: TfnswFeed, useJson: boolean = false): string {
  const config = FEED_CONFIGS[feedType]
  if (!config) throw new Error(`Unknown feed type: ${feedType}`)
  
  const endpoint = config.endpoints[feed]
  if (!endpoint) throw new Error(`Feed ${feed} not available for ${feedType}`)
  
  let url = `${TFNSW_BASE_URL}${config.basePath}${endpoint}`
  if (useJson && config.supportsJson) {
    url += '?format=json'
  }
  return url
}

/** Get authorization headers */
function getHeaders(): Record<string, string> {
  if (!env.tfnswApiKey) {
    throw new Error('TFNSW_API_KEY environment variable is not set')
  }
  return {
    'Authorization': `apikey ${env.tfnswApiKey}`,
    'Accept': 'application/x-google-protobuf, application/json',
  }
}

/**
 * Check if a feed has been modified since last fetch using HEAD request
 */
export async function checkFeedModified(
  feedType: 'alerts' | 'tripupdates' | 'vehiclepos',
  feed: TfnswFeed,
  lastModified?: string | null
): Promise<FeedCheckResult> {
  const url = buildUrl(feedType, feed)
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: getHeaders(),
    })

    if (!response.ok) {
      console.error(`[TfNSW] HEAD ${feedType}/${feed} failed: ${response.status}`)
      return { modified: true, lastModified: null, etag: null }
    }

    const newLastModified = response.headers.get('Last-Modified')
    const etag = response.headers.get('ETag')
    
    const modified = !lastModified || newLastModified !== lastModified
    
    return { modified, lastModified: newLastModified, etag }
  } catch (error) {
    console.error(`[TfNSW] HEAD ${feedType}/${feed} error:`, error)
    return { modified: true, lastModified: null, etag: null }
  }
}

/**
 * Fetch alerts from TfNSW API
 */
export async function fetchAlerts(feed: TfnswFeed = 'all'): Promise<FeedFetchResult<Alert>> {
  const url = buildUrl('alerts', feed, true) // Use JSON format for alerts
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`TfNSW alerts fetch failed: ${response.status} ${response.statusText}`)
  }

  const lastModified = response.headers.get('Last-Modified')
  const contentType = response.headers.get('Content-Type') || ''
  
  let alerts: Alert[]
  
  if (contentType.includes('json')) {
    const json = await response.json()
    alerts = parseAlertsFromJson(json)
  } else {
    const buffer = Buffer.from(await response.arrayBuffer())
    alerts = parseAlerts(buffer)
  }

  return {
    data: alerts,
    lastModified,
    fetchedAt: Date.now(),
  }
}

/**
 * Fetch trip updates from TfNSW API
 */
export async function fetchTripUpdates(feed: TfnswFeed): Promise<FeedFetchResult<TripUpdate>> {
  const url = buildUrl('tripupdates', feed)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`TfNSW trip updates fetch failed: ${response.status} ${response.statusText}`)
  }

  const lastModified = response.headers.get('Last-Modified')
  const buffer = Buffer.from(await response.arrayBuffer())
  const updates = parseTripUpdates(buffer)

  return {
    data: updates,
    lastModified,
    fetchedAt: Date.now(),
  }
}

/**
 * Fetch vehicle positions from TfNSW API
 */
export async function fetchVehiclePositions(feed: TfnswFeed): Promise<FeedFetchResult<VehiclePosition>> {
  const url = buildUrl('vehiclepos', feed)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`TfNSW vehicle positions fetch failed: ${response.status} ${response.statusText}`)
  }

  const lastModified = response.headers.get('Last-Modified')
  const buffer = Buffer.from(await response.arrayBuffer())
  const positions = parseVehiclePositions(buffer)

  return {
    data: positions,
    lastModified,
    fetchedAt: Date.now(),
  }
}

/**
 * Get available feeds for a feed type
 */
export function getAvailableFeeds(feedType: 'alerts' | 'tripupdates' | 'vehiclepos'): TfnswFeed[] {
  const config = FEED_CONFIGS[feedType]
  return Object.keys(config.endpoints) as TfnswFeed[]
}
