/**
 * Poller Orchestrator
 * Coordinates all pollers with staggered execution
 */

import { getAlertsPoller } from './alerts-poller.js'
import { getTripUpdatesPoller } from './trip-updates-poller.js'
import { getVehiclePositionsPoller } from './vehicle-positions-poller.js'
import type { PollerStatus } from './base-poller.js'

export interface OrchestratorStatus {
  running: boolean
  startedAt: number | null
  pollers: PollerStatus[]
}

class PollerOrchestrator {
  private running = false
  private startedAt: number | null = null

  /**
   * Start all pollers with staggered initialization
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[Orchestrator] Already running')
      return
    }

    console.log('[Orchestrator] Starting pollers...')
    this.running = true
    this.startedAt = Date.now()

    // Start pollers with staggered delays to avoid thundering herd
    const alertsPoller = getAlertsPoller()
    const tripUpdatesPoller = getTripUpdatesPoller()
    const vehiclePositionsPoller = getVehiclePositionsPoller()

    // Start alerts first
    alertsPoller.start()

    // Stagger other pollers by 3 seconds each
    await new Promise(resolve => setTimeout(resolve, 3000))
    tripUpdatesPoller.start()

    await new Promise(resolve => setTimeout(resolve, 3000))
    vehiclePositionsPoller.start()

    console.log('[Orchestrator] All pollers started')

    // Set up graceful shutdown
    this.setupShutdownHandlers()
  }

  /**
   * Stop all pollers
   */
  stop(): void {
    console.log('[Orchestrator] Stopping pollers...')
    
    getAlertsPoller().stop()
    getTripUpdatesPoller().stop()
    getVehiclePositionsPoller().stop()

    this.running = false
    console.log('[Orchestrator] All pollers stopped')
  }

  /**
   * Get status of all pollers
   */
  getStatus(): OrchestratorStatus {
    return {
      running: this.running,
      startedAt: this.startedAt,
      pollers: [
        getAlertsPoller().getStatus(),
        getTripUpdatesPoller().getStatus(),
        getVehiclePositionsPoller().getStatus(),
      ],
    }
  }

  /**
   * Manually trigger all pollers
   */
  async triggerAll(): Promise<void> {
    console.log('[Orchestrator] Triggering all pollers...')
    
    await Promise.all([
      getAlertsPoller().trigger(),
      getTripUpdatesPoller().trigger(),
      getVehiclePositionsPoller().trigger(),
    ])
    
    console.log('[Orchestrator] All pollers triggered')
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = () => {
      console.log('[Orchestrator] Shutdown signal received')
      this.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }
}

/** Singleton instance */
let instance: PollerOrchestrator | null = null

export function getOrchestrator(): PollerOrchestrator {
  if (!instance) {
    instance = new PollerOrchestrator()
  }
  return instance
}

/** Convenience exports */
export { getAlertsPoller } from './alerts-poller.js'
export { getTripUpdatesPoller } from './trip-updates-poller.js'
export { getVehiclePositionsPoller } from './vehicle-positions-poller.js'
