/**
 * Alerts Poller
 * Fetches service alerts from TfNSW and caches in Redis
 */

import { BasePoller } from './base-poller.js'
import { fetchAlerts } from '../lib/tfnsw-client.js'
import { setAlerts } from '../lib/cache.js'
import type { TfnswFeed } from '../types/gtfs.js'

export class AlertsPoller extends BasePoller {
  constructor() {
    super({
      name: 'AlertsPoller',
      feedType: 'alerts',
      feeds: ['all'], // Fetch consolidated alerts
      intervalMs: 30_000, // 30 seconds
      staggerMs: 0, // No stagger for single feed
    })
  }

  protected async fetchAndCache(feed: TfnswFeed): Promise<{ count: number; lastModified: string | null }> {
    const result = await fetchAlerts(feed)
    await setAlerts(feed, result.data)
    
    return {
      count: result.data.length,
      lastModified: result.lastModified,
    }
  }
}

/** Singleton instance */
let instance: AlertsPoller | null = null

export function getAlertsPoller(): AlertsPoller {
  if (!instance) {
    instance = new AlertsPoller()
  }
  return instance
}
