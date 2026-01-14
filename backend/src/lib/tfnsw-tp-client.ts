/**
 * TfNSW Trip Planner API Client
 * Wraps Stop Finder, Trip Planner, Departure, and Service Alert APIs
 */

import { env } from './env.js'
import type {
  Stop,
  StopSearchResult,
  Journey,
  Departure,
  ServiceAlert,
  Transportation,
} from '../types/trip-planner.js'

const TFNSW_TP_BASE_URL = 'https://api.transport.nsw.gov.au/v1/tp'

/** Common request parameters */
const COMMON_PARAMS = {
  outputFormat: 'rapidJSON',
  coordOutputFormat: 'EPSG:4326',
}

/** Get authorization headers */
function getHeaders(): Record<string, string> {
  if (!env.tfnswApiKey) {
    throw new Error('TFNSW_API_KEY environment variable is not set')
  }
  return {
    'Authorization': `apikey ${env.tfnswApiKey}`,
    'Accept': 'application/json',
  }
}

/** Build URL with query parameters */
function buildUrl(endpoint: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(`${TFNSW_TP_BASE_URL}${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value))
  }
  return url.toString()
}

/** Fetch with timeout and error handling */
async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`TfNSW API error: ${response.status} ${response.statusText}`)
    }

    return response
  } finally {
    clearTimeout(timeout)
  }
}

/** Options for stop search */
export interface StopSearchOptions {
  limit?: number
  types?: ('stop' | 'platform' | 'poi' | 'address')[]
}

/**
 * Search for stops, addresses, or places of interest
 */
export async function searchStops(
  query: string,
  options: StopSearchOptions = {}
): Promise<StopSearchResult[]> {
  const params: Record<string, string | number> = {
    ...COMMON_PARAMS,
    name_sf: query,
    type_sf: 'any',
    TfNSWSF: 'true',
    odvSugMacro: '1',
    anyMaxSizeHitList: options.limit ?? 10,
  }

  const url = buildUrl('/stop_finder', params)
  const response = await fetchWithTimeout(url)
  const data = await response.json() as { locations?: unknown[] }

  if (!data.locations) {
    return []
  }

  return (data.locations as StopSearchResult[]).map(loc => ({
    id: loc.id,
    name: loc.name,
    disassembledName: loc.disassembledName,
    type: loc.type,
    coord: loc.coord,
    modes: loc.modes,
    parent: loc.parent,
    matchQuality: loc.matchQuality ?? 0,
    isBest: loc.isBest ?? false,
    properties: loc.properties,
  }))
}

/**
 * Get stop details by ID
 */
export async function getStopById(stopId: string): Promise<Stop | null> {
  const params: Record<string, string | number> = {
    ...COMMON_PARAMS,
    name_sf: stopId,
    type_sf: 'stop',
    TfNSWSF: 'true',
  }

  const url = buildUrl('/stop_finder', params)
  const response = await fetchWithTimeout(url)
  const data = await response.json() as { locations?: Stop[] }

  if (!data.locations?.length) {
    return null
  }

  return data.locations[0]
}

/**
 * Find stops near a coordinate
 */
export async function findNearbyStops(
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Promise<Stop[]> {
  const params: Record<string, string | number> = {
    ...COMMON_PARAMS,
    coord: `${lng}:${lat}:EPSG:4326`,
    inclFilter: '1',
    type_1: 'BUS_POINT',
    radius_1: radiusMeters,
  }

  const url = buildUrl('/coord', params)
  const response = await fetchWithTimeout(url)
  const data = await response.json() as { locations?: Stop[] }

  return data.locations ?? []
}

/** Options for departure queries */
export interface DepartureOptions {
  limit?: number
  modes?: number[]
  platformId?: string
}

/**
 * Get departures from a stop
 */
export async function getDepartures(
  stopId: string,
  when: Date = new Date(),
  options: DepartureOptions = {}
): Promise<Departure[]> {
  const params: Record<string, string | number> = {
    ...COMMON_PARAMS,
    name_dm: options.platformId ?? stopId,
    type_dm: 'stop',
    mode: 'direct',
    TfNSWDM: 'true',
    depArrMacro: 'dep',
    itdDate: formatDate(when),
    itdTime: formatTime(when),
  }

  if (options.platformId) {
    params.nameKey_dm = '$USEPOINT$'
  }

  if (options.limit) {
    params.limit = options.limit
  }

  const url = buildUrl('/departure_mon', params)
  const response = await fetchWithTimeout(url)
  const data = await response.json() as { stopEvents?: Departure[] }

  return data.stopEvents ?? []
}

/** Options for trip planning */
export interface TripOptions {
  arriveBy?: boolean
  includedModes?: number[]    // Only include these modes (if set)
  excludedModes?: number[]    // Exclude these modes
  accessible?: boolean
  maxWalkingMinutes?: number
}

/**
 * Plan a trip between two locations
 */
export async function planTrip(
  originId: string,
  destinationId: string,
  when: Date = new Date(),
  options: TripOptions = {}
): Promise<Journey[]> {
  const params: Record<string, string | number | boolean> = {
    ...COMMON_PARAMS,
    type_origin: 'any',
    name_origin: originId,
    type_destination: 'any',
    name_destination: destinationId,
    TfNSWTR: 'true',
    depArrMacro: options.arriveBy ? 'arr' : 'dep',
    itdDate: formatDate(when),
    itdTime: formatTime(when),
    calcNumberOfTrips: 6,
  }

  if (options.accessible) {
    params.wheelchair = 'on'
  }

  // Apply mode exclusion
  applyModeFilters(params, options)

  const url = buildUrl('/trip', params)
  const response = await fetchWithTimeout(url, 15000) // longer timeout for trip planning
  const data = await response.json() as { journeys?: Journey[] }

  return data.journeys ?? []
}

/**
 * Apply mode inclusion/exclusion filters to params
 */
function applyModeFilters(
  params: Record<string, string | number | boolean>,
  options: TripOptions
): void {
  // Mode exclusion takes precedence
  if (options.excludedModes?.length) {
    params.excludedMeans = 'checkbox'
    for (const mode of options.excludedModes) {
      params[`exclMOT_${mode}`] = '1'
    }
  }
  
  // Mode inclusion (only these modes)
  if (options.includedModes?.length) {
    params.inclMOT = 'checkbox'
    for (const mode of options.includedModes) {
      params[`inclMOT_${mode}`] = '1'
    }
  }
}

/**
 * Plan a trip using coordinates for origin/destination
 */
export async function planTripFromCoords(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  when: Date = new Date(),
  options: TripOptions = {}
): Promise<Journey[]> {
  const params: Record<string, string | number | boolean> = {
    ...COMMON_PARAMS,
    type_origin: 'coord',
    name_origin: `${originLng}:${originLat}:EPSG:4326`,
    type_destination: 'coord',
    name_destination: `${destinationLng}:${destinationLat}:EPSG:4326`,
    TfNSWTR: 'true',
    depArrMacro: options.arriveBy ? 'arr' : 'dep',
    itdDate: formatDate(when),
    itdTime: formatTime(when),
    calcNumberOfTrips: 6,
  }

  if (options.accessible) {
    params.wheelchair = 'on'
  }

  // Apply mode exclusion
  applyModeFilters(params, options)

  const url = buildUrl('/trip', params)
  const response = await fetchWithTimeout(url, 15000)
  const data = await response.json() as { journeys?: Journey[] }

  return data.journeys ?? []
}

/**
 * Plan a trip with mixed origin/destination types (coord or stop ID)
 * Per TfNSW API: coordinates must be in format LONGITUDE:LATITUDE:EPSG:4326
 */
export async function planTripMixed(
  origin: { type: 'coord' | 'stop'; value: string; lat?: number; lng?: number },
  destination: { type: 'coord' | 'stop'; value: string; lat?: number; lng?: number },
  when: Date = new Date(),
  options: TripOptions = {}
): Promise<Journey[]> {
  const params: Record<string, string | number | boolean> = {
    ...COMMON_PARAMS,
    TfNSWTR: 'true',
    depArrMacro: options.arriveBy ? 'arr' : 'dep',
    itdDate: formatDate(when),
    itdTime: formatTime(when),
    calcNumberOfTrips: 6,
  }

  // Set origin based on type
  if (origin.type === 'coord' && origin.lat !== undefined && origin.lng !== undefined) {
    params.type_origin = 'coord'
    params.name_origin = `${origin.lng}:${origin.lat}:EPSG:4326`
  } else {
    params.type_origin = 'any'
    params.name_origin = origin.value
  }

  // Set destination based on type
  if (destination.type === 'coord' && destination.lat !== undefined && destination.lng !== undefined) {
    params.type_destination = 'coord'
    params.name_destination = `${destination.lng}:${destination.lat}:EPSG:4326`
  } else {
    params.type_destination = 'any'
    params.name_destination = destination.value
  }

  if (options.accessible) {
    params.wheelchair = 'on'
  }

  // Apply mode exclusion
  applyModeFilters(params, options)

  const url = buildUrl('/trip', params)
  const response = await fetchWithTimeout(url, 15000)
  const data = await response.json() as { journeys?: Journey[] }

  return data.journeys ?? []
}

/** Options for service alerts */
export interface AlertOptions {
  modes?: number[]
  stopId?: string
  lineId?: string
  currentOnly?: boolean
}

/**
 * Get service alerts
 */
export async function getServiceAlerts(
  options: AlertOptions = {}
): Promise<ServiceAlert[]> {
  const now = new Date()
  const params: Record<string, string | number> = {
    ...COMMON_PARAMS,
    filterDateValid: `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`,
  }

  if (options.currentOnly !== false) {
    params.filterPublicationStatus = 'current'
  }

  if (options.stopId) {
    params.itdLPxx_selStop = options.stopId
  }

  if (options.lineId) {
    params.itdLPxx_selLine = options.lineId
  }

  // Add mode filters
  const url = new URL(`${TFNSW_TP_BASE_URL}/add_info`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value))
  }
  
  if (options.modes?.length) {
    for (const mode of options.modes) {
      url.searchParams.append('filterMOTType', String(mode))
    }
  }

  const response = await fetchWithTimeout(url.toString())
  const data = await response.json() as { infos?: { current?: ServiceAlert[] } }

  return data.infos?.current ?? []
}

/** Format date as YYYYMMDD */
function formatDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

/** Format time as HHmm */
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
}

/** Get mode code from string */
export function getModeCode(mode: string): number | null {
  const modeMap: Record<string, number> = {
    train: 1,
    metro: 2,
    light_rail: 4,
    bus: 5,
    coach: 7,
    ferry: 9,
    school_bus: 11,
  }
  return modeMap[mode] ?? null
}

/** Get mode name from code */
export function getModeName(code: number): string {
  const codeMap: Record<number, string> = {
    1: 'train',
    2: 'metro',
    4: 'light_rail',
    5: 'bus',
    7: 'coach',
    9: 'ferry',
    11: 'school_bus',
    99: 'walk',
    100: 'walk',
    107: 'cycle',
  }
  return codeMap[code] ?? 'unknown'
}
