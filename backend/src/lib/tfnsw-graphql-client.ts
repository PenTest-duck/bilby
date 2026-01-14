/**
 * TfNSW Frontend GraphQL API Client
 * 
 * Used for fare data enrichment since the stable REST API
 * does not return Opal fare information.
 * 
 * NOTE: This is an unofficial API used by the TfNSW website.
 * It may change without notice. Use with graceful degradation.
 */

const GRAPHQL_ENDPOINT = 'https://transportnsw.info/api/graphql'
const TIMEOUT_MS = 5000
const MAX_CONSECUTIVE_ERRORS = 5
const CIRCUIT_BREAKER_RESET_MS = 60000

// Circuit breaker state
let errorCount = 0
let lastErrorTime: number | null = null

/**
 * GraphQL query for trip options with fares
 * Minimal query to reduce response size - only fetches fare-related data
 */
const TRIP_OPTIONS_QUERY = `
query TripOptions($input: TripPlannerInput!) {
  widgets {
    tripOptions(input: $input) {
      id
      departureTime
      arrivalTime
      duration
      legs {
        duration
        mode
        fares {
          type
          amount
          stationAccessFee
        }
        transportation {
          realtimeTripId
          routeNumber
        }
        origin {
          departureTimeScheduled
        }
      }
    }
  }
}
`

/** Fare type mappings */
export const FARE_TYPES = {
  1: 'adult',
  2: 'child',
  3: 'concession',
  4: 'senior',
} as const

/** GraphQL fare response */
export interface GraphQLFare {
  type: number
  amount: number
  stationAccessFee: number
}

/** GraphQL leg response */
export interface GraphQLLeg {
  duration: number
  mode: number
  fares: GraphQLFare[] | null
  transportation: {
    realtimeTripId: string | null
    routeNumber: string | null
  } | null
  origin: {
    departureTimeScheduled: string | null
  }
}

/** GraphQL trip option response */
export interface GraphQLTripOption {
  id: string
  departureTime: string
  arrivalTime: string
  duration: number
  legs: GraphQLLeg[]
}

/** Enriched fare data for a journey */
export interface JourneyFares {
  adult: number
  child: number
  concession: number
  senior: number
  stationAccessFee: number
  source: 'graphql'
  legFares?: {
    mode: number
    routeNumber?: string
    adult: number
  }[]
}

/** GraphQL input for trip planner */
interface TripPlannerInput {
  from: string
  to: string
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  excludedModes?: number[]
  opalType?: string
  travelMode?: string
  tripMode?: string
  typeOrigin?: string
  typeDestination?: string
  filters?: {
    onlyAccessible?: boolean
    onlyOpal?: boolean
  }
  preferences?: {
    tripPreference?: string
    walkSpeed?: string
  }
}

/**
 * Check if circuit breaker should block request
 */
function isCircuitOpen(): boolean {
  if (errorCount < MAX_CONSECUTIVE_ERRORS) {
    return false
  }
  
  if (lastErrorTime && Date.now() - lastErrorTime > CIRCUIT_BREAKER_RESET_MS) {
    // Reset circuit breaker after timeout
    errorCount = 0
    lastErrorTime = null
    return false
  }
  
  return true
}

/**
 * Record successful request
 */
function recordSuccess(): void {
  errorCount = 0
  lastErrorTime = null
}

/**
 * Record failed request
 */
function recordError(): void {
  errorCount++
  lastErrorTime = Date.now()
}

/**
 * Fetch trip options with fares from GraphQL API
 * Returns null if request fails or circuit is open
 */
export async function fetchGraphQLTripOptions(
  from: string,
  to: string,
  options: {
    excludedModes?: number[]
    opalType?: 'adult' | 'child' | 'concession' | 'senior'
  } = {}
): Promise<GraphQLTripOption[] | null> {
  // Check circuit breaker
  if (isCircuitOpen()) {
    console.warn('[GraphQL] Circuit breaker open, skipping request')
    return null
  }

  const input: TripPlannerInput = {
    from,
    to,
    excludedModes: options.excludedModes ?? [11], // Exclude school buses by default
    opalType: options.opalType ?? 'adult',
    travelMode: '',
    tripMode: 'public',
    typeOrigin: '',
    typeDestination: '',
    filters: {
      onlyAccessible: false,
      onlyOpal: false,
    },
    preferences: {
      tripPreference: 'leasttime',
      walkSpeed: 'normal',
    },
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'TripOptions',
        query: TRIP_OPTIONS_QUERY,
        variables: { input },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`GraphQL error: ${response.status}`)
    }

    const data = await response.json() as {
      data?: {
        widgets?: {
          tripOptions?: GraphQLTripOption[]
        }
      }
      errors?: { message: string }[]
    }

    if (data.errors?.length) {
      throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`)
    }

    recordSuccess()
    return data.data?.widgets?.tripOptions ?? null
  } catch (error) {
    recordError()
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GraphQL] Request failed:', message)
    return null
  }
}

/**
 * Calculate total fare for a trip option by fare type
 */
function calculateFareByType(tripOption: GraphQLTripOption, fareType: number): number {
  let total = 0
  
  for (const leg of tripOption.legs) {
    if (!leg.fares) continue
    
    const fare = leg.fares.find(f => f.type === fareType)
    if (fare) {
      total += fare.amount
    }
  }
  
  return Math.round(total * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate station access fee (charged once per journey)
 */
function calculateStationAccessFee(tripOption: GraphQLTripOption): number {
  let maxFee = 0
  
  for (const leg of tripOption.legs) {
    if (!leg.fares) continue
    
    for (const fare of leg.fares) {
      if (fare.stationAccessFee > maxFee) {
        maxFee = fare.stationAccessFee
      }
    }
  }
  
  return maxFee
}

/**
 * Extract fares from a GraphQL trip option
 */
export function extractFares(tripOption: GraphQLTripOption): JourneyFares {
  const legFares = tripOption.legs
    .filter(leg => leg.fares && leg.fares.length > 0)
    .map(leg => ({
      mode: leg.mode,
      routeNumber: leg.transportation?.routeNumber ?? undefined,
      adult: leg.fares?.find(f => f.type === 1)?.amount ?? 0,
    }))

  return {
    adult: calculateFareByType(tripOption, 1),
    child: calculateFareByType(tripOption, 2),
    concession: calculateFareByType(tripOption, 3),
    senior: calculateFareByType(tripOption, 4),
    stationAccessFee: calculateStationAccessFee(tripOption),
    source: 'graphql',
    legFares: legFares.length > 0 ? legFares : undefined,
  }
}

/**
 * Match a REST API journey to a GraphQL trip option
 * Uses departure time and duration for matching
 */
export function matchJourneyToTripOption(
  journeyDepartureTime: string,
  journeyDurationSeconds: number,
  tripOptions: GraphQLTripOption[]
): GraphQLTripOption | null {
  // Parse journey departure time
  const journeyDep = new Date(journeyDepartureTime).getTime()
  const journeyDurationMinutes = Math.round(journeyDurationSeconds / 60)

  for (const option of tripOptions) {
    const optionDep = new Date(option.departureTime).getTime()
    const optionDuration = option.duration
    
    // Match if departure times are within 2 minutes and durations are similar
    const timeDiff = Math.abs(journeyDep - optionDep)
    const durationDiff = Math.abs(journeyDurationMinutes - optionDuration)
    
    if (timeDiff <= 120000 && durationDiff <= 2) { // 2 min time diff, 2 min duration diff
      return option
    }
  }

  return null
}

/**
 * Get realtime trip IDs from GraphQL response for vehicle position matching
 */
export function extractRealtimeTripIds(tripOption: GraphQLTripOption): string[] {
  return tripOption.legs
    .map(leg => leg.transportation?.realtimeTripId)
    .filter((id): id is string => id !== null && id !== undefined)
}
