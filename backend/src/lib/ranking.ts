/**
 * Ranking Engine
 * Scores and ranks trip options with configurable strategies
 */

import type { Journey, Leg, RankingStrategy, RankingScore, RankedJourney } from '../types/trip-planner.js'

/** Strategy weight configurations */
const STRATEGY_WEIGHTS: Record<RankingStrategy, StrategyWeights> = {
  best: {
    arrivalTime: 0.3,
    duration: 0.25,
    walking: 0.15,
    transfers: 0.15,
    reliability: 0.15,
  },
  fastest: {
    arrivalTime: 0.5,
    duration: 0.35,
    walking: 0.05,
    transfers: 0.05,
    reliability: 0.05,
  },
  least_walking: {
    arrivalTime: 0.15,
    duration: 0.15,
    walking: 0.5,
    transfers: 0.1,
    reliability: 0.1,
  },
  fewest_transfers: {
    arrivalTime: 0.2,
    duration: 0.2,
    walking: 0.1,
    transfers: 0.4,
    reliability: 0.1,
  },
}

interface StrategyWeights {
  arrivalTime: number
  duration: number
  walking: number
  transfers: number
  reliability: number
}

/** Calculate total journey duration in minutes */
function calculateDuration(journey: Journey): number {
  let total = 0
  for (const leg of journey.legs) {
    total += leg.duration ?? 0
  }
  return Math.round(total / 60)
}

/** Calculate total walking distance in meters */
function calculateWalkingDistance(journey: Journey): number {
  let total = 0
  for (const leg of journey.legs) {
    // Walking legs have iconId 99 or 100, or product name contains 'walk'
    const isWalking = 
      leg.transportation?.iconId === 99 ||
      leg.transportation?.iconId === 100 ||
      leg.transportation?.product?.name?.toLowerCase().includes('walk') ||
      !leg.transportation?.id // No transportation = walking
    
    if (isWalking) {
      total += leg.distance ?? 0
    }
  }
  return total
}

/** Get number of transfers (interchanges) */
function getTransferCount(journey: Journey): number {
  return journey.interchanges ?? Math.max(0, journey.legs.filter(l => l.transportation?.id).length - 1)
}

/** Get arrival time as timestamp */
function getArrivalTime(journey: Journey): number {
  const lastLeg = journey.legs[journey.legs.length - 1]
  const arrivalStr = lastLeg?.destination?.arrivalTimeEstimated ?? lastLeg?.destination?.arrivalTimePlanned
  
  if (!arrivalStr) return Date.now() + 24 * 60 * 60 * 1000 // fallback to far future
  
  return new Date(arrivalStr).getTime()
}

/** Calculate reliability score (0-1, higher is better) */
function calculateReliability(journey: Journey & { realtimeDelayMinutes?: number; hasCancellations?: boolean }): number {
  // Cancelled journeys get 0 reliability
  if (journey.hasCancellations) {
    return 0
  }
  
  // Penalize delays
  const delayMinutes = journey.realtimeDelayMinutes ?? 0
  if (delayMinutes <= 0) return 1
  if (delayMinutes <= 2) return 0.95
  if (delayMinutes <= 5) return 0.85
  if (delayMinutes <= 10) return 0.7
  if (delayMinutes <= 15) return 0.5
  return 0.3
}

/** Normalize value to 0-1 scale (higher is better) */
function normalize(value: number, min: number, max: number, invert: boolean = true): number {
  if (max === min) return 1
  const normalized = (value - min) / (max - min)
  return invert ? 1 - normalized : normalized
}

/** Generate human-readable explanation */
function generateExplanation(
  journey: Journey & { realtimeDelayMinutes?: number; hasCancellations?: boolean },
  scores: RankingScore['factors'],
  strategy: RankingStrategy
): string {
  const parts: string[] = []
  
  // Check for cancellations first
  if (journey.hasCancellations) {
    return 'Service cancelled - not recommended'
  }
  
  // Duration
  const durationMins = calculateDuration(journey)
  if (durationMins < 30) {
    parts.push('Quick journey')
  } else if (durationMins < 60) {
    parts.push(`${durationMins} min trip`)
  } else {
    const hours = Math.floor(durationMins / 60)
    const mins = durationMins % 60
    parts.push(`${hours}h ${mins}m trip`)
  }
  
  // Transfers
  const transfers = getTransferCount(journey)
  if (transfers === 0) {
    parts.push('direct')
  } else if (transfers === 1) {
    parts.push('1 transfer')
  } else {
    parts.push(`${transfers} transfers`)
  }
  
  // Walking
  const walkingM = calculateWalkingDistance(journey)
  if (walkingM > 500) {
    parts.push(`${Math.round(walkingM / 100) * 100}m walk`)
  }
  
  // Delays
  const delay = journey.realtimeDelayMinutes ?? 0
  if (delay > 0) {
    parts.push(`${delay} min delayed`)
  }
  
  // Strategy-specific additions
  switch (strategy) {
    case 'fastest':
      if (scores.duration.score > 0.8) parts.unshift('Fastest option')
      break
    case 'least_walking':
      if (scores.walking.score > 0.8) parts.unshift('Least walking')
      break
    case 'fewest_transfers':
      if (scores.transfers.score > 0.8) parts.unshift('Fewest transfers')
      break
  }
  
  return parts.join(' • ')
}

/**
 * Rank journeys according to strategy
 */
export function rankJourneys(
  journeys: (Journey & { realtimeDelayMinutes?: number; hasCancellations?: boolean })[],
  strategy: RankingStrategy = 'best'
): RankedJourney[] {
  if (journeys.length === 0) return []
  
  const weights = STRATEGY_WEIGHTS[strategy]
  
  // Calculate min/max for normalization
  const durations = journeys.map(j => calculateDuration(j))
  const walkingDistances = journeys.map(j => calculateWalkingDistance(j))
  const transfers = journeys.map(j => getTransferCount(j))
  const arrivalTimes = journeys.map(j => getArrivalTime(j))
  
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const minWalking = Math.min(...walkingDistances)
  const maxWalking = Math.max(...walkingDistances)
  const minTransfers = Math.min(...transfers)
  const maxTransfers = Math.max(...transfers)
  const minArrival = Math.min(...arrivalTimes)
  const maxArrival = Math.max(...arrivalTimes)
  
  // Score each journey
  const scored = journeys.map((journey, i) => {
    const duration = durations[i]
    const walking = walkingDistances[i]
    const transfer = transfers[i]
    const arrival = arrivalTimes[i]
    const reliability = calculateReliability(journey)
    
    // Normalize scores (0-1, higher is better)
    const durationScore = normalize(duration, minDuration, maxDuration, true)
    const walkingScore = normalize(walking, minWalking, maxWalking, true)
    const transferScore = normalize(transfer, minTransfers, maxTransfers, true)
    const arrivalScore = normalize(arrival, minArrival, maxArrival, true)
    
    const factors: RankingScore['factors'] = {
      arrivalTime: { value: arrival, weight: weights.arrivalTime, score: arrivalScore },
      duration: { value: duration, weight: weights.duration, score: durationScore },
      walking: { value: walking, weight: weights.walking, score: walkingScore },
      transfers: { value: transfer, weight: weights.transfers, score: transferScore },
      reliability: { value: reliability, weight: weights.reliability, score: reliability },
    }
    
    // Calculate weighted total
    const total = 
      arrivalScore * weights.arrivalTime +
      durationScore * weights.duration +
      walkingScore * weights.walking +
      transferScore * weights.transfers +
      reliability * weights.reliability
    
    // Cancelled journeys get score of 0
    const finalScore = journey.hasCancellations ? 0 : total
    
    const ranking: RankingScore = {
      total: Math.round(finalScore * 100) / 100,
      factors,
      why: generateExplanation(journey, factors, strategy),
    }
    
    return {
      ...journey,
      ranking,
    } as RankedJourney
  })
  
  // Sort by score (descending)
  scored.sort((a, b) => b.ranking.total - a.ranking.total)
  
  return scored
}

/**
 * Get best journey and alternatives
 */
export function getBestAndAlternatives(
  journeys: (Journey & { realtimeDelayMinutes?: number; hasCancellations?: boolean })[],
  strategy: RankingStrategy = 'best'
): { best: RankedJourney | null; alternatives: RankedJourney[] } {
  const ranked = rankJourneys(journeys, strategy)
  
  if (ranked.length === 0) {
    return { best: null, alternatives: [] }
  }
  
  // Filter out cancelled journeys from being "best" unless all are cancelled
  const nonCancelled = ranked.filter(j => !j.hasCancellations)
  const best = nonCancelled.length > 0 ? nonCancelled[0] : ranked[0]
  
  // Alternatives are everything else
  const alternatives = ranked.filter(j => j !== best)
  
  return { best, alternatives }
}
