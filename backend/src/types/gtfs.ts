/**
 * Bilby Domain Models for GTFS-realtime data
 * Region-agnostic design for future extensibility
 */

import { z } from 'zod'

/** Transport modes supported by Bilby */
export const TransportModeSchema = z.enum([
  'train',
  'metro', 
  'bus',
  'ferry',
  'light_rail',
  'coach',
])
export type TransportMode = z.infer<typeof TransportModeSchema>

/** TfNSW-specific feed identifiers */
export const TfnswFeedSchema = z.enum([
  'sydneytrains',
  'metro',
  'buses',
  'ferries',
  'lightrail',
  'nswtrains',
  'regionbuses',
  'all',
])
export type TfnswFeed = z.infer<typeof TfnswFeedSchema>

/** Map TfNSW feeds to transport modes */
export const feedToMode: Record<TfnswFeed, TransportMode> = {
  sydneytrains: 'train',
  metro: 'metro',
  buses: 'bus',
  ferries: 'ferry',
  lightrail: 'light_rail',
  nswtrains: 'coach',
  regionbuses: 'bus',
  all: 'train', // fallback
}

/** Alert severity levels */
export const AlertSeveritySchema = z.enum([
  'unknown',
  'info',
  'warning',
  'severe',
])
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>

/** Alert effect types */
export const AlertEffectSchema = z.enum([
  'unknown',
  'no_service',
  'reduced_service',
  'significant_delays',
  'detour',
  'additional_service',
  'modified_service',
  'other_effect',
  'stop_moved',
  'no_effect',
  'accessibility_issue',
])
export type AlertEffect = z.infer<typeof AlertEffectSchema>

/** Alert cause types */
export const AlertCauseSchema = z.enum([
  'unknown',
  'other_cause',
  'technical_problem',
  'strike',
  'demonstration',
  'accident',
  'holiday',
  'weather',
  'maintenance',
  'construction',
  'police_activity',
  'medical_emergency',
])
export type AlertCause = z.infer<typeof AlertCauseSchema>

/** Time range for alerts */
export const TimeRangeSchema = z.object({
  start: z.number().optional(),
  end: z.number().optional(),
})
export type TimeRange = z.infer<typeof TimeRangeSchema>

/** Entity selector for alerts */
export const EntitySelectorSchema = z.object({
  agencyId: z.string().optional(),
  routeId: z.string().optional(),
  routeType: z.number().optional(),
  stopId: z.string().optional(),
  tripId: z.string().optional(),
  directionId: z.number().optional(),
})
export type EntitySelector = z.infer<typeof EntitySelectorSchema>

/** Service Alert */
export const AlertSchema = z.object({
  id: z.string(),
  headerText: z.string(),
  descriptionText: z.string().optional(),
  url: z.string().optional(),
  cause: AlertCauseSchema,
  effect: AlertEffectSchema,
  severity: AlertSeveritySchema,
  activePeriods: z.array(TimeRangeSchema),
  informedEntities: z.array(EntitySelectorSchema),
  updatedAt: z.number(),
})
export type Alert = z.infer<typeof AlertSchema>

/** Schedule relationship for trips/stops */
export const ScheduleRelationshipSchema = z.enum([
  'scheduled',
  'added',
  'unscheduled', 
  'canceled',
  'replacement',
  'duplicated',
])
export type ScheduleRelationship = z.infer<typeof ScheduleRelationshipSchema>

/** Stop time event (arrival or departure) */
export const StopTimeEventSchema = z.object({
  delay: z.number().optional(),
  time: z.number().optional(),
  uncertainty: z.number().optional(),
})
export type StopTimeEvent = z.infer<typeof StopTimeEventSchema>

/** Stop time update within a trip */
export const StopTimeUpdateSchema = z.object({
  stopSequence: z.number().optional(),
  stopId: z.string().optional(),
  arrival: StopTimeEventSchema.optional(),
  departure: StopTimeEventSchema.optional(),
  scheduleRelationship: ScheduleRelationshipSchema.optional(),
  platformInfo: z.string().optional(),
})
export type StopTimeUpdate = z.infer<typeof StopTimeUpdateSchema>

/** Trip descriptor */
export const TripDescriptorSchema = z.object({
  tripId: z.string().optional(),
  routeId: z.string().optional(),
  directionId: z.number().optional(),
  startTime: z.string().optional(),
  startDate: z.string().optional(),
  scheduleRelationship: ScheduleRelationshipSchema.optional(),
})
export type TripDescriptor = z.infer<typeof TripDescriptorSchema>

/** Vehicle descriptor */
export const VehicleDescriptorSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  licensePlate: z.string().optional(),
  wheelchairAccessible: z.boolean().optional(),
})
export type VehicleDescriptor = z.infer<typeof VehicleDescriptorSchema>

/** Trip update with stop time updates */
export const TripUpdateSchema = z.object({
  id: z.string(),
  trip: TripDescriptorSchema,
  vehicle: VehicleDescriptorSchema.optional(),
  stopTimeUpdates: z.array(StopTimeUpdateSchema),
  timestamp: z.number().optional(),
  delay: z.number().optional(),
})
export type TripUpdate = z.infer<typeof TripUpdateSchema>

/** Geographic position */
export const PositionSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  bearing: z.number().optional(),
  speed: z.number().optional(),
  odometer: z.number().optional(),
})
export type Position = z.infer<typeof PositionSchema>

/** Vehicle occupancy status */
export const OccupancyStatusSchema = z.enum([
  'empty',
  'many_seats_available',
  'few_seats_available',
  'standing_room_only',
  'crushed_standing_room_only',
  'full',
  'not_accepting_passengers',
  'no_data_available',
  'not_boardable',
])
export type OccupancyStatus = z.infer<typeof OccupancyStatusSchema>

/** Vehicle congestion level */
export const CongestionLevelSchema = z.enum([
  'unknown',
  'running_smoothly',
  'stop_and_go',
  'congestion',
  'severe_congestion',
])
export type CongestionLevel = z.infer<typeof CongestionLevelSchema>

/** Current vehicle stop status */
export const VehicleStopStatusSchema = z.enum([
  'incoming_at',
  'stopped_at',
  'in_transit_to',
])
export type VehicleStopStatus = z.infer<typeof VehicleStopStatusSchema>

/** Vehicle position with trip info */
export const VehiclePositionSchema = z.object({
  id: z.string(),
  trip: TripDescriptorSchema.optional(),
  vehicle: VehicleDescriptorSchema.optional(),
  position: PositionSchema,
  currentStopSequence: z.number().optional(),
  stopId: z.string().optional(),
  currentStatus: VehicleStopStatusSchema.optional(),
  timestamp: z.number().optional(),
  congestionLevel: CongestionLevelSchema.optional(),
  occupancyStatus: OccupancyStatusSchema.optional(),
})
export type VehiclePosition = z.infer<typeof VehiclePositionSchema>

/** Feed metadata for tracking freshness */
export const FeedMetaSchema = z.object({
  lastModified: z.string().optional(),
  fetchedAt: z.number(),
  count: z.number(),
  feed: TfnswFeedSchema,
  feedType: z.enum(['alerts', 'tripupdates', 'vehiclepos']),
})
export type FeedMeta = z.infer<typeof FeedMetaSchema>
