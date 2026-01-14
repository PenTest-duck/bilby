# TfNSW Vehicle Positions API - Comprehensive Report

**For Bilby App Backend Integration**

## Table of Contents

1. [Overview](#1-overview)
2. [API Endpoints](#2-api-endpoints)
3. [GTFS Realtime Data Structure](#3-gtfs-realtime-data-structure)
4. [Data Availability by Transport Mode](#4-data-availability-by-transport-mode)
5. [Trip Matching Strategy](#5-trip-matching-strategy)
6. [Direction Information](#6-direction-information)
7. [Route-Level Vehicle Tracking](#7-route-level-vehicle-tracking)
8. [Current Bilby Implementation](#8-current-bilby-implementation)
9. [Implementation Recommendations](#9-implementation-recommendations)
10. [TfNSW-Specific Extensions](#10-tfnsw-specific-extensions)
11. [API Requests for Testing](#11-api-requests-for-testing)

---

## 1. Overview

The TfNSW Vehicle Positions API provides real-time GPS locations for public transport vehicles across NSW. This data follows the **GTFS Realtime** specification and is delivered as Protocol Buffer messages.

### Key Capabilities
- **Real-time vehicle locations** (latitude, longitude, bearing, speed)
- **Trip association** (link vehicle to specific scheduled trip)
- **Occupancy status** (crowding levels on vehicles)
- **Congestion levels** (traffic conditions affecting the vehicle)
- **Carriage-level data** (for trains/metro - occupancy per carriage)

### API Versions
| Version | Base Path | Transport Modes |
|---------|-----------|-----------------|
| **v1** | `/v1/gtfs/vehiclepos` | Buses, Ferries, Light Rail (CBD/SE), NSW Trains, Regional Buses |
| **v2** | `/v2/gtfs/vehiclepos` | Sydney Trains, Metro, Light Rail (Inner West) |

**Key Difference:** v2 endpoints provide richer data including multi-carriage details with per-carriage occupancy.

---

## 2. API Endpoints

### v1 Endpoints (`/v1/gtfs/vehiclepos`)

| Endpoint | Transport Mode | Notes |
|----------|---------------|-------|
| `/buses` | Sydney Buses | ~1200+ vehicles, includes occupancy |
| `/ferries/sydneyferries` | Sydney Ferries | ~20 vessels, vessel names as IDs |
| `/ferries/MFF` | Manly Fast Ferry | Private operator |
| `/lightrail/cbdandsoutheast` | CBD & SE Light Rail (L2/L3) | Good congestion data |
| `/lightrail/newcastle` | Newcastle Light Rail | Limited coverage |
| `/lightrail/parramatta` | Parramatta Light Rail | New service |
| `/nswtrains` | NSW TrainLink (intercity/regional) | Coach + train services |
| `/regionbuses/*` | Regional buses | Multiple sub-endpoints by region |

### v2 Endpoints (`/v2/gtfs/vehiclepos`)

| Endpoint | Transport Mode | Notes |
|----------|---------------|-------|
| `/sydneytrains` | Sydney Trains | Multi-carriage data, 8-car sets |
| `/metro` | Sydney Metro | Full occupancy per carriage, toilet/luggage info |
| `/lightrail/innerwest` | Inner West Light Rail (L1) | 2-car sets |

### Request Format

```bash
# Protobuf (default)
GET https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains
Authorization: apikey YOUR_API_KEY

# Debug text format (truncated, for testing only)
GET https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains?debug=true
```

### Response Format
- **Content-Type:** `application/x-google-protobuf`
- **Encoding:** Protocol Buffer binary
- **Update Frequency:** ~10-15 seconds

---

## 3. GTFS Realtime Data Structure

### Core Message: `VehiclePosition`

```typescript
interface VehiclePosition {
  id: string;                          // Entity ID in feed
  
  // Trip association (for matching to Trip Planner)
  trip?: {
    tripId?: string;                   // GTFS trip_id - KEY FOR MATCHING
    routeId?: string;                  // GTFS route_id
    directionId?: number;              // 0 or 1 - direction of travel
    startTime?: string;                // "HH:MM:SS"
    startDate?: string;                // "YYYYMMDD"
    scheduleRelationship?: ScheduleRelationship;
  };
  
  // Vehicle identification
  vehicle?: {
    id?: string;                       // Internal vehicle ID
    label?: string;                    // Public-facing label/name
    licensePlate?: string;             // Registration plate
  };
  
  // Geographic position
  position: {
    latitude: number;                  // WGS-84 latitude
    longitude: number;                 // WGS-84 longitude
    bearing?: number;                  // Degrees clockwise from North (0-360)
    speed?: number;                    // Meters per second
    odometer?: number;                 // Total distance in meters
  };
  
  // Stop progress
  currentStopSequence?: number;        // Current/next stop in sequence
  stopId?: string;                     // Current/next stop ID
  currentStatus?: VehicleStopStatus;   // INCOMING_AT, STOPPED_AT, IN_TRANSIT_TO
  
  // Timing
  timestamp?: number;                  // POSIX timestamp of position update
  
  // Enrichment data
  congestionLevel?: CongestionLevel;   // Traffic conditions
  occupancyStatus?: OccupancyStatus;   // Crowding level
  occupancyPercentage?: number;        // 0-100+ (experimental)
  
  // Multi-carriage (v2 trains/metro only)
  multiCarriageDetails?: CarriageDetails[];
}
```

### Enums

#### VehicleStopStatus
| Value | Meaning |
|-------|---------|
| `INCOMING_AT` (0) | About to arrive at stop |
| `STOPPED_AT` (1) | At the stop/platform |
| `IN_TRANSIT_TO` (2) | Departed previous stop, heading to next |

#### OccupancyStatus
| Value | Description | UI Suggestion |
|-------|-------------|---------------|
| `EMPTY` (0) | Few or no passengers | Green indicator |
| `MANY_SEATS_AVAILABLE` (1) | Lots of seats free | Green indicator |
| `FEW_SEATS_AVAILABLE` (2) | Some seats available | Yellow indicator |
| `STANDING_ROOM_ONLY` (3) | Full seats, standing ok | Orange indicator |
| `CRUSHED_STANDING_ROOM_ONLY` (4) | Limited standing room | Red indicator |
| `FULL` (5) | At capacity | Red indicator |
| `NOT_ACCEPTING_PASSENGERS` (6) | Not boarding | Grey indicator |
| `NO_DATA_AVAILABLE` (7) | Unknown | No indicator |
| `NOT_BOARDABLE` (8) | Engine/maintenance car | Hide from UI |

#### CongestionLevel
| Value | Description |
|-------|-------------|
| `UNKNOWN_CONGESTION_LEVEL` (0) | No data |
| `RUNNING_SMOOTHLY` (1) | Normal traffic |
| `STOP_AND_GO` (2) | Intermittent delays |
| `CONGESTION` (3) | Heavy traffic |
| `SEVERE_CONGESTION` (4) | Gridlock |

#### ScheduleRelationship
| Value | Description |
|-------|-------------|
| `SCHEDULED` (0) | Normal service |
| `UNSCHEDULED` (2) | Frequency-based (some buses) |
| `CANCELED` (3) | Trip cancelled |

---

## 4. Data Availability by Transport Mode

### Detailed Comparison

| Field | Metro (v2) | Syd Trains (v2) | Light Rail | Ferries | Buses | NSW Trains (v1) |
|-------|------------|-----------------|------------|---------|-------|-----------------|
| `trip.tripId` | ✅ | ✅ | ✅ | ✅ | ⚠️ Partial | ✅ |
| `trip.routeId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `trip.directionId` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `trip.startTime` | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `trip.startDate` | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `position.bearing` | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `position.speed` | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `currentStopSequence` | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| `stopId` | ✅ | ✅ (location) | ✅ | ✅ | ❌ | ✅ |
| `currentStatus` | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| `congestionLevel` | ✅ | ⚠️ UNKNOWN | ✅ (useful!) | ⚠️ UNKNOWN | ✅ | ⚠️ UNKNOWN |
| `occupancyStatus` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `multiCarriageDetails` | ✅ (6 cars) | ✅ (8 cars) | ✅ (2 cars) | ❌ | ❌ | ❌ |

### Mode-Specific Observations

#### Metro (Best Data Quality)
```
entity {
  vehicle {
    trip {
      trip_id: "0177-001-155-006:1000"
      route_id: "SMNW_M1"
      direction_id: 1              # Direction available!
    }
    position {
      latitude: -33.729218
      longitude: 150.99597
      bearing: 124.96
      speed: 26.0                  # m/s
    }
    congestion_level: CONGESTION   # Actual congestion data!
    occupancy_status: MANY_SEATS_AVAILABLE
    
    # Per-carriage occupancy
    [transit_realtime.consist] {
      name: "DTC1"
      occupancy_status: MANY_SEATS_AVAILABLE
      quiet_carriage: false
      toilet: NONE
      luggage_rack: false
    }
    # ... 5 more carriages
  }
}
```

#### Sydney Trains (Limited Data)
```
entity {
  vehicle {
    trip {
      trip_id: "612H.1257.152.20.T.8.88114701"
      route_id: "RTTA_DEF"
      # NO direction_id, startTime, startDate
    }
    position {
      latitude: -34.133984
      longitude: 150.99464
      # NO bearing or speed
    }
    congestion_level: UNKNOWN_CONGESTION_LEVEL
    stop_id: "Sutherland.WLDownSidESA Exit Loc"  # Location string, not stop_id
    
    # Carriage count available (8 cars typical)
    [transit_realtime.consist] {
      position_in_consist: 1
      # NO occupancy data
    }
  }
}
```

#### Buses (Good for Real-time Tracking)
```
entity {
  vehicle {
    trip {
      trip_id: "2547745"
      start_time: "12:12:00"
      start_date: "20260114"
      schedule_relationship: SCHEDULED
      route_id: "2501_774"
    }
    position {
      latitude: -33.753483
      longitude: 150.69487
      bearing: 197.0
      speed: 0.0
    }
    congestion_level: RUNNING_SMOOTHLY
    occupancy_status: MANY_SEATS_AVAILABLE
    
    # TfNSW extension data
    [transit_realtime.tfnsw_vehicle_descriptor] {
      air_conditioned: true
      wheelchair_accessible: 1
      vehicle_model: "Scania~K230UB~Custom Coaches~CB60CMAX"
    }
  }
}
```

#### Light Rail CBD/SE (Good Congestion Data)
```
entity {
  vehicle {
    trip {
      trip_id: "47597-10317:1001"
      route_id: "1001_L3"
      direction_id: 0
    }
    congestion_level: SEVERE_CONGESTION  # Very useful for light rail!
    current_stop_sequence: 11
    current_status: IN_TRANSIT_TO
  }
}
```

---

## 5. Trip Matching Strategy

### The Matching Problem

The Trip Planner API returns journeys with legs that have transportation IDs, but these don't directly match the GTFS `trip_id` in vehicle positions. We need a strategy to link them.

### Trip ID Formats Observed

| Source | Format | Example |
|--------|--------|---------|
| Metro | `XXXX-XXX-XXX-XXX:XXXX` | `0177-001-155-006:1000` |
| Sydney Trains | Complex dotted format | `612H.1257.152.20.T.8.88114701` |
| Light Rail | `XXXXX-XXXXX:XXXX` | `47597-10317:1001` |
| Buses | Numeric | `2547745` |
| Ferries | Complex with route | `CI1145-WDSM-IN.120126.31.1219` |
| NSW Trains | Dotted with time | `152.120126.127.0455` |

### Trip Planner Transportation ID Format

From Trip Planner API responses:
```
transportation.id: "nsw:12045:T8_T8::R:bj:47397::"
```

The trip ID may be embedded or may require alternative matching.

### Matching Strategies

#### Strategy 1: Direct Trip ID Match (Current Implementation)
```typescript
// Extract trip_id from transportation.id
function extractTripId(leg: Leg): string | undefined {
  const transportId = leg.transportation?.id;
  if (transportId) {
    const parts = transportId.split(':');
    if (parts.length >= 3) {
      return parts[2]; // Third segment
    }
  }
  return undefined;
}

// Find in vehicle positions
function findVehiclePosition(tripId: string, positions: VehiclePosition[]): VehiclePosition | null {
  return positions.find(p => p.trip?.tripId === tripId) ?? null;
}
```

**Limitation:** Format mismatch between Trip Planner and GTFS trip IDs.

#### Strategy 2: Route + Time + Direction Matching (Recommended)
```typescript
interface TripMatcher {
  routeId: string;
  directionId?: number;
  startTime?: string;   // "HH:MM:SS"
  startDate?: string;   // "YYYYMMDD"
}

function findVehicleByRouteAndTime(
  matcher: TripMatcher,
  positions: VehiclePosition[],
  toleranceMinutes: number = 5
): VehiclePosition | null {
  return positions.find(p => {
    // Match route
    if (!p.trip?.routeId?.includes(matcher.routeId)) return false;
    
    // Match direction if available
    if (matcher.directionId !== undefined && 
        p.trip?.directionId !== undefined &&
        p.trip.directionId !== matcher.directionId) {
      return false;
    }
    
    // Match time window
    if (matcher.startTime && p.trip?.startTime) {
      const timeDiff = getTimeDifferenceMinutes(matcher.startTime, p.trip.startTime);
      if (Math.abs(timeDiff) > toleranceMinutes) return false;
    }
    
    return true;
  }) ?? null;
}
```

#### Strategy 3: Stop Sequence + Time Matching
For cases where route matching fails, use the stop sequence:
```typescript
function findVehicleNearStop(
  stopId: string,
  routeId: string,
  positions: VehiclePosition[]
): VehiclePosition | null {
  return positions.find(p => 
    p.stopId === stopId && 
    p.trip?.routeId?.includes(routeId)
  ) ?? null;
}
```

### Recommended Matching Flow

```
1. Try direct trip_id match
   ↓ (if no match)
2. Try route_id + direction_id + start_time match
   ↓ (if no match)  
3. Try route_id + current stop_id match
   ↓ (if no match)
4. Return null (no vehicle position available)
```

---

## 6. Direction Information

### Understanding `direction_id`

The `direction_id` field indicates the direction of travel on a route:
- **0**: Typically "outbound" (away from city center)
- **1**: Typically "inbound" (toward city center)

### Availability by Mode

| Mode | `direction_id` in Vehicle Positions | Notes |
|------|-------------------------------------|-------|
| Metro | ✅ Always present | 0 = Tallawong, 1 = Sydenham |
| Light Rail (all) | ✅ Always present | Varies by line |
| Sydney Trains | ❌ Not provided | Must infer from route |
| Buses | ❌ Not provided | Use bearing instead |
| Ferries | ❌ Not provided | Use vessel name/route |
| NSW Trains | ❌ Not provided | Use trip label |

### Inferring Direction

When `direction_id` is not available:

#### Method 1: From Route ID Pattern
```typescript
function inferDirectionFromRouteId(routeId: string): number | undefined {
  // Some route IDs encode direction
  // e.g., "ESI_2a" vs "ESI_2b" might indicate direction
  if (routeId.endsWith('a') || routeId.endsWith('_1')) return 0;
  if (routeId.endsWith('b') || routeId.endsWith('_2')) return 1;
  return undefined;
}
```

#### Method 2: From Vehicle Label
```typescript
function inferDirectionFromLabel(label: string): number | undefined {
  // NSW Trains labels include destination
  // "04:55am Grafton City - Sydney" → toward Sydney (inbound)
  // "11:00am Sydney - Grafton City" → away from Sydney (outbound)
  const parts = label.split(' - ');
  if (parts.length === 2) {
    const destination = parts[1].toLowerCase();
    if (destination.includes('sydney') || destination.includes('central')) {
      return 1; // Inbound
    }
    return 0; // Outbound
  }
  return undefined;
}
```

#### Method 3: From Bearing (Buses)
```typescript
function inferDirectionFromBearing(
  bearing: number, 
  routeHeading: { inbound: number; outbound: number }
): number {
  const inboundDiff = Math.abs(bearing - routeHeading.inbound);
  const outboundDiff = Math.abs(bearing - routeHeading.outbound);
  return inboundDiff < outboundDiff ? 1 : 0;
}
```

---

## 7. Route-Level Vehicle Tracking

### Use Case: "Show all vehicles on this route"

For displaying vehicles on a map for a specific route, we need to:
1. Filter vehicle positions by `route_id`
2. Handle route ID format variations
3. Group by direction

### Implementation

```typescript
interface RouteVehicles {
  routeId: string;
  vehicles: {
    position: { lat: number; lng: number };
    bearing?: number;
    speed?: number;
    direction?: number;
    occupancy?: OccupancyStatus;
    congestion?: CongestionLevel;
    vehicleId?: string;
    label?: string;
    nextStop?: string;
    status?: VehicleStopStatus;
  }[];
}

async function getVehiclesOnRoute(
  routeId: string,
  feeds: TfnswFeed[] = ['sydneytrains', 'metro', 'lightrail', 'buses']
): Promise<RouteVehicles> {
  const allPositions: VehiclePosition[] = [];
  
  for (const feed of feeds) {
    const positions = await getVehiclePositions(feed);
    if (positions) {
      allPositions.push(...positions);
    }
  }
  
  // Normalize route ID for matching
  const normalizedRouteId = normalizeRouteId(routeId);
  
  const matchingVehicles = allPositions.filter(p => {
    if (!p.trip?.routeId) return false;
    return normalizeRouteId(p.trip.routeId).includes(normalizedRouteId);
  });
  
  return {
    routeId,
    vehicles: matchingVehicles.map(p => ({
      position: { lat: p.position.latitude, lng: p.position.longitude },
      bearing: p.position.bearing,
      speed: p.position.speed,
      direction: p.trip?.directionId,
      occupancy: p.occupancyStatus,
      congestion: p.congestionLevel,
      vehicleId: p.vehicle?.id,
      label: p.vehicle?.label,
      nextStop: p.stopId,
      status: p.currentStatus,
    })),
  };
}

function normalizeRouteId(routeId: string): string {
  // Remove prefixes like "SMNW_", "1001_", etc.
  return routeId.replace(/^[A-Z0-9]+_/, '').toUpperCase();
}
```

### Route ID Mappings

| Trip Planner Route | GTFS route_id Pattern | Mode |
|--------------------|----------------------|------|
| T1 Western Line | `T1_*`, `RTTA_DEF` | Sydney Trains |
| T8 Airport Line | `T8_*` | Sydney Trains |
| M1 Metro | `SMNW_M1` | Metro |
| L1 Dulwich Hill | `IWLR-191` | Inner West Light Rail |
| L2 Randwick | `1001_L2` | CBD Light Rail |
| L3 Kingsford | `1001_L3` | CBD Light Rail |
| F1 Manly | `9-F1-*` | Ferries |
| 333 (bus) | `*_333` | Buses |

---

## 8. Current Bilby Implementation

### What's Currently Implemented

#### Files Involved
- `@/Users/pentest-duck/Desktop/bilby/backend/src/pollers/vehicle-positions-poller.ts:1-42` - Polls v2 feeds
- `@/Users/pentest-duck/Desktop/bilby/backend/src/lib/tfnsw-client.ts:187-211` - Fetch function
- `@/Users/pentest-duck/Desktop/bilby/backend/src/lib/gtfs-parser.ts:289-334` - Protobuf parsing
- `@/Users/pentest-duck/Desktop/bilby/backend/src/lib/realtime-merger.ts:86-98` - Trip matching
- `@/Users/pentest-duck/Desktop/bilby/backend/src/lib/cache.ts:70-87` - Redis caching
- `@/Users/pentest-duck/Desktop/bilby/backend/src/types/gtfs.ts:222-235` - Type definitions

#### Current Feeds Polled
```typescript
feeds: ['sydneytrains', 'metro', 'lightrail']  // v2 only
```

#### Current Matching Logic
```typescript
function findVehiclePosition(tripId: string, positions: Map<TfnswFeed, VehiclePosition[]>): VehiclePosition | null {
  for (const positions of vehiclePositions.values()) {
    const found = positions.find(p => p.trip?.tripId === tripId);
    if (found) return found;
  }
  return null;
}
```

**Issue:** Simple `trip_id` equality check may not work due to format differences.

#### Current Data Model
```typescript
interface VehiclePosition {
  id: string;
  trip?: TripDescriptor;
  vehicle?: VehicleDescriptor;
  position: Position;
  currentStopSequence?: number;
  stopId?: string;
  currentStatus?: VehicleStopStatus;
  timestamp?: number;
  congestionLevel?: CongestionLevel;
  occupancyStatus?: OccupancyStatus;
}
```

**Missing Fields:**
- `occupancyPercentage` (experimental but available)
- `multiCarriageDetails` (critical for train UX)
- TfNSW extension fields (`air_conditioned`, `wheelchair_accessible`, `vehicle_model`)

---

## 9. Implementation Recommendations

### Priority 1: Add Missing Feeds (High)

**Current:** Only polling `sydneytrains`, `metro`, `lightrail`

**Recommended:** Add buses and ferries for complete coverage

```typescript
// vehicle-positions-poller.ts
feeds: [
  // v2 feeds
  'sydneytrains', 
  'metro', 
  'lightrail',
  // v1 feeds (need separate poller or multi-version handling)
  'buses',
  'ferries',
]
```

**Consideration:** v1 and v2 use different base paths. May need separate pollers or URL builder logic.

### Priority 2: Enhance Data Model (High)

Add multi-carriage support for trains:

```typescript
interface CarriageDetails {
  id?: string;
  label?: string;                    // e.g., "DTC1", "MC2"
  positionInConsist: number;         // 1-8 for trains
  occupancyStatus?: OccupancyStatus;
  occupancyPercentage?: number;
  quietCarriage?: boolean;
  toilet?: 'none' | 'normal' | 'accessible';
  luggageRack?: boolean;
}

interface VehiclePositionEnriched extends VehiclePosition {
  carriages?: CarriageDetails[];
  airConditioned?: boolean;
  wheelchairAccessible?: boolean;
  vehicleModel?: string;
}
```

### Priority 3: Improve Trip Matching (High)

Implement multi-strategy matching:

```typescript
async function findVehicleForLeg(
  leg: Leg,
  vehiclePositions: Map<TfnswFeed, VehiclePosition[]>
): Promise<VehiclePosition | null> {
  const routeId = extractRouteId(leg);
  const tripId = extractTripId(leg);
  const departureTime = leg.origin?.departureTimePlanned;
  const directionId = leg.properties?.direction;
  
  // Strategy 1: Direct trip ID
  if (tripId) {
    const match = findByTripId(tripId, vehiclePositions);
    if (match) return match;
  }
  
  // Strategy 2: Route + direction + time
  if (routeId && departureTime) {
    const match = findByRouteAndTime(routeId, departureTime, directionId, vehiclePositions);
    if (match) return match;
  }
  
  // Strategy 3: Route + stop
  const originStopId = leg.origin?.id;
  if (routeId && originStopId) {
    const match = findByRouteAndStop(routeId, originStopId, vehiclePositions);
    if (match) return match;
  }
  
  return null;
}
```

### Priority 4: Add Route Vehicles Endpoint (Medium)

New API endpoint for map display:

```typescript
// GET /api/vehicles/route/:routeId
router.get('/route/:routeId', async (req, res) => {
  const { routeId } = req.params;
  const vehicles = await getVehiclesOnRoute(routeId);
  
  res.json({
    routeId,
    count: vehicles.length,
    vehicles: vehicles.map(v => ({
      lat: v.position.latitude,
      lng: v.position.longitude,
      bearing: v.position.bearing,
      speed: v.position.speed,
      direction: v.trip?.directionId,
      occupancy: v.occupancyStatus,
      nextStopId: v.stopId,
      updatedAt: v.timestamp,
    })),
    fetchedAt: Date.now(),
  });
});
```

### Priority 5: Parse TfNSW Extensions (Medium)

The protobuf messages contain TfNSW-specific extensions:

```protobuf
[transit_realtime.tfnsw_vehicle_descriptor] {
  air_conditioned: true
  wheelchair_accessible: 1
  vehicle_model: "Alstom Metropolis"
}

[transit_realtime.consist] {
  name: "DTC1"
  position_in_consist: 0
  occupancy_status: MANY_SEATS_AVAILABLE
  quiet_carriage: false
  toilet: NONE
  luggage_rack: false
}
```

**Action:** Need to extend the protobuf schema or parse as unknown extensions.

### Priority 6: Congestion Display for Light Rail (Low)

Light Rail has excellent congestion data that could be displayed:

```typescript
function getCongestionIcon(level: CongestionLevel): string {
  switch (level) {
    case 'running_smoothly': return '🟢';
    case 'stop_and_go': return '🟡';
    case 'congestion': return '🟠';
    case 'severe_congestion': return '🔴';
    default: return '⚪';
  }
}
```

---

## 10. TfNSW-Specific Extensions

TfNSW extends the standard GTFS Realtime format with additional fields.

### `tfnsw_vehicle_descriptor` Extension

| Field | Type | Description |
|-------|------|-------------|
| `air_conditioned` | bool | Vehicle has A/C |
| `wheelchair_accessible` | int | 0=unknown, 1=yes, 2=no |
| `vehicle_model` | string | Make/model (e.g., "Alstom Metropolis") |
| `performing_prior_trip` | bool | Dead-running to start position |
| `special_vehicle_attributes` | int | Bitfield for special features |

### `consist` Extension (Trains/Metro)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Carriage designation (DTC1, MC2, etc.) |
| `position_in_consist` | int | Position in train (0-based or 1-based varies) |
| `occupancy_status` | OccupancyStatus | Per-carriage crowding |
| `quiet_carriage` | bool | Quiet carriage designation |
| `toilet` | enum | NONE, NORMAL, ACCESSIBLE |
| `luggage_rack` | bool | Has luggage storage |

### Carriage Type Codes (Sydney Metro)

| Code | Meaning |
|------|---------|
| DTC1/DTC2 | Driver Trailer Car (ends) |
| MC1/MC2 | Motor Car |
| MPC1/MPC2 | Motor Pantograph Car |

---

## 11. API Requests for Testing

### Request 1: Verify Metro Vehicle Data

Test that Metro returns full data including carriages.

```bash
curl -H "Authorization: apikey YOUR_API_KEY" \
  "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/metro?debug=true"
```

**Expected:** Per-carriage occupancy, quiet carriage info, toilet locations.

### Request 2: Compare v1 vs v2 Light Rail

Check data difference between CBD Light Rail (v1) and Inner West (v2).

```bash
# v1 - CBD & Southeast
curl -H "Authorization: apikey YOUR_API_KEY" \
  "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/lightrail/cbdandsoutheast?debug=true"

# v2 - Inner West
curl -H "Authorization: apikey YOUR_API_KEY" \
  "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/lightrail/innerwest?debug=true"
```

### Request 3: Bus Occupancy Data

Verify buses have occupancy status.

```bash
curl -H "Authorization: apikey YOUR_API_KEY" \
  "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses?debug=true" | head -200
```

### Request 4: Sydney Trains Data Gaps

Confirm Sydney Trains lacks bearing/speed.

```bash
curl -H "Authorization: apikey YOUR_API_KEY" \
  "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains?debug=true" | head -100
```

---

## 12. Cross-Reference with Official TfNSW Protobuf

The official TfNSW protobuf schema (`vehicle_positions.proto`) confirms and extends our analysis:

### Confirmed Standard Fields

| Field | Proto Definition | Our Report | Status |
|-------|------------------|------------|--------|
| `VehiclePosition.trip` | `optional TripDescriptor trip = 1` | ✅ Documented | Matches |
| `VehiclePosition.position` | `optional Position position = 2` | ✅ Documented | Matches |
| `VehiclePosition.current_stop_sequence` | `optional uint32 = 3` | ✅ Documented | Matches |
| `VehiclePosition.stop_id` | `optional string = 7` | ✅ Documented | Matches |
| `VehiclePosition.current_status` | `VehicleStopStatus = 4` | ✅ Documented | Matches |
| `VehiclePosition.timestamp` | `optional uint64 = 5` | ✅ Documented | Matches |
| `VehiclePosition.congestion_level` | `CongestionLevel = 6` | ✅ Documented | Matches |
| `VehiclePosition.occupancy_status` | `OccupancyStatus = 9` | ✅ Documented | Matches |
| `TripDescriptor.direction_id` | `optional uint32 = 6` | ✅ Documented | Matches |

### TfNSW Extensions Confirmed

The proto file defines these TfNSW-specific extensions that extend the base GTFS-RT spec:

```protobuf
// Extension 1007: TfNSW Vehicle Descriptor
message TfnswVehicleDescriptor {
    optional bool air_conditioned = 1 [default = false];
    optional int32 wheelchair_accessible = 2 [default = 0];  // 0=unknown, 1=yes, 2=no
    optional string vehicle_model = 3;
    optional bool performing_prior_trip = 4 [default = false];
    optional int32 special_vehicle_attributes = 5 [default = 0];
}

// Extension 1007: Carriage/Consist Details
message CarriageDescriptor {
    optional string name = 1;                    // e.g., "DTC1", "MC2"
    required int32 position_in_consist = 2;      // Car position (may be 0-based or 1-based)
    optional OccupancyStatus occupancy_status = 3;
    optional bool quiet_carriage = 4 [default = false];
    optional ToiletStatus toilet = 5;            // NONE, NORMAL, ACCESSIBLE
    optional bool luggage_rack = 6 [default = false];
    optional OccupancyStatus departure_occupancy_status = 7;  // Predictive occupancy
}

// Extension 1007: Track Direction
enum TrackDirection {
    UP = 0;
    DOWN = 1;
}
```

### Key Insights from Proto

1. **`departure_occupancy_status`** - The proto reveals a separate field for *predictive* occupancy at departure, distinct from current occupancy. This is useful for showing expected crowding.

2. **`performing_prior_trip`** - Confirms the flag for vehicles dead-running to their start position.

3. **`special_vehicle_attributes`** - Bitfield for special features (needs documentation on bit meanings).

4. **`TrackDirection`** - UP/DOWN track direction extension on Position, useful for bi-directional lines.

5. **Predictive Occupancy in TripUpdate** - The proto shows `carriage_seq_predictive_occupancy` extension on `StopTimeUpdate`, meaning per-carriage predicted occupancy is available in trip updates, not just vehicle positions.

### Bilby Parser Updates Needed

Current `gtfs-parser.ts` should be extended to parse:

```typescript
interface CarriageDetails {
  name?: string;
  positionInConsist: number;
  occupancyStatus?: OccupancyStatus;
  departureOccupancyStatus?: OccupancyStatus;  // ADD: Predictive
  quietCarriage?: boolean;
  toilet?: 'none' | 'normal' | 'accessible';
  luggageRack?: boolean;
}

interface TfnswVehicleDescriptor {
  airConditioned?: boolean;
  wheelchairAccessible?: number;  // 0=unknown, 1=yes, 2=no
  vehicleModel?: string;
  performingPriorTrip?: boolean;
  specialVehicleAttributes?: number;
}

interface VehiclePositionEnriched extends VehiclePosition {
  carriages?: CarriageDetails[];
  tfnswDescriptor?: TfnswVehicleDescriptor;
  trackDirection?: 'up' | 'down';
}
```

---

## Summary

| Aspect | Current State | Recommendation |
|--------|---------------|----------------|
| Feeds polled | v2 only (trains, metro, light rail) | Add buses, ferries (v1) |
| Trip matching | Direct trip_id match | Multi-strategy matching |
| Carriage data | Not parsed | Add multiCarriageDetails |
| Route vehicles | Not implemented | New `/api/vehicles/route/:id` |
| Direction | Used if available | Add inference for missing |
| Occupancy | Parsed but limited use | Display on departures/trips |
| Extensions | Not parsed | Parse tfnsw_vehicle_descriptor |

### Key Insights

1. **Metro has the best data quality** - Use as reference implementation
2. **Sydney Trains has gaps** - No bearing, speed, or direction
3. **Buses have good occupancy** - Useful for crowding indicators
4. **Light Rail congestion is valuable** - Good for traffic-affected services
5. **Trip ID matching is unreliable** - Use route+time+direction instead
6. **Carriage data enables "stand here"** - Combines with TravelInCars from Trip Planner
