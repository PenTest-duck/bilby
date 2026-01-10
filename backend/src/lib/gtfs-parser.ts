/**
 * GTFS-realtime protobuf parser
 * Transforms raw GTFS data into Bilby domain models
 */

import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import type {
  Alert,
  TripUpdate,
  VehiclePosition,
  AlertCause,
  AlertEffect,
  AlertSeverity,
  ScheduleRelationship,
  VehicleStopStatus,
  OccupancyStatus,
  CongestionLevel,
} from '../types/gtfs.js'

const { transit_realtime } = GtfsRealtimeBindings

type GtfsFeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage
type GtfsActivePeriod = GtfsRealtimeBindings.transit_realtime.ITimeRange
type GtfsEntitySelector = GtfsRealtimeBindings.transit_realtime.IEntitySelector
type GtfsStopTimeUpdate = GtfsRealtimeBindings.transit_realtime.TripUpdate.IStopTimeUpdate

/** Map GTFS cause enum to Bilby cause */
function mapCause(cause: number | null | undefined): AlertCause {
  const causeMap: Record<number, AlertCause> = {
    1: 'unknown',
    2: 'other_cause',
    3: 'technical_problem',
    4: 'strike',
    5: 'demonstration',
    6: 'accident',
    7: 'holiday',
    8: 'weather',
    9: 'maintenance',
    10: 'construction',
    11: 'police_activity',
    12: 'medical_emergency',
  }
  return causeMap[cause ?? 1] ?? 'unknown'
}

/** Map GTFS effect enum to Bilby effect */
function mapEffect(effect: number | null | undefined): AlertEffect {
  const effectMap: Record<number, AlertEffect> = {
    1: 'no_service',
    2: 'reduced_service',
    3: 'significant_delays',
    4: 'detour',
    5: 'additional_service',
    6: 'modified_service',
    7: 'other_effect',
    8: 'unknown',
    9: 'stop_moved',
    10: 'no_effect',
    11: 'accessibility_issue',
  }
  return effectMap[effect ?? 8] ?? 'unknown'
}

/** Map GTFS severity enum to Bilby severity */
function mapSeverity(severity: number | null | undefined): AlertSeverity {
  const severityMap: Record<number, AlertSeverity> = {
    1: 'unknown',
    2: 'info',
    3: 'warning',
    4: 'severe',
  }
  return severityMap[severity ?? 1] ?? 'unknown'
}

/** Map GTFS schedule relationship */
function mapScheduleRelationship(rel: number | null | undefined): ScheduleRelationship {
  const relMap: Record<number, ScheduleRelationship> = {
    0: 'scheduled',
    1: 'added',
    2: 'unscheduled',
    3: 'canceled',
    5: 'replacement',
    6: 'duplicated',
  }
  return relMap[rel ?? 0] ?? 'scheduled'
}

/** Map vehicle stop status */
function mapVehicleStopStatus(status: number | null | undefined): VehicleStopStatus {
  const statusMap: Record<number, VehicleStopStatus> = {
    0: 'incoming_at',
    1: 'stopped_at',
    2: 'in_transit_to',
  }
  return statusMap[status ?? 2] ?? 'in_transit_to'
}

/** Map occupancy status */
function mapOccupancyStatus(status: number | null | undefined): OccupancyStatus {
  const statusMap: Record<number, OccupancyStatus> = {
    0: 'empty',
    1: 'many_seats_available',
    2: 'few_seats_available',
    3: 'standing_room_only',
    4: 'crushed_standing_room_only',
    5: 'full',
    6: 'not_accepting_passengers',
    7: 'no_data_available',
    8: 'not_boardable',
  }
  return statusMap[status ?? 7] ?? 'no_data_available'
}

/** Map congestion level */
function mapCongestionLevel(level: number | null | undefined): CongestionLevel {
  const levelMap: Record<number, CongestionLevel> = {
    0: 'unknown',
    1: 'running_smoothly',
    2: 'stop_and_go',
    3: 'congestion',
    4: 'severe_congestion',
  }
  return levelMap[level ?? 0] ?? 'unknown'
}

/** Get translated text from GTFS TranslatedString */
function getTranslatedText(translatedString: { translation?: Array<{ text?: string | null; language?: string | null }> | null } | null | undefined): string {
  if (!translatedString?.translation?.length) return ''
  // Prefer English, fallback to first available
  const english = translatedString.translation.find(t => t.language === 'en')
  return english?.text ?? translatedString.translation[0]?.text ?? ''
}

/**
 * Parse GTFS-realtime protobuf feed message
 */
export function parseFeedMessage(buffer: Buffer): GtfsFeedMessage {
  return transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
}

/**
 * Parse alerts from GTFS-realtime feed
 */
export function parseAlerts(buffer: Buffer): Alert[] {
  const feed = parseFeedMessage(buffer)
  const alerts: Alert[] = []

  for (const entity of feed.entity) {
    if (!entity.alert) continue

    const alert = entity.alert
    alerts.push({
      id: entity.id,
      headerText: getTranslatedText(alert.headerText as Parameters<typeof getTranslatedText>[0]),
      descriptionText: getTranslatedText(alert.descriptionText as Parameters<typeof getTranslatedText>[0]) || undefined,
      url: getTranslatedText(alert.url as Parameters<typeof getTranslatedText>[0]) || undefined,
      cause: mapCause(alert.cause as number | null | undefined),
      effect: mapEffect(alert.effect as number | null | undefined),
      severity: mapSeverity(alert.severityLevel as number | null | undefined),
      activePeriods: (alert.activePeriod ?? []).map(p => ({
        start: p.start ? Number(p.start) : undefined,
        end: p.end ? Number(p.end) : undefined,
      })),
      informedEntities: (alert.informedEntity ?? []).map(e => ({
        agencyId: e.agencyId || undefined,
        routeId: e.routeId || undefined,
        routeType: e.routeType ?? undefined,
        stopId: e.stopId || undefined,
        tripId: e.trip?.tripId || undefined,
        directionId: e.trip?.directionId ?? undefined,
      })),
      updatedAt: feed.header.timestamp ? Number(feed.header.timestamp) : Date.now() / 1000,
    })
  }

  return alerts
}

/**
 * Parse alerts from JSON format (TfNSW supports ?format=json)
 */
export function parseAlertsFromJson(json: unknown): Alert[] {
  const data = json as {
    entity?: Array<{
      id: string
      alert?: {
        headerText?: { translation?: Array<{ text?: string }> }
        descriptionText?: { translation?: Array<{ text?: string }> }
        url?: { translation?: Array<{ text?: string }> }
        cause?: number
        effect?: number
        severityLevel?: number
        activePeriod?: Array<{ start?: string; end?: string }>
        informedEntity?: Array<{
          agencyId?: string
          routeId?: string
          routeType?: number
          stopId?: string
          trip?: { tripId?: string; directionId?: number }
        }>
      }
    }>
    header?: { timestamp?: string }
  }

  const alerts: Alert[] = []
  const timestamp = data.header?.timestamp ? Number(data.header.timestamp) : Date.now() / 1000

  for (const entity of data.entity ?? []) {
    if (!entity.alert) continue

    const alert = entity.alert
    alerts.push({
      id: entity.id,
      headerText: alert.headerText?.translation?.[0]?.text ?? '',
      descriptionText: alert.descriptionText?.translation?.[0]?.text || undefined,
      url: alert.url?.translation?.[0]?.text || undefined,
      cause: mapCause(alert.cause),
      effect: mapEffect(alert.effect),
      severity: mapSeverity(alert.severityLevel),
      activePeriods: (alert.activePeriod ?? []).map(p => ({
        start: p.start ? Number(p.start) : undefined,
        end: p.end ? Number(p.end) : undefined,
      })),
      informedEntities: (alert.informedEntity ?? []).map(e => ({
        agencyId: e.agencyId || undefined,
        routeId: e.routeId || undefined,
        routeType: e.routeType ?? undefined,
        stopId: e.stopId || undefined,
        tripId: e.trip?.tripId || undefined,
        directionId: e.trip?.directionId ?? undefined,
      })),
      updatedAt: timestamp,
    })
  }

  return alerts
}

/**
 * Parse trip updates from GTFS-realtime feed
 */
export function parseTripUpdates(buffer: Buffer): TripUpdate[] {
  const feed = parseFeedMessage(buffer)
  const updates: TripUpdate[] = []

  for (const entity of feed.entity) {
    if (!entity.tripUpdate) continue

    const tu = entity.tripUpdate
    updates.push({
      id: entity.id,
      trip: {
        tripId: tu.trip?.tripId || undefined,
        routeId: tu.trip?.routeId || undefined,
        directionId: tu.trip?.directionId ?? undefined,
        startTime: tu.trip?.startTime || undefined,
        startDate: tu.trip?.startDate || undefined,
        scheduleRelationship: mapScheduleRelationship(tu.trip?.scheduleRelationship),
      },
      vehicle: tu.vehicle ? {
        id: tu.vehicle.id || undefined,
        label: tu.vehicle.label || undefined,
        licensePlate: tu.vehicle.licensePlate || undefined,
      } : undefined,
      stopTimeUpdates: (tu.stopTimeUpdate ?? []).map(stu => ({
        stopSequence: stu.stopSequence ?? undefined,
        stopId: stu.stopId || undefined,
        arrival: stu.arrival ? {
          delay: stu.arrival.delay ?? undefined,
          time: stu.arrival.time ? Number(stu.arrival.time) : undefined,
          uncertainty: stu.arrival.uncertainty ?? undefined,
        } : undefined,
        departure: stu.departure ? {
          delay: stu.departure.delay ?? undefined,
          time: stu.departure.time ? Number(stu.departure.time) : undefined,
          uncertainty: stu.departure.uncertainty ?? undefined,
        } : undefined,
        scheduleRelationship: mapScheduleRelationship(stu.scheduleRelationship),
      })),
      timestamp: tu.timestamp ? Number(tu.timestamp) : undefined,
      delay: tu.delay ?? undefined,
    })
  }

  return updates
}

/**
 * Parse vehicle positions from GTFS-realtime feed
 */
export function parseVehiclePositions(buffer: Buffer): VehiclePosition[] {
  const feed = parseFeedMessage(buffer)
  const positions: VehiclePosition[] = []

  for (const entity of feed.entity) {
    if (!entity.vehicle) continue

    const vp = entity.vehicle
    if (!vp.position) continue

    positions.push({
      id: entity.id,
      trip: vp.trip ? {
        tripId: vp.trip.tripId || undefined,
        routeId: vp.trip.routeId || undefined,
        directionId: vp.trip.directionId ?? undefined,
        startTime: vp.trip.startTime || undefined,
        startDate: vp.trip.startDate || undefined,
        scheduleRelationship: mapScheduleRelationship(vp.trip.scheduleRelationship),
      } : undefined,
      vehicle: vp.vehicle ? {
        id: vp.vehicle.id || undefined,
        label: vp.vehicle.label || undefined,
        licensePlate: vp.vehicle.licensePlate || undefined,
      } : undefined,
      position: {
        latitude: vp.position.latitude,
        longitude: vp.position.longitude,
        bearing: vp.position.bearing ?? undefined,
        speed: vp.position.speed ?? undefined,
        odometer: vp.position.odometer ? Number(vp.position.odometer) : undefined,
      },
      currentStopSequence: vp.currentStopSequence ?? undefined,
      stopId: vp.stopId || undefined,
      currentStatus: mapVehicleStopStatus(vp.currentStatus),
      timestamp: vp.timestamp ? Number(vp.timestamp) : undefined,
      congestionLevel: mapCongestionLevel(vp.congestionLevel),
      occupancyStatus: mapOccupancyStatus(vp.occupancyStatus),
    })
  }

  return positions
}
