# Bilby Implementation Plan

## Plan Structure

- **Level 1 (L1):** Major chunks/milestones (this document)
- **Level 2 (L2):** Granular tasks within each L1 chunk (created per-chunk before implementation)

---

## L1 Chunks Overview

| Chunk | Name | Dependencies | Priority |
|-------|------|--------------|----------|
| L1-01 | Backend Foundation | — | P0 |
| L1-02 | TfNSW Data Layer | L1-01 | P0 |
| L1-03 | Core Backend API | L1-02 | P0 |
| L1-04 | Supabase Integration | L1-01 | P1 |
| L1-05 | Mobile App Foundation | — | P0 |
| L1-06 | Core Mobile Screens | L1-03, L1-05 | P0 |
| L1-07 | Real-Time & Disruptions | L1-03, L1-06 | P1 |
| L1-08 | Maps & Visualization | L1-06 | P2 |
| L1-09 | Widgets | L1-06 | P2 |
| L1-10 | Offline Support | L1-06 | P3 |
| L1-11 | Analytics & Reliability | L1-02 | P2 |
| L1-12 | Polish & Launch Prep | All | P1 |

---

## L1-01: Backend Foundation

**Goal:** Establish Express server structure, Vercel deployment config, and Redis connection.

### Scope
- Project structure following architecture spec (`/api`, `/edge/pollers`, `/lib`)
- Express app with middleware (CORS, JSON parsing, error handling)
- Vercel configuration (`vercel.json`) for serverless + edge functions
- Redis Cloud connection utility with error handling
- Environment variable management (`.env.example`, types)
- Health check endpoint (`/api/health`)
- Basic logging and error response formatting
- TypeScript strict mode configuration

### Deliverables
- Working Express server deployable to Vercel
- Redis connection pool ready for use
- CI-friendly health checks
- Development/production environment separation

### Definition of Done
- `vercel dev` runs locally
- `/api/health` returns `{ status: "ok", redis: "connected" }`
- TypeScript compiles without errors

---

## L1-02: TfNSW Data Layer ✅

**Goal:** Build edge pollers that fetch, normalize, and cache TfNSW data in Redis.

### Scope
- **Pollers** (Vercel Edge/Cron Functions):
  - Realtime Alerts (v2)
  - Realtime Timetables (v1 for most modes, v2 for metro)
  - Realtime Trip Updates (v2)
  - Realtime Vehicle Positions (v2)
- **Normalization layer:**
  - GTFS protobuf parsing (where applicable)
  - Transform TfNSW schemas → Bilby domain models
  - Mode-agnostic data structures (train, bus, metro, ferry, light rail)
- **Redis caching strategy:**
  - Namespace keys per architecture spec
  - TTL management per data type
  - HEAD request optimization (check before full GET)
- **Domain models:**
  - `Alert`, `TripUpdate`, `VehiclePosition`, `StopTime`, `Route`, `Stop`
  - Region-agnostic design for future extensibility

### Deliverables
- Edge functions polling TfNSW every ~10s (staggered)
- Normalized data written to Redis
- Bilby domain type definitions
- Poller monitoring/logging

### Definition of Done
- Redis contains fresh, normalized data for all feeds
- Data persists with correct TTLs
- Pollers handle TfNSW errors gracefully (retry, stale data)

---

## L1-03: Core Backend API ✅

**Goal:** Expose mobile-friendly endpoints that read from Redis and apply ranking logic.

### Scope
- **Endpoints:**
  - `GET /api/trips` — Trip planning with ranked options ("What should I catch?")
  - `GET /api/departures` — Live departures for a stop
  - `GET /api/disruptions` — Active alerts filtered by relevance
  - `GET /api/stops` — Stop search and lookup
  - `GET /api/routes` — Route information
- **Trip Planner integration:**
  - Proxy to TfNSW Trip Planner API
  - Merge realtime data from Redis
  - Apply ranking engine
- **Ranking & Decision Engine:**
  - Score routes by: arrival time, walking, transfers, reliability
  - Exclude cancelled services
  - Attach explainability metadata (`why` field)
  - Support strategy toggles (Best, Least Walking, Fewest Transfers)
- **Response formatting:**
  - `best` + `alternatives` structure
  - Data freshness timestamps
  - Confidence scores

### Deliverables
- All core endpoints functional
- Ranking engine with configurable strategies
- Explainability metadata on all recommendations
- Request validation and error handling

### Definition of Done
- `/api/trips?from=X&to=Y` returns ranked options with `best` highlighted
- Realtime delays/cancellations reflected in results
- Response includes `updatedAt` timestamp

---

## L1-04: Supabase Integration

**Goal:** Set up authentication and user data persistence.

### Scope
- **Supabase project setup:**
  - Database schema (users, saved_trips, preferences)
  - Row Level Security (RLS) policies
  - Auth configuration (passwordless email, Google OAuth)
- **Backend integration:**
  - JWT verification middleware
  - User context injection into requests
- **API endpoints:**
  - `POST /api/auth/verify` — Token verification
  - `GET /api/user/trips` — List saved trips
  - `POST /api/user/trips` — Save a trip
  - `DELETE /api/user/trips/:id` — Remove saved trip
  - `GET /api/user/preferences` — Fetch preferences
  - `PUT /api/user/preferences` — Update preferences
- **Guest mode:**
  - All core features work without auth
  - Auth unlocks persistence only

### Deliverables
- Supabase schema with migrations
- Auth middleware for Express
- User data CRUD endpoints
- RLS policies enforced

### Definition of Done
- Guest can use `/api/trips` without auth
- Authenticated user can save/retrieve trips
- Preferences persist across sessions

---

## L1-05: Mobile App Foundation

**Goal:** Establish Expo app structure, navigation, state management, and API client.

### Scope
- **Project structure:**
  - Feature-based folder organization
  - Shared components library
  - Design system tokens (colors, typography, spacing)
- **Navigation:**
  - Tab-based navigation (Home, Trips, Map, Settings)
  - Stack navigation within tabs
  - Deep linking support
- **State management:**
  - Zustand stores (UI state, user preferences)
  - TanStack Query setup (server state, caching, polling)
- **API client:**
  - Typed API client with error handling
  - Base URL configuration (dev/prod)
  - Auth token injection (when available)
- **Core utilities:**
  - Date/time formatting (Sydney timezone)
  - Transport mode icons and colors
  - Loading/error/empty state components
- **Design system:**
  - Typography scale
  - Color palette (light theme initially)
  - Spacing and layout primitives
  - Transport mode theming (train=orange, bus=blue, etc.)

### Deliverables
- Navigable app shell
- API client connected to backend
- Design system implemented
- Skeleton loading components

### Definition of Done
- App launches on iOS/Android simulator
- Navigation between tabs works
- API calls reach backend successfully

---

## L1-06: Core Mobile Screens

**Goal:** Build the primary user-facing screens for trip planning and departures.

### Scope
- **Home Screen:**
  - "What should I catch right now?" for saved trips
  - Quick access to recent/favorite destinations
  - Data freshness indicator
  - Skeleton loading states
- **Trip Planner Screen:**
  - Origin/destination input with stop search
  - Departure time selector (now, depart at, arrive by)
  - Results list with ranked options
  - Best route highlighted
  - Expandable trip details (legs, platforms, walking)
- **Trip Detail Screen:**
  - Full journey breakdown
  - Per-leg timing and platform info
  - Explainability ("Why this route?")
  - Share trip functionality
- **Departures Screen:**
  - Stop search/selection
  - Live departure board
  - Platform/stand information
  - Countdown timers
- **Stop Search:**
  - Autocomplete search
  - Recent stops
  - Nearby stops (location permission)

### Deliverables
- All core screens implemented
- Pull-to-refresh on live data
- Proper loading/error/empty states
- Accessibility labels

### Definition of Done
- User can plan a trip from A to B
- Departures show live countdown
- Saved trips appear on home screen (if authenticated)

---

## L1-07: Real-Time & Disruptions

**Goal:** Implement live updates and disruption-first UX.

### Scope
- **Real-time updates:**
  - Polling strategy (configurable interval)
  - Background refresh with TanStack Query
  - Visual indicators for live data (pulsing dot, countdown)
  - "Updated X seconds ago" display
- **Disruption handling:**
  - Alert banners on affected routes
  - Impact on arrival time calculation
  - Alternative route suggestions
  - Alert detail modal
- **Disruption UX (per PRD):**
  1. Quick heads-up (what happened)
  2. Clear recommendation (what to do)
  3. Impact on arrival time
  4. Other alternatives (expandable)
- **Push notifications (foundation):**
  - Expo push notification setup
  - Token registration with backend
  - (Actual notification sending in later chunk)

### Deliverables
- Live-updating departure times
- Disruption alerts integrated into trip results
- Alert detail views
- Notification permission flow

### Definition of Done
- Delayed service shows updated ETA
- Cancelled service excluded from results
- Alert banner appears when disruption affects route

---

## L1-08: Maps & Visualization

**Goal:** Add map views for visual confirmation and vehicle tracking.

### Scope
- **Map integration:**
  - React Native Maps setup
  - Sydney-region default view
- **Transit map view:**
  - Route polylines
  - Stop markers
  - Vehicle position markers (real-time)
  - Vehicle direction indicators
- **Trip visualization:**
  - Journey polyline on map
  - Leg differentiation (walking vs transit)
  - Transfer points highlighted
- **Street map (for buses):**
  - Bus route overlay
  - Bus position tracking
- **Map toggle:**
  - List ↔ Map view toggle
  - Map as secondary view (per PRD)

### Deliverables
- Interactive transit map
- Vehicle position tracking
- Trip route visualization
- Smooth list/map transitions

### Definition of Done
- User can toggle to map view on departures
- Vehicle positions update in real-time
- Trip route displays on map

---

## L1-09: Widgets

**Goal:** Implement home screen widgets for glanceable information.

### Scope
- **iOS Widget (WidgetKit via expo-widgets or native module):**
  - Small: Next departure countdown
  - Medium: Top 2-3 upcoming departures
- **Android Widget (AppWidget):**
  - Similar functionality to iOS
- **Widget data:**
  - Background refresh
  - Saved trip integration
  - Tap to open app at relevant screen
- **Configuration:**
  - Select which trip to display
  - Update frequency settings

### Deliverables
- iOS widget (small + medium)
- Android widget (equivalent)
- Widget configuration UI
- Background data refresh

### Definition of Done
- Widget shows live countdown to next departure
- Tapping widget opens correct trip in app
- Widget updates in background

---

## L1-10: Offline Support

**Goal:** Enable basic functionality without internet access.

### Scope
- **Offline timetables:**
  - Download static GTFS timetables
  - Store in device storage
  - UI for managing downloaded data
- **Offline trip planning:**
  - Basic routing using downloaded timetables
  - Clear indicator that realtime data unavailable
- **Network state handling:**
  - Detect offline state
  - Graceful degradation messaging
  - Auto-sync when back online
- **Storage management:**
  - Download size estimates
  - Delete downloaded data option
  - Storage usage display

### Deliverables
- Timetable download functionality
- Offline trip planning (static only)
- Network state indicators
- Storage management UI

### Definition of Done
- User can plan trip while offline (if timetables downloaded)
- Clear messaging about data freshness
- Downloaded timetables update periodically

---

## L1-11: Analytics & Reliability

**Goal:** Build reliability metrics and historical insights.

### Scope
- **Data collection (backend):**
  - Track scheduled vs actual times
  - Store rolling reliability stats in Redis
  - Per-route, per-line, per-time-of-day metrics
- **Reliability indicators:**
  - Subtle reliability badges on routes
  - Historical on-time percentage
  - Average delay per service
- **User-facing stats (non-intrusive):**
  - "Usually on time" / "Often delayed" labels
  - Tap to see historical stats
  - Time-of-day patterns
- **Backend analytics:**
  - Aggregate commute patterns (anonymized)
  - Popular routes dashboard (internal)

### Deliverables
- Reliability data collection pipeline
- Reliability indicators in UI
- Historical stats modal
- Internal analytics dashboard (basic)

### Definition of Done
- Routes show reliability indicator
- User can tap to see "This line is on time 87% of the time"
- Stats update daily

---

## L1-12: Polish & Launch Prep

**Goal:** Final refinements, testing, and launch readiness.

### Scope
- **UI polish:**
  - Animation refinements
  - Micro-interactions
  - Haptic feedback
  - Dark mode
- **Performance:**
  - List virtualization audit
  - Image optimization
  - Bundle size optimization
  - Startup time optimization
- **Testing:**
  - Unit tests for ranking engine
  - Integration tests for API endpoints
  - E2E tests for critical flows
- **Error handling:**
  - Global error boundary
  - Crash reporting setup (Sentry)
  - User-friendly error messages
- **Accessibility:**
  - Screen reader audit
  - Sufficient color contrast
  - Touch target sizes
- **App store prep:**
  - App icons and splash screens
  - Store listing copy
  - Screenshots
  - Privacy policy

### Deliverables
- Polished, production-ready app
- Test coverage on critical paths
- App store assets
- Monitoring and crash reporting

### Definition of Done
- App passes accessibility audit
- No critical bugs in core flows
- Ready for TestFlight/Play Store internal testing

---

## Implementation Order (Suggested)

```
Phase 1 (Foundation):
  L1-01 → L1-02 → L1-03 (Backend working end-to-end)
  L1-05 (parallel with backend)

Phase 2 (Core Experience):
  L1-06 (Core screens)
  L1-04 (Auth + persistence)
  L1-07 (Realtime + disruptions)

Phase 3 (Enhanced Features):
  L1-08 (Maps)
  L1-09 (Widgets)
  L1-11 (Analytics)

Phase 4 (Launch):
  L1-10 (Offline)
  L1-12 (Polish)
```

---

## Notes

- Each L1 chunk will have a detailed L2 plan created before implementation
- L2 plans will include specific files, functions, and acceptance criteria
- Chunks may be adjusted as implementation reveals new requirements
- P0 = Must have for v0, P1 = Must have for v1, P2 = Nice to have, P3 = Future

---

## L2 Plans (To Be Created)

- [x] L2-01: Backend Foundation → `PLAN_L2_01_SETUP.md`
- [ ] L2-02: TfNSW Data Layer
- [ ] L2-03: Core Backend API
- [ ] L2-04: Supabase Integration
- [ ] L2-05: Mobile App Foundation
- [ ] L2-06: Core Mobile Screens
- [ ] L2-07: Real-Time & Disruptions
- [ ] L2-08: Maps & Visualization
- [ ] L2-09: Widgets
- [ ] L2-10: Offline Support
- [ ] L2-11: Analytics & Reliability
- [ ] L2-12: Polish & Launch Prep
