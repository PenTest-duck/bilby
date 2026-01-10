# L2-02: TfNSW Data Layer

**Parent:** L1-02 (TfNSW Data Layer)  
**Status:** ✅ Complete  
**Estimated Effort:** 8-12 hours

---

## Overview

Build the data ingestion layer that polls TfNSW APIs, normalizes GTFS data, and caches it in Redis for the mobile API to consume.

---

## TfNSW API Summary

### Endpoints (use latest versions)

| Feed | Base URL | Format |
|------|----------|--------|
| Alerts v2 | `https://api.transport.nsw.gov.au/v2/gtfs/alerts` | protobuf/json |
| Trip Updates v2 | `https://api.transport.nsw.gov.au/v2/gtfs/realtime` | protobuf |
| Vehicle Positions v2 | `https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos` | protobuf |

### Authentication
- Header: `Authorization: apikey [TOKEN]`

### Sub-endpoints by mode
- `/all` - All modes combined (alerts only)
- `/sydneytrains` - Sydney Trains
- `/metro` - Sydney Metro  
- `/buses` - Sydney Metro buses
- `/ferries` - Ferries
- `/lightrail` - Light Rail
- `/nswtrains` - Regional trains
- `/regionbuses` - Regional buses

### HEAD Optimization
All endpoints support HEAD request to check `Last-Modified` header before full GET.

---

## Tasks

### T01: Domain Models

**Goal:** Define Bilby-native data structures for transit data.

**File:** `backend/src/types/gtfs.ts`

```typescript
// Transport modes (region-agnostic)
type TransportMode = 'train' | 'metro' | 'bus' | 'ferry' | 'light_rail' | 'coach'

// Core domain models
interface Alert { ... }
interface TripUpdate { ... }
interface VehiclePosition { ... }
interface StopTimeUpdate { ... }
```

**Acceptance Criteria:**
- [ ] All GTFS-realtime entities modeled
- [ ] Mode-agnostic design (extensible to other regions)
- [ ] Zod schemas for runtime validation

---

### T02: Redis Cache Utilities

**Goal:** Build namespaced Redis caching with TTL management.

**File:** `backend/src/lib/cache.ts`

**Key namespace structure:**
```
bilby:alerts:{mode}         → Alert[]
bilby:tripupdates:{mode}    → TripUpdate[]
bilby:vehiclepos:{mode}     → VehiclePosition[]
bilby:meta:{feed}           → { lastModified, fetchedAt, count }
```

**TTL Strategy:**
- Alerts: 60s (changes less frequently)
- Trip Updates: 30s (realtime delays)
- Vehicle Positions: 15s (frequent location updates)

**Key functions:**
```typescript
setFeedData(feed, mode, data, ttl)
getFeedData(feed, mode)
getFeedMeta(feed, mode)
setFeedMeta(feed, mode, meta)
```

**Acceptance Criteria:**
- [ ] Namespaced keys following pattern
- [ ] TTL auto-expiry working
- [ ] Metadata tracking (last modified, fetch time)

---

### T03: TfNSW API Client

**Goal:** HTTP client with HEAD/GET optimization and error handling.

**File:** `backend/src/lib/tfnsw-client.ts`

**Features:**
- HEAD request to check Last-Modified
- Conditional GET (skip if unchanged)
- GTFS protobuf parsing
- JSON fallback for alerts
- Retry with exponential backoff
- Request timeout handling

**Key functions:**
```typescript
checkFeedModified(endpoint): Promise<{ modified: boolean, lastModified: string }>
fetchFeed(endpoint): Promise<{ data: Buffer, lastModified: string }>
parseAlerts(data): Alert[]
parseTripUpdates(data): TripUpdate[]
parseVehiclePositions(data): VehiclePosition[]
```

**Acceptance Criteria:**
- [ ] HEAD optimization reduces unnecessary GETs
- [ ] Protobuf parsing working
- [ ] Graceful error handling with retries

---

### T04: GTFS Protobuf Setup

**Goal:** Set up protobuf parsing for GTFS-realtime feeds.

**Dependencies:** `gtfs-realtime-bindings` or `protobufjs`

**File:** `backend/src/lib/gtfs-parser.ts`

**Note:** TfNSW returns standard GTFS-realtime protobuf. Can use `?format=json` for alerts.

**Acceptance Criteria:**
- [ ] Can parse FeedMessage from protobuf
- [ ] Extracts Alert, TripUpdate, VehiclePosition entities

---

### T05: Poller Base Class

**Goal:** Reusable poller infrastructure for all feeds.

**File:** `backend/src/pollers/base-poller.ts`

**Features:**
- Configurable poll interval
- HEAD check before GET
- Error handling and logging
- Stale data detection
- Redis write with TTL

**Acceptance Criteria:**
- [ ] Base class handles common poller logic
- [ ] Feed-specific pollers only implement data transformation

---

### T06: Alerts Poller

**Goal:** Poll alerts feed and cache in Redis.

**File:** `backend/src/pollers/alerts-poller.ts`

**Endpoint:** `GET /v2/gtfs/alerts/all?format=json`

**Poll interval:** 30 seconds

**Acceptance Criteria:**
- [ ] Fetches all alerts
- [ ] Parses and normalizes to Bilby Alert model
- [ ] Writes to Redis with 60s TTL

---

### T07: Trip Updates Poller

**Goal:** Poll trip updates for each mode.

**File:** `backend/src/pollers/trip-updates-poller.ts`

**Endpoints:**
- `/v2/gtfs/realtime/sydneytrains`
- `/v2/gtfs/realtime/metro`
- `/v2/gtfs/realtime/lightrail/innerwest`

**Poll interval:** 15 seconds (staggered)

**Acceptance Criteria:**
- [ ] Polls all configured modes
- [ ] Parses protobuf responses
- [ ] Writes to Redis with 30s TTL

---

### T08: Vehicle Positions Poller

**Goal:** Poll vehicle positions for real-time tracking.

**File:** `backend/src/pollers/vehicle-positions-poller.ts`

**Endpoints:**
- `/v2/gtfs/vehiclepos/sydneytrains`
- `/v2/gtfs/vehiclepos/metro`
- `/v2/gtfs/vehiclepos/lightrail/innerwest`

**Poll interval:** 10 seconds (staggered)

**Acceptance Criteria:**
- [ ] Polls all configured modes
- [ ] Parses protobuf responses
- [ ] Writes to Redis with 15s TTL

---

### T09: Poller Orchestrator

**Goal:** Coordinate all pollers with staggered execution.

**File:** `backend/src/pollers/orchestrator.ts`

**Features:**
- Start/stop all pollers
- Staggered intervals to avoid thundering herd
- Health status aggregation
- Graceful shutdown

**Acceptance Criteria:**
- [ ] All pollers run on schedule
- [ ] Staggered to distribute load
- [ ] Clean shutdown on process exit

---

### T10: Poller API Endpoint (for dev/monitoring)

**Goal:** Endpoint to trigger polls and check status.

**File:** `backend/src/api/pollers.ts`

**Endpoints:**
- `GET /api/pollers/status` - Poller health and last fetch times
- `POST /api/pollers/trigger/:feed` - Manual trigger (dev only)

**Acceptance Criteria:**
- [ ] Status shows all poller states
- [ ] Manual trigger works in development

---

### T11: Vercel Cron Configuration

**Goal:** Configure Vercel cron jobs for production polling.

**File:** `backend/vercel.json` (update crons array)

**Note:** In development, pollers run in-process. In production on Vercel, we use cron functions that are invoked periodically.

**Cron schedule:**
- Alerts: Every 30 seconds (`*/30 * * * * *` - not supported, use edge function with self-invoke)
- Trip Updates: Every 15 seconds
- Vehicle Positions: Every 10 seconds

**Alternative:** Use Vercel Edge Functions with `waitUntil` for background polling, or external cron service.

**Acceptance Criteria:**
- [ ] Pollers work in local dev
- [ ] Strategy defined for Vercel production

---

## Implementation Order

1. **T01** → Domain models
2. **T02** → Redis cache utilities
3. **T04** → GTFS protobuf setup
4. **T03** → TfNSW API client
5. **T05** → Poller base class
6. **T06** → Alerts poller
7. **T07** → Trip updates poller
8. **T08** → Vehicle positions poller
9. **T09** → Orchestrator
10. **T10** → Monitoring endpoint
11. **T11** → Vercel cron config

---

## Testing Checklist

- [ ] Domain models validate correctly
- [ ] Redis keys created with correct namespacing
- [ ] HEAD optimization skips unchanged feeds
- [ ] Protobuf parsing succeeds
- [ ] Alerts appear in Redis after poller runs
- [ ] Trip updates appear in Redis
- [ ] Vehicle positions appear in Redis
- [ ] Pollers recover from TfNSW errors
- [ ] Stale data detected and logged

---

## Definition of Done

- [ ] All pollers implemented and tested
- [ ] Redis contains fresh data for all feeds
- [ ] Data persists with correct TTLs
- [ ] Pollers handle errors gracefully
- [ ] Ready to proceed to L1-03 (Core Backend API)
