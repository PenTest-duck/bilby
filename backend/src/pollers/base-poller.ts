/**
 * Base Poller Class
 * Reusable infrastructure for all TfNSW feed pollers
 */

import type { TfnswFeed, FeedMeta } from '../types/gtfs.js'
import { getFeedMeta, setFeedMeta } from '../lib/cache.js'
import { checkFeedModified } from '../lib/tfnsw-client.js'

export type FeedType = 'alerts' | 'tripupdates' | 'vehiclepos'

export interface PollerConfig {
  name: string
  feedType: FeedType
  feeds: TfnswFeed[]
  intervalMs: number
  staggerMs?: number
}

export interface PollerStatus {
  name: string
  running: boolean
  lastPoll: number | null
  lastSuccess: number | null
  lastError: string | null
  pollCount: number
  errorCount: number
}

export abstract class BasePoller {
  protected config: PollerConfig
  protected status: PollerStatus
  protected intervalId: NodeJS.Timeout | null = null
  protected isPolling = false

  constructor(config: PollerConfig) {
    this.config = config
    this.status = {
      name: config.name,
      running: false,
      lastPoll: null,
      lastSuccess: null,
      lastError: null,
      pollCount: 0,
      errorCount: 0,
    }
  }

  /**
   * Fetch and cache data for a specific feed
   * Implemented by subclasses
   */
  protected abstract fetchAndCache(feed: TfnswFeed): Promise<{ count: number; lastModified: string | null }>

  /**
   * Start the poller with staggered intervals
   */
  start(): void {
    if (this.status.running) {
      console.log(`[${this.config.name}] Already running`)
      return
    }

    this.status.running = true
    const intervalSec = Math.round(this.config.intervalMs / 1000)
    console.log(`[${this.config.name}] 🚀 Starting poller - interval: ${intervalSec}s, feeds: [${this.config.feeds.join(', ')}]`)

    // Initial poll
    this.pollAll()

    // Set up interval
    this.intervalId = setInterval(() => {
      this.pollAll()
    }, this.config.intervalMs)
  }

  /**
   * Stop the poller
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.status.running = false
    console.log(`[${this.config.name}] Stopped`)
  }

  /**
   * Poll all configured feeds with staggering
   */
  async pollAll(): Promise<void> {
    if (this.isPolling) {
      console.log(`[${this.config.name}] ⏭️ Skipping poll - previous still running`)
      return
    }

    this.isPolling = true
    this.status.lastPoll = Date.now()
    this.status.pollCount++
    
    const timestamp = new Date().toISOString().substring(11, 19)
    console.log(`[${this.config.name}] 🔄 Poll #${this.status.pollCount} started at ${timestamp}`)

    const stagger = this.config.staggerMs ?? 500
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < this.config.feeds.length; i++) {
      const feed = this.config.feeds[i]
      
      // Stagger requests
      if (i > 0 && stagger > 0) {
        await new Promise(resolve => setTimeout(resolve, stagger))
      }

      try {
        await this.pollFeed(feed)
        successCount++
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[${this.config.name}] ❌ Error polling ${feed}:`, message)
        this.status.lastError = message
        this.status.errorCount++
        errorCount++
      }
    }

    this.isPolling = false
    console.log(`[${this.config.name}] ✅ Poll #${this.status.pollCount} complete - success: ${successCount}, errors: ${errorCount}`)
  }

  /**
   * Poll a single feed with HEAD optimization
   */
  protected async pollFeed(feed: TfnswFeed): Promise<void> {
    // Get last known metadata
    const meta = await getFeedMeta(this.config.feedType, feed)
    
    // Check if feed has been modified
    const checkResult = await checkFeedModified(
      this.config.feedType,
      feed,
      meta?.lastModified
    )

    if (!checkResult.modified && meta) {
      console.log(`[${this.config.name}] 📦 ${feed}: not modified (cached ${meta.count} items)`)
      return
    }

    // Fetch and cache new data
    const startTime = Date.now()
    const result = await this.fetchAndCache(feed)
    const duration = Date.now() - startTime

    // Update metadata
    const newMeta: FeedMeta = {
      lastModified: result.lastModified || undefined,
      fetchedAt: Date.now(),
      count: result.count,
      feed,
      feedType: this.config.feedType,
    }
    await setFeedMeta(this.config.feedType, feed, newMeta)

    this.status.lastSuccess = Date.now()
    console.log(`[${this.config.name}] 📥 ${feed}: fetched ${result.count} items in ${duration}ms`)
  }

  /**
   * Manually trigger a poll (for testing/monitoring)
   */
  async trigger(): Promise<void> {
    await this.pollAll()
  }

  /**
   * Get current poller status
   */
  getStatus(): PollerStatus {
    return { ...this.status }
  }
}
