# TfNSW Trip Planner API - Comprehensive Report for Bilby

**Version:** 10.6.21.17  
**Base URL:** `https://api.transport.nsw.gov.au/v1/tp`  
**Last Updated:** January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [API Endpoints Overview](#2-api-endpoints-overview)
3. [Common Parameters & Conventions](#3-common-parameters--conventions)
4. [Stop Finder API (`/stop_finder`)](#4-stop-finder-api-stop_finder)
5. [Trip Planner API (`/trip`)](#5-trip-planner-api-trip)
6. [Departure Monitor API (`/departure_mon`)](#6-departure-monitor-api-departure_mon)
7. [Service Alert API (`/add_info`)](#7-service-alert-api-add_info)
8. [Coordinate Request API (`/coord`)](#8-coordinate-request-api-coord)
9. [Current Bilby Implementation Analysis](#9-current-bilby-implementation-analysis)
10. [Recommendations & Implementation Plan](#10-recommendations--implementation-plan)
11. [iOS Live Activity Data Strategy](#11-ios-live-activity-data-strategy)
12. [UX Data Display Recommendations](#12-ux-data-display-recommendations)
13. [API Requests Needed](#13-api-requests-needed)

---

## 1. Executive Summary

The TfNSW Trip Planner API provides comprehensive public transport data for NSW through five main endpoints:

| Endpoint | Purpose | Bilby Usage |
|----------|---------|-------------|
| `/stop_finder` | Search/lookup stops, addresses, POIs | ✅ Used for stop search |
| `/trip` | Journey planning between locations | ✅ Used for trip planning |
| `/departure_mon` | Live departure board for stops | ✅ Used for departures |
| `/add_info` | Service alerts and disruptions | ✅ Used for disruptions |
| `/coord` | Find nearby stops/POIs by coordinate | ✅ Used for nearby stops |

### Key Findings

1. **The `/add_info` endpoint CAN replace GTFS Realtime Alerts** - It provides equivalent (and often richer) data including affected stops/lines, validity periods, and priority levels. **Confirmed: Line-specific filtering works correctly.**

2. **Opal fares are NOT returned by the stable API** - Testing confirms `fare.tickets: []` is returned even with `TfNSWTR=true`. This appears to be an API provider issue. **Alternative:** The TfNSW frontend GraphQL API (`transportnsw.info/api/graphql`) DOES return fare data - see GraphQL analysis report.

3. **Real-time data** is available via `departureTimeEstimated`/`arrivalTimeEstimated` fields when `TfNSWTR=true` is set.

4. **Travel in Cars data** is available for train journeys in `origin.properties` (NOT in a separate `onwardsLocation` struct). Contains `NumberOfCars`, `TravelInCarsFrom`, `TravelInCarsTo`, `TravelInCarsMessage`.

5. **Occupancy data** is available in `origin.properties.occupancy` and `destination.properties.occupancy` with values like `"MANY_SEATS"`, `"FEW_SEATS"`, etc.

6. **Times are returned in UTC** (ISO 8601 with `Z` suffix) - Client must convert to Sydney timezone.

---

## 2. API Endpoints Overview

### Authentication

All requests require an API key in the Authorization header:
```
Authorization: apikey YOUR_API_KEY
```

### Response Format

All responses are JSON when `outputFormat=rapidJSON` is set. Key response properties:
- `version`: API version string (e.g., "10.6.21.17")
- `error`: Error object if request failed
- Endpoint-specific data arrays/objects

### Mode Codes (Product Class)

| Code | Mode | Icon IDs |
|------|------|----------|
| 1 | Train | 1 (Sydney), 2 (Intercity), 3 (Regional), 19 (Temporary) |
| 2 | Metro | 24 |
| 4 | Light Rail | 13 (Sydney), 20 (Temporary), 21 (Newcastle) |
| 5 | Bus | 4, 5, 6, 9, 14, 15, 23 (On Demand), 31-38 (Regional) |
| 7 | Coach | 7, 17, 22 |
| 9 | Ferry | 10 (Sydney), 11 (Newcastle), 12 (Private), 18 (Temporary) |
| 11 | School Bus | 8 |
| 99/100 | Walking | - |
| 107 | Cycling | - |

---

## 3. Common Parameters & Conventions

### Required for All Requests

```typescript
const COMMON_PARAMS = {
  outputFormat: 'rapidJSON',        // Required for JSON output
  coordOutputFormat: 'EPSG:4326',   // Standard lat/lng format
  version: '10.6.21.17',            // API version (optional but recommended)
}
```

### Coordinate Format

**Important:** TfNSW uses `LONGITUDE:LATITUDE:EPSG:4326` format (longitude first!):
```
// Example: Central Station at (-33.8840, 151.2063)
coord: '151.206290:-33.884080:EPSG:4326'
```

### Date/Time Format

- **Request:** `itdDate=YYYYMMDD` and `itdTime=HHMM` (24-hour)
- **Response:** ISO 8601 with UTC timezone: `2026-01-14T00:14:36Z`

### Location Types

| Type | Description |
|------|-------------|
| `stop` | Station or stop (has `modes` array) |
| `platform` | Specific platform within a station |
| `poi` | Point of interest |
| `singlehouse` | Street address |
| `street` | Street |
| `locality` | Suburb/locality |
| `suburb` | Suburb |

---

## 4. Stop Finder API (`/stop_finder`)

### Purpose
Search for stops, addresses, and places of interest by name or ID.

### Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name_sf` | string | ✅ | Search query or stop ID |
| `type_sf` | enum | ✅ | `any`, `stop`, `coord`, `poi` |
| `TfNSWSF` | string | ⚠️ | Set to `true` for TfNSW-specific features |
| `odvSugMacro` | int | - | Set to `1` for auto-complete mode |
| `anyMaxSizeHitList` | int | - | Limit results (default: 10) |

### Response Structure

```typescript
interface StopFinderResponse {
  version: string;
  locations: StopLocation[];
  error?: ApiError;
}

interface StopLocation {
  id: string;                    // Use for trip planning
  name: string;                  // Full name with suburb
  disassembledName: string;      // Short name
  type: LocationType;
  coord: [number, number];       // [lat, lng]
  modes?: number[];              // Transport modes serving this stop
  parent?: ParentLocation;       // Parent stop/station
  matchQuality: number;          // Match score (higher = better)
  isBest: boolean;               // True for best match
  properties?: {
    STOP_GLOBAL_ID?: string;
    // ... other properties
  };
}
```

### Key Data Points for Bilby

- **`id`**: Use this for trip planning requests
- **`modes`**: Show transport mode icons (train, bus, etc.)
- **`matchQuality` + `isBest`**: Sort/highlight results
- **`parent`**: For platforms, get parent station info
- **`coord`**: For map display

### Current Implementation Analysis

✅ **Correctly implemented in `tfnsw-tp-client.ts`:**
- Uses `type_sf: 'any'` for general search
- Sets `TfNSWSF: 'true'` and `odvSugMacro: '1'`
- Returns mapped `StopSearchResult` objects

⚠️ **Potential improvements:**
- Could add `anyMaxSizeHitList` parameter to options
- Could expose `type_sf` parameter for specialized searches

---

## 5. Trip Planner API (`/trip`)

### Purpose
Find journey options between two locations with comprehensive detail.

### Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name_origin` | string | ✅ | Origin stop ID or coord |
| `type_origin` | enum | ✅ | `any` or `coord` |
| `name_destination` | string | ✅ | Destination stop ID or coord |
| `type_destination` | enum | ✅ | `any` or `coord` |
| `itdDate` | string | - | Date (YYYYMMDD) |
| `itdTime` | string | - | Time (HHMM, 24-hour) |
| `depArrMacro` | enum | ✅ | `dep` (depart after) or `arr` (arrive by) |
| `TfNSWTR` | string | ⚠️ | Set to `true` for realtime + fares |
| `calcNumberOfTrips` | int | - | Max journeys to return (default: 6) |
| `wheelchair` | string | - | `on` for accessible-only trips |

### Response Structure

```typescript
interface TripResponse {
  version: string;
  journeys: Journey[];
  systemMessages?: { responseMessages: Message[] };
  error?: ApiError;
}

interface Journey {
  isAdditional: boolean;
  interchanges: number;           // Number of transfers
  legs: Leg[];
  fare?: {
    tickets: FareTicket[];
    zones?: FareZone[];
  };
}

interface Leg {
  duration: number;               // Seconds
  distance?: number;              // Meters
  isRealtimeControlled: boolean;  // Has realtime data
  origin: LegLocation;
  destination: LegLocation;
  transportation?: Transportation;
  stopSequence?: StopSequenceItem[];  // All stops on this leg
  coords?: [number, number][];    // Route polyline
  infos?: ServiceAlert[];         // Alerts for this leg
  hints?: { infoText: string }[]; // Travel hints
  properties?: {
    PlanLowFloorVehicle?: string;    // "1" if low floor
    PlanWheelChairAccess?: string;   // "1" if accessible
    vehicleAccess?: string[];
  };
}

interface LegLocation {
  id: string;
  name: string;
  disassembledName: string;
  type: LocationType;
  coord: [number, number];
  parent?: ParentLocation;
  departureTimePlanned?: string;      // Scheduled time
  departureTimeEstimated?: string;    // Realtime estimate (if available)
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  properties?: {
    WheelchairAccess?: string;        // "true" or "false"
    platform?: string;                 // Platform identifier (e.g., "EPG1")
    platformName?: string;             // Human-readable (e.g., "Platform 1")
    // Train-specific (Travel in Cars) - IN ORIGIN PROPERTIES:
    NumberOfCars?: string;             // Total carriages (e.g., "10")
    TravelInCarsFrom?: string;         // First recommended car (e.g., "1")
    TravelInCarsTo?: string;           // Last recommended car (e.g., "10")
    TravelInCarsMessage?: string;      // e.g., "any", "last 4", "first 6"
    // Occupancy data:
    occupancy?: string;                // "MANY_SEATS", "FEW_SEATS", "STANDING_ROOM", etc.
  };
}

interface Transportation {
  id: string;
  name: string;                       // Full route name
  disassembledName: string;           // Short name
  number: string;                     // Route number (e.g., "T8", "333")
  iconId: number;                     // For icon selection
  description?: string;
  product: {
    class: number;                    // Mode code (1=train, 5=bus, etc.)
    name: string;
    iconId: number;
  };
  destination: {
    id?: string;
    name: string;                     // Destination headsign
  };
  operator?: {
    id: string;
    name: string;
  };
}

interface FareTicket {
  id?: string;
  name?: string;
  person: string;                     // "ADULT", "CHILD", etc.
  priceBrutto: number;                // Total price
  fromLeg?: number;
  toLeg?: number;
  properties?: {
    evaluationTicket?: string;        // "nswFareEnabled", "nswFarePartiallyEnabled", etc.
    priceTotalFare?: number;
    priceStationAccessFee?: number;   // Airport station fee
    riderCategoryName?: string;
  };
}
```

### Key Data Points for Bilby

1. **Journey Selection:**
   - `interchanges`: Number of transfers
   - `legs[].duration`: Total trip time
   - `fare.tickets[].priceBrutto`: Trip cost

2. **Realtime Status:**
   - `departureTimeEstimated` vs `departureTimePlanned`: Calculate delay
   - `isRealtimeControlled`: Whether realtime data is available

3. **Platform/Stop Info:**
   - `origin.properties.platform`: Platform number
   - `origin.properties.TravelInCarsMessage`: Carriage guidance for trains

4. **Route Display:**
   - `transportation.number`: Route number (T8, 333, etc.)
   - `transportation.product.class`: Mode icon
   - `transportation.destination.name`: Service destination headsign

5. **Accessibility:**
   - `properties.PlanWheelChairAccess`: Vehicle accessibility
   - `origin.properties.WheelchairAccess`: Stop accessibility

6. **Map Display:**
   - `coords`: Polyline for map route
   - `stopSequence`: All stops with coordinates

### Current Implementation Analysis

✅ **Correctly implemented:**
- Handles both stop IDs and coordinates
- Sets `TfNSWTR: 'true'` for realtime
- Uses `depArrMacro` for arrive-by logic
- Passes accessibility option

⚠️ **Issues/Improvements:**

1. **Fares not being returned**: The stable Trip Planner API returns `fare.tickets: []` regardless of parameters. This is an API provider issue. **Workaround:** Use the TfNSW frontend GraphQL API to fetch fare data and merge it with stable API responses.

2. **Missing parameters that could be useful:**
   - `excludedMeans` / `exclMOT_X`: Exclude specific modes
   - `inclMOT_X`: Include specific modes only
   - `useProxFootSearch`: Enable walking distance from coordinates

3. **`calcNumberOfTrips`**: Currently hardcoded to 6. Could make configurable.

4. **Occupancy data**: The API returns `occupancy` in `origin.properties` and `destination.properties` for legs. Values observed: `"MANY_SEATS"`. This should be displayed in the UI with appropriate icons.

---

## 6. Departure Monitor API (`/departure_mon`)

### Purpose
Get upcoming departures from a specific stop.

### Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name_dm` | string | ✅ | Stop ID or search term |
| `type_dm` | enum | ✅ | `stop`, `platform`, `any` |
| `mode` | string | ⚠️ | `direct` for immediate results |
| `TfNSWDM` | string | ⚠️ | Set to `true` for realtime + TfNSW features |
| `departureMonitorMacro` | string | - | Set to `true` for enhanced features |
| `itdDate` | string | - | Date (YYYYMMDD) |
| `itdTime` | string | - | Time (HHMM) |
| `nameKey_dm` | string | - | `$USEPOINT$` for platform-specific |
| `excludedMeans` | string | - | Exclude modes (`checkbox` + `exclMOT_X`) |

### Response Structure

```typescript
interface DepartureMonitorResponse {
  version: string;
  locations: StopLocation[];      // Matched stops (should be 1 for direct mode)
  stopEvents: StopEvent[];        // Departures
  error?: ApiError;
}

interface StopEvent {
  location: {
    id: string;
    name: string;
    type: LocationType;
    coord: [number, number];
    parent?: ParentLocation;
    properties: {
      stopId?: string;
      platform?: string;          // e.g., "PDH4" (Pendle Hill Platform 4)
      platformName?: string;
      // ... other properties
    };
  };
  departureTimePlanned: string;
  departureTimeEstimated?: string;   // Realtime (if available)
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  isRealtimeControlled?: boolean;
  transportation: Transportation;    // Same as trip response
  infos?: ServiceAlert[];            // Alerts for this service
  onwardLocations?: OnwardLocation[]; // Future stops with Travel in Cars data
}

interface OnwardLocation {
  id: string;
  name: string;
  disassembledName: string;
  arrivalTimePlanned: string;
  arrivalTimeEstimated?: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  properties?: {
    // Note: Travel in Cars data for /trip endpoint is in origin.properties, NOT onwardLocations
    // onwardLocations is primarily for /departure_mon endpoint
    stoppingPointPlanned?: string;
    platform?: string;
    platformName?: string;
  };
}
```

### Key Data Points for Bilby

1. **Departure Countdown:**
   - `departureTimeEstimated` (preferred) or `departureTimePlanned`
   - Calculate minutes until departure

2. **Service Identification:**
   - `transportation.number`: Route number
   - `transportation.destination.name`: Where it's going
   - `transportation.product.class`: Mode for icon

3. **Platform Information:**
   - `location.properties.platform`: Platform code
   - Parse format: "PDH4" = station code + platform number

4. **Realtime Status:**
   - `isRealtimeControlled`: Has realtime data
   - Compare planned vs estimated for delay

5. **Train Carriage Guidance:**
   - For `/trip`: `leg.origin.properties.TravelInCarsMessage` (in the origin of each leg)
   - For `/departure_mon`: `onwardLocations[].properties.travelInCarsMessage`

### Platform Field Interpretation

From developer discussions:
- **Trains**: Station 3-letter code + platform number (e.g., "PDH4")
- **Buses at major interchanges**: Stand letter (e.g., "K")
- **Minor bus stops**: Often "X1" (generic)
- **Light Rail**: "LR1", "LR2", etc.
- **Exception**: Some stations use "P1", "P2" format

### Current Implementation Analysis

✅ **Correctly implemented:**
- Uses `mode: 'direct'` for immediate results
- Sets `TfNSWDM: 'true'` for realtime
- Supports platform-specific queries via `nameKey_dm`

⚠️ **Potential improvements:**
- Could expose mode filtering via `excludedMeans`
- Could fetch `onwardLocations` for train carriage guidance

---

## 7. Service Alert API (`/add_info`)

### Purpose
Retrieve service alerts and disruption information.

### Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filterDateValid` | string | - | Date filter (DD-MM-YYYY) |
| `filterPublicationStatus` | enum | - | `current` for active alerts only |
| `filterMOTType` | int | - | Mode filter (can repeat for multiple) |
| `itdLPxx_selStop` | string | - | Filter by stop ID |
| `itdLPxx_selLine` | string | - | Filter by line ID |
| `itdLPxx_selOperator` | string | - | Filter by operator ID |

### Response Structure

```typescript
interface AddInfoResponse {
  version: string;
  timestamp: string;
  infos: {
    current: Alert[];              // Active alerts
    historic?: Alert[];            // Past alerts (if requested)
    affected: {
      stops: AffectedStop[];       // Aggregate of all affected stops
      lines: AffectedLine[];       // Aggregate of all affected lines
    };
  };
  error?: ApiError;
}

interface Alert {
  id: string;
  version: number;
  type: AlertType;                 // "routeInfo", "stopInfo", "lineInfo", "bannerInfo", "stopBlocking", "infrastructure", "tripMessage"
  priority: Priority;              // "veryLow", "low", "normal", "high", "veryHigh"
  subtitle: string;                // Heading
  content: string;                 // Full description (may contain HTML)
  url?: string;                    // More info link
  urlText?: string;                // Link text
  timestamps: {
    creation: string;
    lastModification: string;
    availability?: { from: string; to: string };
    validity: Array<{ from: string; to: string }>;
  };
  affected: {
    lines: AffectedLine[];
    stops: AffectedStop[];
  };
  properties: {
    providerCode?: string;
    smsText?: string;              // Plain text summary
    speechText?: string;           // For TTS
    source?: { id: string; name: string };
    announcementType?: string;
    EquipmentReason?: string;      // For lift/escalator alerts
  };
}

type AlertType = 
  | 'routeInfo'      // Route-specific
  | 'stopInfo'       // Stop-specific
  | 'lineInfo'       // Line/journey specific
  | 'bannerInfo'     // High importance, network-wide
  | 'stopBlocking'   // Stop closure
  | 'infrastructure' // Lift/escalator outages
  | 'tripMessage';   // Trip-specific (e.g., not stopping at)
```

### Key Data Points for Bilby

1. **Alert Severity:**
   - `priority`: Map to UI severity (veryHigh/high = red, normal = orange, low = blue)
   - `type`: bannerInfo = show prominently

2. **Affected Services:**
   - `affected.lines`: Filter by route
   - `affected.stops`: Filter by stop

3. **Content Display:**
   - `subtitle`: Use as heading
   - `content`: Full detail (strip HTML if needed)
   - `properties.smsText`: Plain text alternative

4. **Validity:**
   - `timestamps.validity`: When the disruption is active
   - `timestamps.lastModification`: For "updated X ago"

### Replacing GTFS Realtime Alerts

**The `/add_info` endpoint can fully replace GTFS Realtime Alerts because:**

1. **Same data source**: Both originate from TfNSW's Incident Capture System

2. **Richer metadata**: `/add_info` provides:
   - Priority levels (not in GTFS)
   - Alert types (not in GTFS)
   - Validity periods
   - Affected lines AND stops (GTFS only has informed entities)
   - HTML content + plain text alternatives

3. **Simpler polling**: Single JSON endpoint vs protobuf parsing

**Implementation recommendation:**
```typescript
// Replace dual-source alerts with single add_info source
async function getAlerts(options: { modes?: number[]; stopId?: string }): Promise<Alert[]> {
  const params = {
    outputFormat: 'rapidJSON',
    coordOutputFormat: 'EPSG:4326',
    filterDateValid: formatDate(new Date()),
    filterPublicationStatus: 'current',
  };
  
  if (options.modes) {
    // Add filterMOTType for each mode
  }
  if (options.stopId) {
    params.itdLPxx_selStop = options.stopId;
  }
  
  // Fetch and return
}
```

### Current Implementation Analysis

⚠️ **Current issue:** Bilby uses BOTH GTFS alerts AND Trip Planner `/add_info`:
```typescript
// In disruptions.ts:
const [gtfsAlerts, tpAlerts] = await Promise.all([
  getAlerts('all'),
  getServiceAlerts({ modes: modeList, currentOnly: true }),
]);
```

**Recommendation:** Simplify to use only `/add_info` as the source of truth. The combining/deduplication logic adds complexity without benefit since the data sources are equivalent.

---

## 8. Coordinate Request API (`/coord`)

### Purpose
Find stops, POIs, or Opal resellers near a coordinate.

### Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `coord` | string | ✅ | `LONGITUDE:LATITUDE:EPSG:4326` |
| `inclFilter` | int | ✅ | Set to `1` for filter mode |
| `type_1` | enum | ✅ | `GIS_POINT`, `BUS_POINT`, `POI_POINT` |
| `radius_1` | int | ✅ | Search radius in meters |
| `inclDrawClasses_1` | int | - | `74` for Opal resellers |
| `PoisOnMapMacro` | string | - | Set to `true` |

### Response Structure

```typescript
interface CoordResponse {
  version: string;
  locations: CoordLocation[];
  error?: ApiError;
}

interface CoordLocation {
  id: string;
  name: string;
  disassembledName?: string;
  type: LocationType;             // "platform", "stop", "poi", "gis"
  coord: [number, number];
  parent?: ParentLocation;
  properties: {
    distance: string;             // Distance in meters (as string!)
    STOP_GLOBAL_ID?: string;
    STOP_NAME?: string;
    GIS_DRAW_CLASS?: string;      // For categorization
    POI_HIERARCHY_KEY?: string;   // POI category
    // ... many more
  };
}
```

### Key Data Points for Bilby

1. **Nearby Stops:**
   - Use `type_1: 'BUS_POINT'` for stops/stations
   - `properties.distance`: Sort by proximity

2. **Stop Identification:**
   - Filter by `GIS_DRAW_CLASS`:
     - `"StopArea"`: Bus stops
     - `"StopPoint"`: Train stations

### Current Implementation Analysis

⚠️ **Issue:** Current implementation only searches for `BUS_POINT`:
```typescript
type_1: 'BUS_POINT'
```

**Recommendation:** For a comprehensive "nearby stops" feature, either:
1. Make multiple requests for different types, or
2. Use `BUS_POINT` which includes all stop types (trains, buses, etc.)

---

## 9. Current Bilby Implementation Analysis

### Summary Table

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| **Trip Planner Client** | `tfnsw-tp-client.ts` | ✅ Good | Well-structured, covers main use cases |
| **Trips API** | `api/trips.ts` | ✅ Good | Proper coord handling, ranking integration |
| **Departures API** | `api/departures.ts` | ✅ Good | Clean implementation |
| **Stops API** | `api/stops.ts` | ✅ Good | Covers search, nearby, lookup |
| **Disruptions API** | `api/disruptions.ts` | ⚠️ Review | Dual-source complexity (GTFS + add_info) |
| **Live Activity Manager** | `live-activity-manager.ts` | ✅ Good | Comprehensive state management |

### Detailed Findings

#### ✅ What's Working Well

1. **Coordinate Handling**: Proper `LONGITUDE:LATITUDE:EPSG:4326` format in `planTripMixed()`
2. **Realtime Integration**: `TfNSWTR=true` / `TfNSWDM=true` correctly set
3. **Type Safety**: Zod schemas in `types/trip-planner.ts` match API responses
4. **Ranking Engine**: Clean separation of ranking logic in `lib/ranking.ts`
5. **Live Activity State**: Proper phase detection and progress calculation

#### ⚠️ Issues & Improvements

1. **Dual Alert Sources**
   - **Issue**: `disruptions.ts` fetches from BOTH GTFS and `/add_info`
   - **Fix**: Use only `/add_info` as source of truth

2. **Missing Fare Support**
   - **Issue**: `fare.tickets` returning empty despite `TfNSWTR=true`
   - **Investigation needed**: May need specific fare parameters

3. **Missing Travel in Cars Data Usage**
   - **Issue**: API returns `TravelInCarsMessage` but Bilby doesn't display it
   - **Opportunity**: Show "Travel in last 4 carriages" for trains

4. **Hardcoded Limits**
   - `calcNumberOfTrips: 6` - Could be configurable
   - `anyMaxSizeHitList` - Not exposed in stop search

5. **Missing `onwardLocations` for Departures**
   - **Issue**: Departure response includes future stops with realtime + carriage data
   - **Opportunity**: Display upcoming stops in departure detail view

---

## 10. Recommendations & Implementation Plan

### High Priority

#### 1. Simplify Alert Source (Remove GTFS Alerts)

**Files to modify:**
- `api/disruptions.ts`
- Potentially remove GTFS alerts poller

**Implementation:**
```typescript
// Before: Fetching from two sources and combining
const [gtfsAlerts, tpAlerts] = await Promise.all([
  getAlerts('all'),
  getServiceAlerts({ modes: modeList, currentOnly: true }),
]);
let combined = combineAlerts(gtfsAlerts ?? [], tpAlerts);

// After: Single source
const alerts = await getServiceAlerts({ modes: modeList, currentOnly: true });
const transformed = alerts.map(transformToAppFormat);
```

**Benefits:**
- Simpler code
- No deduplication needed
- Richer alert metadata available

#### 2. Add Travel in Cars Display

**Files to modify:**
- `types/trip-planner.ts` - Add interface
- `api/trips.ts` - Include in response
- Mobile: Journey detail screen

**Data location:**
```
journey.legs[].origin.properties.TravelInCarsMessage
```

**Display logic:**
- Only show for trains (`product.class === 1`)
- Only show when destination platform is shorter than train
- Message examples: "last 4", "first 6", "middle 4", "any"

#### 3. Investigate Fare Data

**See [Section 13](#13-api-requests-needed)** for API requests to test fare functionality.

### Medium Priority

#### 5. Add Mode Exclusion Support

Allow users to checkbox include/exclude one or more modes (e.g., "bus, metro, train, no ferry"; default all included):
```typescript
// Add to trip planning
if (excludedModes?.length) {
  params.excludedMeans = 'checkbox';
  for (const mode of excludedModes) {
    params[`exclMOT_${mode}`] = '1';
  }
}
```

### Low Priority

#### 6. Add Cycling Trip Support

For bike routes:
```typescript
params.cycleSpeed = 16;
params.computeMonomodalTripBicycle = 1;
params.maxTimeBicycle = 240;
params.onlyITBicycle = 1;
params.useElevationData = 1;
params.bikeProfSpeed = 'MODERATE';  // EASIER, MODERATE, MORE_DIRECT
params.elevFac = 50;  // 0, 50, 100
```

---

## 11. iOS Live Activity Data Strategy

### Required Data Points

For the iOS Live Activity displaying during an active trip:

| Data Point | Source | Update Frequency |
|------------|--------|------------------|
| Current phase | Computed from time + leg | Every 30s |
| Next event time | `leg.origin.departureTimeEstimated` | Every 30s |
| Delay minutes | Estimated - Planned | Every 30s |
| Current stop | `leg.origin.name` | On leg change |
| Next stop | `leg.stopSequence[1].name` | On leg change |
| Stops remaining | `leg.stopSequence.length` | On leg change |
| Platform | `leg.origin.properties.platform` | On leg change |
| Line number | `leg.transportation.number` | Static |
| Mode | `leg.transportation.product.class` | Static |
| Progress | Computed from leg times | Every 30s |
| Alerts | `leg.infos` | On leg change |
| Next connection | Next leg's departure time | On transfer |

### Recommended Live Activity Content

**Dynamic Island (Compact):**
```
[🚆] 3 min | Platform 9
```

**Dynamic Island (Expanded):**
```
T8 to Circular Quay          Arriving in 3 min
Platform 9                   On time ✓
```

**Lock Screen Widget:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T8 Airport & South Line → Circular Quay
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE: On train              ARRIVING: 10:42
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● Central → ● Town Hall → ● Wynyard → ○ Circular Quay
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Travel in first 6 carriages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase-Specific Instructions

| Phase | Primary Info | Action |
|-------|--------------|--------|
| `walking_to_stop` | Minutes to stop, distance | "Head to Platform 9" |
| `waiting` | Countdown, platform | "Your train arrives in 3 min" |
| `on_vehicle` | Stops remaining, ETA | "Arriving in 4 stops" |
| `transferring` | Next service, platform | "Walk to Platform 2 for L2" |
| `arriving` | Final destination | "Prepare to alight" |

---

## 12. UX Data Display Recommendations

### Departure Board Screen

**Essential (above the fold):**
- Countdown timer (minutes)
- Route number + destination headsign
- Platform (when available)
- Mode icon
- Realtime indicator (live dot)

**Secondary (expandable):**
- Scheduled vs estimated time
- Delay status
- Service alerts
- Next stops
- Carriage guidance (trains)

**Display priorities:**
```
┌─────────────────────────────────────┐
│ 🚆 T8 Airport Line → City Circle   │
│    Platform 1                       │
│                                     │
│    ⚡ 2 min    (10:42 → 10:42 on time)
│                                     │
│    ⚠️ Some services not stopping... │
└─────────────────────────────────────┘
```

### Trip Results Screen

**Essential:**
- Departure time
- Arrival time  
- Duration
- Number of transfers
- Mode icons for each leg
- Price (when available)

**Best trip indicator:**
- Confidence score
- "Why this?" explanation

**Display priorities:**
```
┌─────────────────────────────────────┐
│ ★ BEST                      $4.60   │
├─────────────────────────────────────┤
│ 10:14 → 10:42      28 min           │
│ [🚆 T8] → [🚢 F1]   1 transfer      │
│                                     │
│ Fastest option • Low walking        │
└─────────────────────────────────────┘
```

### Journey Detail Screen

**Per-leg information:**
1. **Mode + Route**: T8 Airport Line
2. **Boarding**: Platform 1, Central Station
3. **Time**: Depart 10:14 (on time)
4. **Duration**: 19 min, 7 stops
5. **Alighting**: Platform 1, Circular Quay
6. **Carriage guidance**: "Travel in first 6 carriages"

**Transfer information:**
- Walk time
- Platform change
- Connection time buffer

### Alert Display Hierarchy

1. **Banner alerts** (`type: bannerInfo`, `priority: veryHigh/high`)
   - Show at top of all screens
   - Red/orange styling

2. **Route-affecting alerts**
   - Show inline with affected trip legs
   - Impact on journey time

3. **Informational alerts** (`priority: low/veryLow`)
   - Collapsible "More info" section

---

## 13. API Requests Needed

Please run these requests and provide the JSON responses to help investigate specific questions:

### 1. Trip with Fares (Airport to City)

Purpose: Verify fare calculation is working

```
GET /v1/tp/trip?
  outputFormat=rapidJSON&
  coordOutputFormat=EPSG:4326&
  type_origin=any&
  name_origin=10101331&
  type_destination=any&
  name_destination=10111010&
  depArrMacro=dep&
  itdDate=20260115&
  itdTime=0900&
  TfNSWTR=true&
  calcNumberOfTrips=3&
  nswTripPlannerReq=nswLessWalk
```

**Question:** Does setting `nswTripPlannerReq=nswLessWalk` or other fare-specific parameters return fare data?

### 2. Departure with onwardLocations Detail

Purpose: See full onwardLocations structure for train

```
GET /v1/tp/departure_mon?
  outputFormat=rapidJSON&
  coordOutputFormat=EPSG:4326&
  type_dm=stop&
  name_dm=10111010&
  mode=direct&
  TfNSWDM=true&
  depArrMacro=dep
```

**Question:** Confirm onwardLocations structure and properties available.

### 3. Alert Filtering by Line ✅ CONFIRMED WORKING

Purpose: Test line-specific alert filtering

```
GET /v1/tp/add_info?
  outputFormat=rapidJSON&
  coordOutputFormat=EPSG:4326&
  filterDateValid=14-01-2026&
  filterPublicationStatus=current&
  itdLPxx_selLine=020T1
```

**Result:** Confirmed working - filtering by line returns only alerts affecting that line.

---

## Appendix A: Error Codes

| Code | Name | Description |
|------|------|-------------|
| -302 | IT_NO_CONNECTION | No journey found |
| -4000 | NO_CONNECTION | No journey found for the time entered |
| -4001 | DATE_INVALID | Date not possible in current timetable |
| -4006 | JUST_WALK | Only a walk has been found |
| -4007 | ORIGIN_EQUI_DEST | Origin and destination are identical |
| -9999 | TRIP_CANCELLED | Trip has been cancelled |

---

## Appendix B: Icon ID Reference

### Trains (Product Class 1)
- 1: Sydney Trains
- 2: Intercity Trains
- 3: Regional Trains
- 19: Temporary Trains

### Metro (Product Class 2)
- 24: Sydney Metro

### Light Rail (Product Class 4)
- 13: Sydney Light Rail
- 20: Temporary Light Rail
- 21: Newcastle Light Rail

### Buses (Product Class 5)
- 4: Blue Mountains Buses
- 5: Sydney Buses
- 6: Central Coast Buses
- 9: Private Buses
- 14: Temporary Buses
- 15: Hunter Buses
- 23: On Demand

### Ferry (Product Class 9)
- 10: Sydney Ferries
- 11: Newcastle Ferries
- 12: Private Ferries
- 18: Temporary Ferries

---

## Appendix C: File References

Example responses analyzed:
- `example_stop_finder_1_epp.json` (25 KB)
- `example_departure_mon_1_central.json` (88 KB)
- `example_departure_mon_2_circular_quay.json` (106 KB)
- `example_trip_1.json` (475 KB) - Airport to Circular Quay
- `example_trip_2.json` (2.2 MB) - Central to Gosford (longer journey)
- `example_add_info_1_all_modes.json` (3.1 MB) - All alerts
- `example_add_info_2_only_trains.json` (2.2 MB) - Train alerts only
- `example_coord_1_gis_point.json` (856 KB)
- `example_coord_2_bus_point.json` (133 KB)
- `example_coord_3_poi_point.json` (477 KB)

---

*Report generated for Bilby Project - January 2026*
