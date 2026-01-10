/**
 * Domain models for TfNSW Trip Planner API responses
 */

import { z } from 'zod'

/** Transport mode codes from TfNSW */
export const TfnswModeCodeSchema = z.enum([
  '1',  // Train
  '2',  // Metro
  '4',  // Light Rail
  '5',  // Bus
  '7',  // Coach
  '9',  // Ferry
  '11', // School Bus
  '99', // Walking
  '100', // Walking (alt)
  '107', // Cycling
])
export type TfnswModeCode = z.infer<typeof TfnswModeCodeSchema>

/** Map TfNSW mode codes to readable names */
export const modeCodeToName: Record<string, string> = {
  '1': 'train',
  '2': 'metro',
  '4': 'light_rail',
  '5': 'bus',
  '7': 'coach',
  '9': 'ferry',
  '11': 'school_bus',
  '99': 'walk',
  '100': 'walk',
  '107': 'cycle',
}

/** Location types from stop_finder */
export const LocationTypeSchema = z.enum([
  'poi',
  'singlehouse',
  'stop',
  'platform',
  'street',
  'locality',
  'suburb',
  'unknown',
])
export type LocationType = z.infer<typeof LocationTypeSchema>

/** Coordinate pair [lat, lng] */
export const CoordSchema = z.tuple([z.number(), z.number()])
export type Coord = z.infer<typeof CoordSchema>

/** Parent location reference */
export const ParentLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: LocationTypeSchema.optional(),
})
export type ParentLocation = z.infer<typeof ParentLocationSchema>

/** Stop/location from stop_finder or trip */
export const StopSchema = z.object({
  id: z.string(),
  name: z.string(),
  disassembledName: z.string().optional(),
  type: LocationTypeSchema,
  coord: CoordSchema.optional(),
  modes: z.array(z.number()).optional(),
  parent: ParentLocationSchema.optional(),
  matchQuality: z.number().optional(),
  isBest: z.boolean().optional(),
  properties: z.record(z.unknown()).optional(),
})
export type Stop = z.infer<typeof StopSchema>

/** Stop search result with additional metadata */
export const StopSearchResultSchema = StopSchema.extend({
  matchQuality: z.number(),
  isBest: z.boolean(),
})
export type StopSearchResult = z.infer<typeof StopSearchResultSchema>

/** Route product info */
export const RouteProductSchema = z.object({
  class: z.number().optional(),
  name: z.string().optional(),
  iconId: z.number().optional(),
})
export type RouteProduct = z.infer<typeof RouteProductSchema>

/** Transportation/route info */
export const TransportationSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  disassembledName: z.string().optional(),
  number: z.string().optional(),
  iconId: z.number().optional(),
  description: z.string().optional(),
  product: RouteProductSchema.optional(),
  destination: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: LocationTypeSchema.optional(),
  }).optional(),
})
export type Transportation = z.infer<typeof TransportationSchema>

/** Stop in a journey leg sequence */
export const StopSequenceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  disassembledName: z.string().optional(),
  type: LocationTypeSchema.optional(),
  coord: CoordSchema.optional(),
  arrivalTimePlanned: z.string().optional(),
  arrivalTimeEstimated: z.string().optional(),
  departureTimePlanned: z.string().optional(),
  departureTimeEstimated: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
})
export type StopSequenceItem = z.infer<typeof StopSequenceItemSchema>

/** Journey leg origin/destination */
export const LegLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  disassembledName: z.string().optional(),
  type: LocationTypeSchema.optional(),
  coord: CoordSchema.optional(),
  parent: ParentLocationSchema.optional(),
  departureTimePlanned: z.string().optional(),
  departureTimeEstimated: z.string().optional(),
  arrivalTimePlanned: z.string().optional(),
  arrivalTimeEstimated: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
})
export type LegLocation = z.infer<typeof LegLocationSchema>

/** Service alert in trip response */
export const TripAlertSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  priority: z.enum(['veryLow', 'low', 'normal', 'high', 'veryHigh']).optional(),
  url: z.string().optional(),
})
export type TripAlert = z.infer<typeof TripAlertSchema>

/** Journey leg (one segment of a trip) */
export const LegSchema = z.object({
  duration: z.number().optional(),
  distance: z.number().optional(),
  origin: LegLocationSchema,
  destination: LegLocationSchema,
  transportation: TransportationSchema.optional(),
  stopSequence: z.array(StopSequenceItemSchema).optional(),
  coords: z.array(CoordSchema).optional(),
  properties: z.record(z.unknown()).optional(),
  infos: z.array(TripAlertSchema).optional(),
  isRealtimeControlled: z.boolean().optional(),
})
export type Leg = z.infer<typeof LegSchema>

/** Fare ticket info */
export const FareTicketSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  person: z.string().optional(),
  priceBrutto: z.number().optional(),
  priceNetto: z.number().optional(),
  fromLeg: z.number().optional(),
  toLeg: z.number().optional(),
  properties: z.record(z.unknown()).optional(),
})
export type FareTicket = z.infer<typeof FareTicketSchema>

/** Fare information */
export const FareSchema = z.object({
  tickets: z.array(FareTicketSchema).optional(),
  zones: z.array(z.unknown()).optional(),
})
export type Fare = z.infer<typeof FareSchema>

/** Complete journey from trip planner */
export const JourneySchema = z.object({
  isAdditional: z.boolean().optional(),
  interchanges: z.number().optional(),
  legs: z.array(LegSchema),
  fare: FareSchema.optional(),
})
export type Journey = z.infer<typeof JourneySchema>

/** Departure/stop event from departure_mon */
export const DepartureSchema = z.object({
  location: StopSchema.optional(),
  departureTimePlanned: z.string().optional(),
  departureTimeEstimated: z.string().optional(),
  arrivalTimePlanned: z.string().optional(),
  arrivalTimeEstimated: z.string().optional(),
  transportation: TransportationSchema.optional(),
  infos: z.array(TripAlertSchema).optional(),
  properties: z.record(z.unknown()).optional(),
  isRealtimeControlled: z.boolean().optional(),
})
export type Departure = z.infer<typeof DepartureSchema>

/** Service alert from add_info */
export const ServiceAlertSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  url: z.string().optional(),
  priority: z.enum(['veryLow', 'low', 'normal', 'high', 'veryHigh']).optional(),
  timestamps: z.object({
    creation: z.string().optional(),
    lastModification: z.string().optional(),
    validity: z.array(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    })).optional(),
  }).optional(),
  affected: z.object({
    lines: z.array(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      number: z.string().optional(),
      product: RouteProductSchema.optional(),
    })).optional(),
    stops: z.array(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      type: LocationTypeSchema.optional(),
    })).optional(),
  }).optional(),
})
export type ServiceAlert = z.infer<typeof ServiceAlertSchema>

/** Ranking strategy options */
export const RankingStrategySchema = z.enum([
  'best',
  'fastest',
  'least_walking',
  'fewest_transfers',
])
export type RankingStrategy = z.infer<typeof RankingStrategySchema>

/** Ranking score breakdown */
export const RankingScoreSchema = z.object({
  total: z.number(),
  factors: z.object({
    arrivalTime: z.object({ value: z.number(), weight: z.number(), score: z.number() }),
    duration: z.object({ value: z.number(), weight: z.number(), score: z.number() }),
    walking: z.object({ value: z.number(), weight: z.number(), score: z.number() }),
    transfers: z.object({ value: z.number(), weight: z.number(), score: z.number() }),
    reliability: z.object({ value: z.number(), weight: z.number(), score: z.number() }),
  }),
  why: z.string(),
})
export type RankingScore = z.infer<typeof RankingScoreSchema>

/** Journey with ranking metadata */
export const RankedJourneySchema = JourneySchema.extend({
  ranking: RankingScoreSchema,
  realtimeDelayMinutes: z.number().optional(),
  hasCancellations: z.boolean().optional(),
})
export type RankedJourney = z.infer<typeof RankedJourneySchema>

/** Trip query parameters */
export const TripQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
  when: z.string(),
  arriveBy: z.boolean().optional(),
  strategy: RankingStrategySchema.optional(),
  modes: z.array(z.string()).optional(),
  accessible: z.boolean().optional(),
})
export type TripQuery = z.infer<typeof TripQuerySchema>

/** Realtime data status */
export const RealtimeStatusSchema = z.enum(['fresh', 'stale', 'unavailable'])
export type RealtimeStatus = z.infer<typeof RealtimeStatusSchema>
