/**
 * Vehicle Positions Poller
 * Fetches realtime vehicle positions from TfNSW and caches in Redis
 */

import { BasePoller } from './base-poller.js'
import { fetchVehiclePositions } from '../lib/tfnsw-client.js'
import { setVehiclePositions } from '../lib/cache.js'
import type { TfnswFeed } from '../types/gtfs.js'

export class VehiclePositionsPoller extends BasePoller {
  constructor() {
    super({
      name: 'VehiclePositionsPoller',
      feedType: 'vehiclepos',
      feeds: ['sydneytrains', 'metro', 'lightrail'],
      intervalMs: 10_000, // 10 seconds
      staggerMs: 1_500, // 1.5 second stagger between feeds
    })
  }

  protected async fetchAndCache(feed: TfnswFeed): Promise<{ count: number; lastModified: string | null }> {
    const result = await fetchVehiclePositions(feed)
    await setVehiclePositions(feed, result.data)
    
    return {
      count: result.data.length,
      lastModified: result.lastModified,
    }
  }
}

/** Singleton instance */
let instance: VehiclePositionsPoller | null = null

export function getVehiclePositionsPoller(): VehiclePositionsPoller {
  if (!instance) {
    instance = new VehiclePositionsPoller()
  }
  return instance
}
