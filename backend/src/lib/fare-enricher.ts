/**
 * Fare Enricher
 * 
 * Enriches REST API journey responses with fare data from GraphQL API.
 * Uses graceful degradation - if GraphQL fails, journeys are returned without fares.
 */

import {
  fetchGraphQLTripOptions,
  extractFares,
  matchJourneyToTripOption,
  extractRealtimeTripIds,
  type JourneyFares,
  type GraphQLTripOption,
} from './tfnsw-graphql-client.js'
import type { Journey, Leg } from '../types/trip-planner.js'

/** Journey enriched with fare data */
export interface JourneyWithFares {
  // Core journey fields
  isAdditional?: boolean
  interchanges?: number
  legs: Journey['legs']
  fare?: Journey['fare']  // Original fare from REST API (optional)
  // Enriched data from GraphQL
  enrichedFare: JourneyFares | null
  realtimeTripIds?: string[]
}

/** Calculate total journey duration in seconds */
function getJourneyDuration(journey: Journey): number {
  return journey.legs.reduce((total, leg) => total + (leg.duration ?? 0), 0)
}

/** Get journey departure time from first leg */
function getJourneyDepartureTime(journey: Journey): string | null {
  const firstLeg = journey.legs[0]
  return firstLeg?.origin?.departureTimePlanned ?? 
         firstLeg?.origin?.departureTimeEstimated ?? 
         null
}

/** Extract travel in cars info from journey legs */
export function extractTravelInCars(journey: Journey): {
  legIndex: number
  message: string
  numberOfCars: number
  from: number
  to: number
}[] {
  const travelInCars: {
    legIndex: number
    message: string
    numberOfCars: number
    from: number
    to: number
  }[] = []

  journey.legs.forEach((leg, index) => {
    const props = leg.origin?.properties
    if (props?.TravelInCarsMessage && props.TravelInCarsMessage !== 'any') {
      travelInCars.push({
        legIndex: index,
        message: props.TravelInCarsMessage,
        numberOfCars: parseInt(props.NumberOfCars ?? '0', 10),
        from: parseInt(props.TravelInCarsFrom ?? '0', 10),
        to: parseInt(props.TravelInCarsTo ?? '0', 10),
      })
    }
  })

  return travelInCars
}

/** Extract occupancy data from journey legs */
export function extractOccupancy(journey: Journey): {
  legIndex: number
  origin: string | null
  destination: string | null
}[] {
  return journey.legs.map((leg, index) => ({
    legIndex: index,
    origin: (leg.origin?.properties?.occupancy as string) ?? null,
    destination: (leg.destination?.properties?.occupancy as string) ?? null,
  })).filter(o => o.origin || o.destination)
}

/**
 * Enrich a single journey with fare data from GraphQL
 */
function enrichJourneyWithFares(
  journey: Journey,
  tripOptions: GraphQLTripOption[]
): JourneyWithFares {
  const departureTime = getJourneyDepartureTime(journey)
  const duration = getJourneyDuration(journey)

  if (!departureTime) {
    return { ...journey, enrichedFare: null }
  }

  const matchedOption = matchJourneyToTripOption(departureTime, duration, tripOptions)

  if (!matchedOption) {
    return { ...journey, enrichedFare: null }
  }

  const enrichedFare = extractFares(matchedOption)
  const realtimeTripIds = extractRealtimeTripIds(matchedOption)

  return {
    ...journey,
    enrichedFare,
    realtimeTripIds: realtimeTripIds.length > 0 ? realtimeTripIds : undefined,
  }
}

/**
 * Enrich multiple journeys with fare data
 * Fetches GraphQL data once and matches to all journeys
 */
export async function enrichJourneysWithFares(
  journeys: Journey[],
  from: string,
  to: string,
  options: {
    excludedModes?: number[]
    opalType?: 'adult' | 'child' | 'concession' | 'senior'
  } = {}
): Promise<JourneyWithFares[]> {
  // Fetch GraphQL trip options
  const tripOptions = await fetchGraphQLTripOptions(from, to, options)

  if (!tripOptions || tripOptions.length === 0) {
    // Return journeys without fares if GraphQL fails
    return journeys.map(j => ({ ...j, enrichedFare: null }))
  }

  // Enrich each journey
  return journeys.map(journey => enrichJourneyWithFares(journey, tripOptions))
}

/**
 * Check if fare enrichment is enabled
 */
export function isFareEnrichmentEnabled(): boolean {
  return process.env.ENABLE_GRAPHQL_FARES !== 'false'
}
