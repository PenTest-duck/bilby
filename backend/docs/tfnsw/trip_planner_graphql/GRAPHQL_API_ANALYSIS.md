# TfNSW Frontend GraphQL API Analysis

**For Bilby App Backend Integration**

## Table of Contents

1. [Overview](#1-overview)
2. [API Endpoint Details](#2-api-endpoint-details)
3. [Reverse-Engineered Schema](#3-reverse-engineered-schema)
4. [Data Comparison: REST vs GraphQL](#4-data-comparison-rest-vs-graphql)
5. [Vehicle Position Matching](#5-vehicle-position-matching)
6. [Fare Data Analysis](#6-fare-data-analysis)
7. [Occupancy Data Analysis](#7-occupancy-data-analysis)
8. [Stability & Risk Assessment](#8-stability--risk-assessment)
9. [Integration Strategy Options](#9-integration-strategy-options)
10. [Recommendation & Decision](#10-recommendation--decision)
11. [Implementation Plan](#11-implementation-plan)

---

## 1. Overview

The TfNSW website (`transportnsw.info`) uses an internal GraphQL API to power its trip planning interface. This API provides some data that the official stable REST API (`api.transport.nsw.gov.au`) does not return, most notably **Opal fare information**.

### Key Question

> Should Bilby use this unofficial GraphQL API, and if so, how?

### Executive Summary

| Factor | Assessment |
|--------|------------|
| **Fare Data** | ✅ Available via GraphQL, NOT via REST API |
| **Realtime Trip ID** | ✅ Available - enables vehicle position matching |
| **Occupancy** | ⚠️ Available in both, different formats |
| **Stability** | ⚠️ Unofficial, no SLA, may change without notice |
| **Authentication** | ✅ No API key required (public endpoint) |
| **Rate Limiting** | ❓ Unknown, likely exists |

**Recommendation:** Use GraphQL as a **secondary enrichment source** for fare data only, with graceful degradation if unavailable.

---

## 2. API Endpoint Details

### Endpoint

```
POST https://transportnsw.info/api/graphql
Content-Type: application/json
```

### Authentication

**None required** - This is a public-facing API used by the TfNSW website.

### Request Format

```json
{
  "operationName": "TripOptions",
  "query": "query TripOptions($input: TripPlannerInput!, $tripId: String) { ... }",
  "variables": {
    "input": {
      "from": "212110",           // Stop ID (Epping Station)
      "to": "203360",             // Stop ID (UNSW Anzac Parade)
      "excludedModes": [11],      // Exclude school buses
      "opalType": "adult",        // adult, child, concession, senior
      "filters": {
        "onlyAccessible": false,
        "onlyOpal": false
      },
      "preferences": {
        "tripPreference": "leasttime",  // leasttime, leastwalking, leastchanges
        "walkSpeed": "normal",
        "cycleSpeed": 16,
        "gettingFromMode": 100,
        "gettingFromValue": 20,
        "gettingToMode": 100,
        "gettingToValue": 20
      }
    }
  }
}
```

### Response

Returns a `TripOption` array with legs, fares, alerts, and GeoJSON for map display.

---

## 3. Reverse-Engineered Schema

Based on the query and response analysis:

### Input Types

```graphql
input TripPlannerInput {
  from: String!                    # Origin stop ID
  to: String!                      # Destination stop ID
  fromLat: Float                   # Alternative: origin latitude
  fromLng: Float                   # Alternative: origin longitude
  toLat: Float                     # Alternative: dest latitude
  toLng: Float                     # Alternative: dest longitude
  excludedModes: [Int]             # Mode IDs to exclude (e.g., [11] = school bus)
  opalType: String                 # "adult", "child", "concession", "senior"
  travelMode: String               # "", "public", etc.
  tripMode: String                 # "public", "cycle", etc.
  typeOrigin: String               # "", "stop", "coord"
  typeDestination: String          # "", "stop", "coord"
  earlyDates: [String]             # For earlier trips
  laterDates: [String]             # For later trips
  filters: TripFilters
  preferences: TripPreferences
}

input TripFilters {
  includedJourneys: [String]
  onlyAccessible: Boolean
  onlyOpal: Boolean
}

input TripPreferences {
  tripPreference: String           # "leasttime", "leastwalking", "leastchanges"
  walkSpeed: String                # "slow", "normal", "fast"
  cycleSpeed: Int                  # km/h
  gettingFromMode: Int             # Walk speed percentage
  gettingFromValue: Int            # Max walk time (minutes)
  gettingToMode: Int
  gettingToValue: Int
}
```

### Output Types

```graphql
type TripOption {
  id: String!
  duration: Int!                   # Minutes
  departureTime: String!           # ISO 8601 UTC
  arrivalTime: String!
  departureTimezone: String!       # "Australia/Sydney"
  arrivalTimezone: String!
  isFirstLegPT: Boolean!           # First leg is public transport
  isWalkOnly: Boolean!
  isCycleOnly: Boolean!
  isTaxiOnly: Boolean!
  firstPTDepartureTime: String
  firstPTOriginName: String
  departingStop: String            # Platform name
  hasAlertMessages: Boolean!
  cycleProfile: String
  isRealTime: Boolean!
  departureStatus: String          # "on-time", "late", "early"
  timeDifference: String           # "0", "5 min", etc.
  headSign: String                 # Service destination
  legs: [TripOptionLeg!]!
  isAccessible: Boolean!
  geoJSONLine: GeoJSON             # Pre-rendered map line
  geoJSONStops: GeoJSON            # Stop markers
  geoJSONMarkers: GeoJSON          # Other markers
}

type TripOptionLeg {
  id: String!
  departureStatus: String
  timeDifference: String
  duration: Int!                   # Minutes
  distance: Int                    # Meters
  mode: Int!                       # Mode code
  network: Int                     # Network ID
  routeNumber: String              # "M1", "T8", "333"
  isRealTime: Boolean!
  backgroundColour: String         # Route color (hex)
  foregroundColour: String
  textColour: String
  origin: BasicLocation!
  destination: BasicLocation!
  stopSequence: [BasicLocation]    # All stops on this leg
  fares: [TripFare]                # PER-LEG FARES! 🎯
  transportation: TripTransportation
  alerts: [BasicAlert]
  properties: TripLegProperties
  coordinates: [[Float]]           # Route polyline
  boundingBox: [Float]
  serviceDirection: String
  isBookingRequired: Boolean
  isAccessible: Boolean
  headSign: String
  diffDepEstScheduled: String      # Delay as human string
  departureTime: String
  arrivalTime: String
  occupancy: String                # "MANY_SEATS_AVAILABLE", etc.
}

type TripFare {
  type: Int!                       # 1=Adult, 2=Child, 3=Concession, 4=Senior
  amount: Float!                   # Price in AUD
  stationAccessFee: Float          # Airport station fee
}

type TripTransportation {
  id: String
  routeNumber: String
  serviceDirection: String
  headSign: String
  fareType: String                 # "OPAL_TRAIN", "OPAL_LIGHT_RAIL", "OPAL_BUS"
  bookingInfo: BookingInfo
  network: IdName
  mode: IdName
  operator: IdName
  colour: RouteColour
  realtimeTripId: String           # 🎯 GTFS trip_id for vehicle matching!
  destination: BasicDestination
}

type BasicLocation {
  id: String!
  name: String!
  type: String!                    # "platform", "stop", "locality"
  modes: [Int]
  locality: Locality
  coordinates: [Float]             # [lng, lat] - NOTE: GeoJSON order!
  parent: Locality
  properties: TripLocationProperties
  matchQuality: Float
  isBest: Boolean
  localTimezone: String
  departureTimeEstimated: String
  departureTimeScheduled: String
  arrivalTimeEstimated: String
  arrivalTimeScheduled: String
}

type TripLocationProperties {
  wheelchairAccess: Boolean
  numberOfCars: Int                # Train consist size
  travelInCarsFrom: Int
  travelInCarsTo: Int
  realtimeStatus: [String]
  occupancy: String                # "MANY_SEATS_AVAILABLE", "FEW_SEATS_AVAILABLE"
}

type BasicAlert {
  id: String!
  type: String                     # "stopInfo", "lineInfo", "bannerInfo"
  priority: String                 # "normal", "high", "veryHigh"
  content: String                  # Alert description
  urlText: String
  url: String
  announcementType: String
  subtitle: String
  timestamps: AlertTimestamps
}
```

---

## 4. Data Comparison: REST vs GraphQL

### Side-by-Side Comparison (Same Origin/Destination)

| Data Field | REST API (`/v1/tp/trip`) | GraphQL API | Notes |
|------------|--------------------------|-------------|-------|
| **Fare Amount** | ❌ `tickets: []` | ✅ `$6.20 adult` | **Critical difference** |
| **Fare Types** | ❌ Not returned | ✅ Adult/Child/Concession/Senior | Per-leg breakdown |
| **Station Access Fee** | ❌ N/A | ✅ `stationAccessFee: 0` | For airport stations |
| **Realtime Trip ID** | ❌ Not exposed | ✅ `realtimeTripId: "0177-001-104-012:1000"` | **For vehicle matching** |
| **Occupancy (per stop)** | ✅ `"MANY_SEATS"` | ✅ `"MANY_SEATS_AVAILABLE"` | Different format |
| **GeoJSON** | ❌ Raw coords only | ✅ Pre-rendered FeatureCollection | Map-ready |
| **Route Colors** | ❌ Not included | ✅ `backgroundColour`, `foregroundColour` | Hex colors |
| **Delay String** | ❌ Calculate manually | ✅ `"5 min"`, `"on-time"` | Pre-formatted |
| **Travel in Cars** | ✅ In `origin.properties` | ✅ In `properties` | Same data |
| **Alerts** | ✅ In `infos[]` | ✅ In `alerts[]` | Same data |
| **Stop Sequence** | ✅ Full list | ✅ Full list with occupancy | GraphQL has per-stop occupancy |

### Key Differences Summary

1. **Fares**: Only available via GraphQL
2. **realtimeTripId**: Only via GraphQL - enables direct vehicle position matching
3. **Pre-rendered UI data**: GraphQL returns colors, formatted delays, GeoJSON
4. **Occupancy format**: REST uses `"MANY_SEATS"`, GraphQL uses `"MANY_SEATS_AVAILABLE"`

---

## 5. Vehicle Position Matching

### The `realtimeTripId` Field

The GraphQL response includes `transportation.realtimeTripId` which matches the GTFS `trip_id` in vehicle positions:

```json
// GraphQL Response
"transportation": {
  "realtimeTripId": "0177-001-104-012:1000",
  ...
}
```

```protobuf
// Vehicle Position Feed
entity {
  vehicle {
    trip {
      trip_id: "0177-001-104-012:1000"  // MATCHES!
      route_id: "SMNW_M1"
    }
  }
}
```

### Matching Strategy with GraphQL

```typescript
async function findVehicleForLeg(
  leg: GraphQLLeg,
  vehiclePositions: Map<TfnswFeed, VehiclePosition[]>
): Promise<VehiclePosition | null> {
  const realtimeTripId = leg.transportation?.realtimeTripId;
  
  if (realtimeTripId) {
    // Direct match using GraphQL-provided trip ID
    for (const positions of vehiclePositions.values()) {
      const match = positions.find(p => p.trip?.tripId === realtimeTripId);
      if (match) return match;
    }
  }
  
  // Fallback to route + time matching (same as REST API)
  return fallbackRouteTimeMatch(leg, vehiclePositions);
}
```

### Advantage Over REST API

The REST API's `transportation.id` (e.g., `"nsw:030M1: :R:sj2"`) does NOT directly match GTFS trip IDs. The GraphQL API solves this by exposing the actual `realtimeTripId`.

---

## 6. Fare Data Analysis

### Fare Structure in GraphQL

Each leg includes a `fares` array with multiple fare types:

```json
"fares": [
  { "type": 1, "amount": 6.20, "stationAccessFee": 0 },  // Adult
  { "type": 2, "amount": 3.10, "stationAccessFee": 0 },  // Child
  { "type": 3, "amount": 3.10, "stationAccessFee": 0 },  // Concession
  { "type": 4, "amount": 2.50, "stationAccessFee": 0 }   // Senior
]
```

### Fare Type Mapping

| Type | Name | Discount |
|------|------|----------|
| 1 | Adult | Full price |
| 2 | Child | ~50% off |
| 3 | Concession | ~50% off |
| 4 | Senior | ~60% off + daily cap |

### Calculating Total Trip Fare

```typescript
function calculateTripFare(legs: GraphQLLeg[], fareType: number = 1): number {
  let total = 0;
  let stationAccessFee = 0;
  
  for (const leg of legs) {
    if (!leg.fares) continue;
    
    const fare = leg.fares.find(f => f.type === fareType);
    if (fare) {
      total += fare.amount;
      stationAccessFee = Math.max(stationAccessFee, fare.stationAccessFee || 0);
    }
  }
  
  // Station access fee is charged once per journey
  return total + stationAccessFee;
}
```

### Example: Epping to UNSW

| Leg | Mode | Adult Fare | Notes |
|-----|------|------------|-------|
| Epping → Central | Metro M1 | $6.20 | |
| Central walk | Transfer | $0.00 | Free transfer |
| Central → UNSW | Light Rail L3 | $2.49 | |
| **Total** | | **$8.69** | |

---

## 7. Occupancy Data Analysis

### Occupancy in GraphQL

The GraphQL API returns occupancy at two levels:

1. **Leg-level**: `leg.occupancy` - Overall vehicle occupancy
2. **Stop-level**: `stopSequence[].properties.occupancy` - Occupancy at each stop

```json
"stopSequence": [
  {
    "name": "Epping Station",
    "properties": {
      "occupancy": "MANY_SEATS_AVAILABLE"
    }
  },
  {
    "name": "Macquarie University Station", 
    "properties": {
      "occupancy": "MANY_SEATS_AVAILABLE"
    }
  }
]
```

### Occupancy Values Comparison

| GraphQL Value | REST API Value | UI Display |
|--------------|----------------|------------|
| `"MANY_SEATS_AVAILABLE"` | `"MANY_SEATS"` | 🟢 Plenty of seats |
| `"FEW_SEATS_AVAILABLE"` | `"FEW_SEATS"` | 🟡 Limited seats |
| `"STANDING_ROOM_ONLY"` | `"STANDING_ROOM"` | 🟠 Standing only |
| `null` | (not present) | ⚪ No data |

### UI Implementation

```typescript
function getOccupancyDisplay(occupancy: string | null): { icon: string; text: string; color: string } {
  const normalized = occupancy?.replace('_AVAILABLE', '').toUpperCase();
  
  switch (normalized) {
    case 'MANY_SEATS':
      return { icon: '🟢', text: 'Plenty of seats', color: '#22c55e' };
    case 'FEW_SEATS':
      return { icon: '🟡', text: 'Limited seats', color: '#eab308' };
    case 'STANDING_ROOM_ONLY':
      return { icon: '🟠', text: 'Standing room', color: '#f97316' };
    case 'FULL':
      return { icon: '🔴', text: 'Full', color: '#ef4444' };
    default:
      return { icon: '⚪', text: '', color: '#9ca3af' };
  }
}
```

---

## 8. Stability & Risk Assessment

### Risk Factors

| Risk | Severity | Mitigation |
|------|----------|------------|
| **API changes without notice** | High | Graceful degradation, version detection |
| **Rate limiting** | Medium | Caching, backoff strategy |
| **Endpoint unavailability** | Medium | Fallback to REST API |
| **Legal/ToS concerns** | Low-Medium | No authentication bypass, public data |
| **Schema changes** | Medium | Defensive parsing, optional fields |

### Stability Indicators

**Positive:**
- Used by production TfNSW website
- Consistent schema over observation period
- No authentication required (public intent)
- GraphQL introspection may be available

**Negative:**
- No official documentation
- No versioning guarantees
- No SLA or support
- Could be blocked by User-Agent or origin checks

### Recommended Safeguards

```typescript
class GraphQLClient {
  private static readonly TIMEOUT_MS = 5000;
  private static readonly MAX_RETRIES = 2;
  private static lastError: Date | null = null;
  private static errorCount = 0;
  
  async fetchTripOptions(input: TripInput): Promise<GraphQLResponse | null> {
    // Circuit breaker: Skip if too many recent errors
    if (this.errorCount > 5 && this.lastError && 
        Date.now() - this.lastError.getTime() < 60000) {
      console.warn('[GraphQL] Circuit breaker open, skipping request');
      return null;
    }
    
    try {
      const response = await fetch('https://transportnsw.info/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: 'TripOptions', query: QUERY, variables: { input } }),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });
      
      if (!response.ok) {
        throw new Error(`GraphQL error: ${response.status}`);
      }
      
      this.errorCount = 0;
      return await response.json();
    } catch (error) {
      this.lastError = new Date();
      this.errorCount++;
      console.error('[GraphQL] Request failed:', error);
      return null;
    }
  }
}
```

---

## 9. Integration Strategy Options

### Option A: GraphQL Only (NOT RECOMMENDED)

Replace REST API entirely with GraphQL.

**Pros:**
- Single data source
- All data available

**Cons:**
- ❌ High risk - unofficial API
- ❌ No fallback if GraphQL breaks
- ❌ Potentially slower (larger responses)

### Option B: REST Primary + GraphQL Enrichment (RECOMMENDED)

Use REST API as primary, fetch GraphQL only for fare data.

**Pros:**
- ✅ Stable foundation (official API)
- ✅ Graceful degradation
- ✅ Only fetches GraphQL when needed

**Cons:**
- Two API calls
- Need to correlate data

**Implementation:**
```typescript
async function planTrip(from: string, to: string, options: TripOptions): Promise<EnrichedJourney[]> {
  // 1. Fetch from stable REST API
  const restResponse = await fetchFromRestApi(from, to, options);
  
  // 2. Attempt GraphQL enrichment (non-blocking)
  const graphqlResponse = await graphqlClient.fetchTripOptions({
    from, to, opalType: options.fareType || 'adult'
  }).catch(() => null);
  
  // 3. Merge fare data if available
  if (graphqlResponse?.data?.widgets?.tripOptions) {
    return enrichWithFares(restResponse.journeys, graphqlResponse.data.widgets.tripOptions);
  }
  
  // 4. Return REST data without fares if GraphQL failed
  return restResponse.journeys.map(j => ({ ...j, fare: null }));
}
```

### Option C: GraphQL for Fares Only, Separate Call

Dedicated fare lookup after REST trip planning.

**Pros:**
- Cleanest separation
- Can cache fare lookups

**Cons:**
- Extra latency
- Need journey ID correlation

### Option D: Hybrid with Feature Flags

Use configuration to toggle GraphQL usage.

**Pros:**
- ✅ Quick disable if issues arise
- ✅ A/B testing possible

**Implementation:**
```typescript
const USE_GRAPHQL_FARES = process.env.ENABLE_GRAPHQL_FARES === 'true';
```

---

## 10. Recommendation & Decision

### Decision: **Option B - REST Primary + GraphQL Enrichment**

### Justification

1. **Fare data is high-value**: Users expect to see trip costs. The REST API's broken fare response makes GraphQL the only option.

2. **Risk is manageable**: With proper fallback, GraphQL failures don't break core functionality.

3. **realtimeTripId is valuable**: Enables reliable vehicle position matching, improving real-time features.

4. **Low implementation complexity**: Single enrichment call after REST response.

5. **User experience priority**: Showing "Price unavailable" is acceptable; breaking trip planning is not.

### Fallback Behavior

| GraphQL Status | Fare Display | Vehicle Matching |
|----------------|--------------|------------------|
| ✅ Success | Show fares | Use realtimeTripId |
| ⚠️ Timeout | "Price unavailable" | Fallback to route+time |
| ❌ Error | "Price unavailable" | Fallback to route+time |
| 🔴 Circuit open | "Price unavailable" | Fallback to route+time |

---

## 11. Implementation Plan

### Phase 1: GraphQL Client (Backend)

**File:** `backend/src/lib/tfnsw-graphql-client.ts`

```typescript
const TRIP_OPTIONS_QUERY = `
query TripOptions($input: TripPlannerInput!) {
  widgets {
    tripOptions(input: $input) {
      id
      legs {
        fares {
          type
          amount
          stationAccessFee
        }
        transportation {
          realtimeTripId
        }
      }
    }
  }
}
`;

export async function fetchGraphQLFares(
  from: string,
  to: string,
  opalType: string = 'adult'
): Promise<Map<string, LegFare[]> | null> {
  // Implementation with circuit breaker
}
```

### Phase 2: Fare Enrichment

**File:** `backend/src/lib/fare-enricher.ts`

```typescript
export function enrichJourneyWithFares(
  journey: Journey,
  graphqlTrips: GraphQLTripOption[]
): JourneyWithFares {
  // Match by departure time + duration
  const matchingTrip = graphqlTrips.find(t => 
    t.departureTime === journey.legs[0]?.origin?.departureTimePlanned &&
    t.duration === Math.round(journey.duration / 60)
  );
  
  if (!matchingTrip) {
    return { ...journey, fare: null };
  }
  
  const totalFare = matchingTrip.legs.reduce((sum, leg) => {
    const adultFare = leg.fares?.find(f => f.type === 1);
    return sum + (adultFare?.amount || 0);
  }, 0);
  
  return {
    ...journey,
    fare: {
      adult: totalFare,
      child: calculateFareByType(matchingTrip, 2),
      concession: calculateFareByType(matchingTrip, 3),
      senior: calculateFareByType(matchingTrip, 4),
      source: 'graphql',
    },
  };
}
```

### Phase 3: API Response Update

**File:** `backend/src/api/trips.ts`

```typescript
// Add fare to response
const enrichedJourneys = await Promise.all(
  rankedJourneys.map(async (journey) => {
    const withFares = await enrichWithGraphQLFares(journey, from, to);
    return withFares;
  })
);
```

### Phase 4: Mobile UI

```typescript
// Show fare in trip card
{journey.fare ? (
  <Text style={styles.fare}>${journey.fare.adult.toFixed(2)}</Text>
) : (
  <Text style={styles.fareUnavailable}>Price unavailable</Text>
)}
```

### Phase 5: Vehicle Position Matching

```typescript
// Use realtimeTripId when available
function findVehicleForLeg(leg: Leg, graphqlLeg?: GraphQLLeg): VehiclePosition | null {
  const tripId = graphqlLeg?.transportation?.realtimeTripId || extractTripIdFallback(leg);
  return findVehicleByTripId(tripId);
}
```

---

## Summary

| Question | Answer |
|----------|--------|
| **Should we use GraphQL?** | Yes, for fare data enrichment |
| **Primary API?** | REST (`api.transport.nsw.gov.au`) |
| **GraphQL role?** | Secondary enrichment source |
| **Failure handling?** | Graceful degradation, circuit breaker |
| **Risk level?** | Acceptable with safeguards |
| **Implementation effort?** | Medium (1-2 days) |

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/tfnsw-graphql-client.ts` | Create | GraphQL client with circuit breaker |
| `lib/fare-enricher.ts` | Create | Merge fare data into journeys |
| `api/trips.ts` | Modify | Add fare enrichment step |
| `types/trip-planner.ts` | Modify | Add fare types |
| `.env` | Modify | Add `ENABLE_GRAPHQL_FARES` flag |

---

*Report generated for Bilby Project - January 2026*
