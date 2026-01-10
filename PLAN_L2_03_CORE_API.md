# L2-03: Core Backend API

**Parent:** L1-03 (Core Backend API)  
**Status:** ✅ Complete  
**Estimated Effort:** 10-14 hours

---

## Overview

Build mobile-friendly API endpoints that proxy TfNSW APIs, merge realtime data from Redis, and apply ranking logic to provide intelligent trip recommendations.

---

## TfNSW Trip Planner API Summary

### Base URL
`https://api.transport.nsw.gov.au/v1/tp/`

### Endpoints

| API | Path | Purpose |
|-----|------|---------|
| Stop Finder | `/stop_finder` | Search stops, addresses, POIs |
| Trip Planner | `/trip` | Plan journeys between locations |
| Departures | `/departure_mon` | Live departures from a stop |
| Service Alerts | `/add_info` | Service disruption information |
| Coordinate | `/coord` | Find POIs near a location |

### Required Parameters
- `outputFormat=rapidJSON` — JSON output
- `coordOutputFormat=EPSG:4326` — Standard coordinates
- `TfNSWSF=true` — Stop finder flag
- `TfNSWTR=true` — Trip planner flag
- `TfNSWDM=true` — Departure monitor flag

### Authentication
- Header: `Authorization: apikey [TOKEN]`

---

## Tasks

### T01: TfNSW Trip Planner Client

**Goal:** HTTP client for Trip Planner APIs (separate from GTFS client).

**File:** `backend/src/lib/tfnsw-tp-client.ts`

**Functions:**
```typescript
searchStops(query, options): Promise<StopSearchResult[]>
getStopById(stopId): Promise<Stop>
getDepartures(stopId, options): Promise<Departure[]>
planTrip(origin, destination, options): Promise<Journey[]>
getServiceAlerts(options): Promise<ServiceAlert[]>
findNearbyStops(lat, lng, radius): Promise<Stop[]>
```

**Acceptance Criteria:**
- [ ] All TfNSW Trip Planner endpoints wrapped
- [ ] Proper error handling and timeouts
- [ ] Response type definitions

---

### T02: Trip Planner Domain Models

**Goal:** TypeScript types for Trip Planner responses.

**File:** `backend/src/types/trip-planner.ts`

**Types:**
- `Stop`, `StopSearchResult`
- `Journey`, `Leg`, `StopSequence`
- `Departure`, `StopEvent`
- `ServiceAlert`
- `Fare`, `FareTicket`

**Acceptance Criteria:**
- [ ] All response shapes typed
- [ ] Zod schemas for validation where needed

---

### T03: Stops API Endpoint

**Goal:** Stop search and lookup for mobile app.

**File:** `backend/src/api/stops.ts`

**Endpoints:**
```
GET /api/stops/search?q=central&limit=10
GET /api/stops/:stopId
GET /api/stops/nearby?lat=-33.88&lng=151.21&radius=500
```

**Response shape:**
```typescript
{
  stops: Stop[],
  query: string,
  timestamp: number
}
```

**Acceptance Criteria:**
- [ ] Search returns ranked results
- [ ] Stop lookup returns full details with modes
- [ ] Nearby search uses coordinates

---

### T04: Departures API Endpoint

**Goal:** Live departures with realtime data merged.

**File:** `backend/src/api/departures.ts`

**Endpoint:**
```
GET /api/departures/:stopId?limit=20&modes=train,bus
```

**Features:**
- Fetch from TfNSW Departure API
- Merge realtime trip updates from Redis (delays, cancellations)
- Merge vehicle positions from Redis
- Filter by transport mode

**Response shape:**
```typescript
{
  stop: Stop,
  departures: Departure[],
  realtimeStatus: 'fresh' | 'stale' | 'unavailable',
  timestamp: number
}
```

**Acceptance Criteria:**
- [ ] Departures include realtime delays
- [ ] Cancelled services marked
- [ ] Response includes data freshness

---

### T05: Disruptions API Endpoint

**Goal:** Active alerts filtered by relevance.

**File:** `backend/src/api/disruptions.ts`

**Endpoints:**
```
GET /api/disruptions?modes=train,metro
GET /api/disruptions/stop/:stopId
GET /api/disruptions/route/:routeId
```

**Features:**
- Fetch from Redis cache (GTFS alerts) + TfNSW add_info
- Filter by mode, stop, route
- Priority sorting (high severity first)
- Deduplicate overlapping alerts

**Response shape:**
```typescript
{
  alerts: Alert[],
  count: number,
  filters: { modes?: string[], stopId?: string },
  timestamp: number
}
```

**Acceptance Criteria:**
- [ ] Combines GTFS alerts + Trip Planner alerts
- [ ] Filtering works correctly
- [ ] Sorted by severity/priority

---

### T06: Trips API Endpoint (Trip Planning)

**Goal:** Trip planning with ranked options and explainability.

**File:** `backend/src/api/trips.ts`

**Endpoint:**
```
GET /api/trips?from=10101331&to=10102027&when=now&strategy=best
```

**Query params:**
- `from` — Origin stop ID or coordinates
- `to` — Destination stop ID or coordinates
- `when` — Departure time (ISO string or 'now')
- `arriveBy` — If true, `when` is arrival time
- `strategy` — Ranking strategy: best | fastest | least_walking | fewest_transfers
- `modes` — Allowed modes (comma-separated)
- `accessible` — Wheelchair accessible only

**Features:**
- Proxy to TfNSW Trip Planner
- Merge realtime delays from Redis
- Apply ranking engine
- Exclude cancelled services
- Add explainability metadata

**Response shape:**
```typescript
{
  best: RankedJourney,
  alternatives: RankedJourney[],
  query: TripQuery,
  realtimeStatus: 'fresh' | 'stale' | 'unavailable',
  timestamp: number
}
```

**Acceptance Criteria:**
- [ ] Returns best + alternatives
- [ ] Realtime delays merged
- [ ] Ranking strategies work
- [ ] Cancelled legs excluded or marked

---

### T07: Ranking Engine

**Goal:** Score and rank trip options with configurable strategies.

**File:** `backend/src/lib/ranking.ts`

**Scoring factors:**
- **Arrival time**: Earlier is better
- **Total duration**: Shorter is better
- **Walking distance**: Less is better
- **Transfers**: Fewer is better
- **Reliability**: Services with delays penalized
- **Crowding**: Based on vehicle occupancy (when available)

**Strategies:**
- `best` — Balanced scoring
- `fastest` — Minimize total time
- `least_walking` — Minimize walk distance
- `fewest_transfers` — Minimize interchanges

**Explainability:**
```typescript
{
  score: number,
  factors: {
    arrivalTime: { value: number, weight: number },
    duration: { value: number, weight: number },
    walking: { value: number, weight: number },
    transfers: { value: number, weight: number },
    reliability: { value: number, weight: number }
  },
  why: string // "Fastest option with 1 transfer"
}
```

**Acceptance Criteria:**
- [ ] All strategies implemented
- [ ] Explainability metadata on every result
- [ ] Cancelled services scored 0

---

### T08: Realtime Data Merger

**Goal:** Merge Redis realtime data with Trip Planner responses.

**File:** `backend/src/lib/realtime-merger.ts`

**Functions:**
```typescript
mergeTripUpdates(journeys, tripUpdates): Journey[]
mergeVehiclePositions(departures, positions): Departure[]
mergeAlerts(journeys, alerts): Journey[]
```

**Logic:**
- Match by trip_id, route_id, or stop_id
- Apply delay offsets to scheduled times
- Mark cancelled services
- Attach vehicle location where available

**Acceptance Criteria:**
- [ ] Delays correctly applied
- [ ] Cancellations detected
- [ ] Graceful fallback when no match

---

### T09: Routes API Endpoint

**Goal:** Route information and schedules.

**File:** `backend/src/api/routes.ts`

**Endpoints:**
```
GET /api/routes/search?q=T1&modes=train
GET /api/routes/:routeId
GET /api/routes/:routeId/stops
```

**Note:** May need to use stop_finder or trip data to infer routes, as TfNSW doesn't have a dedicated routes API.

**Acceptance Criteria:**
- [ ] Route search works
- [ ] Route details include stops

---

### T10: Response Formatting & Middleware

**Goal:** Consistent response formatting across all endpoints.

**File:** `backend/src/middleware/response-formatter.ts`

**Features:**
- Wrap all responses in standard envelope
- Add data freshness timestamps
- Add request ID for debugging
- Compress large responses

**Response envelope:**
```typescript
{
  success: true,
  data: T,
  meta: {
    requestId: string,
    timestamp: number,
    cached: boolean,
    realtimeAge: number | null
  }
}
```

**Acceptance Criteria:**
- [ ] All endpoints use consistent format
- [ ] Error responses follow same structure

---

## Implementation Order

1. **T02** → Domain models (types)
2. **T01** → TfNSW Trip Planner client
3. **T03** → Stops endpoint
4. **T04** → Departures endpoint
5. **T08** → Realtime merger
6. **T05** → Disruptions endpoint
7. **T07** → Ranking engine
8. **T06** → Trips endpoint (main feature)
9. **T09** → Routes endpoint
10. **T10** → Response formatting

---

## Testing Checklist

- [ ] Stop search returns valid results
- [ ] Departures include realtime delays
- [ ] Trip planning returns ranked journeys
- [ ] Cancelled services handled correctly
- [ ] Ranking strategies produce different orderings
- [ ] Explainability text is meaningful
- [ ] All endpoints return consistent format
- [ ] Error cases handled gracefully

---

## Definition of Done

- [ ] All core endpoints functional
- [ ] Realtime data merged correctly
- [ ] Ranking engine with configurable strategies
- [ ] Explainability metadata on recommendations
- [ ] Ready to proceed to L1-04 (Mobile App)
