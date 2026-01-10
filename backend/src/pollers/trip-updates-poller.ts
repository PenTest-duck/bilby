/**
 * Trip Updates Poller
 * Fetches realtime trip updates from TfNSW and caches in Redis
 */

import { BasePoller } from './base-poller.js'
import { fetchTripUpdates } from '../lib/tfnsw-client.js'
import { setTripUpdates } from '../lib/cache.js'
import type { TfnswFeed } from '../types/gtfs.js'

export class TripUpdatesPoller extends BasePoller {
  constructor() {
    super({
      name: 'TripUpdatesPoller',
      feedType: 'tripupdates',
      feeds: ['sydneytrains', 'metro', 'lightrail'],
      intervalMs: 15_000, // 15 seconds
      staggerMs: 2_000, // 2 second stagger between feeds
    })
  }

  protected async fetchAndCache(feed: TfnswFeed): Promise<{ count: number; lastModified: string | null }> {
    const result = await fetchTripUpdates(feed)
    await setTripUpdates(feed, result.data)
    
    return {
      count: result.data.length,
      lastModified: result.lastModified,
    }
  }
}

/** Singleton instance */
let instance: TripUpdatesPoller | null = null

export function getTripUpdatesPoller(): TripUpdatesPoller {
  if (!instance) {
    instance = new TripUpdatesPoller()
  }
  return instance
}
