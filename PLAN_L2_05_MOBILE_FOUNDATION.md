# L2-05: Mobile App Foundation

**Parent:** L1-05 (Mobile App Foundation)  
**Status:** ✅ Complete  
**Estimated Effort:** 8-10 hours

---

## Overview

Establish Expo app structure, navigation, state management, API client, and design system for the Bilby mobile app.

---

## Tasks

### T01: Design System & Theme

**Goal:** NSW Transport-aligned design tokens.

**Files:**
- `constants/theme.ts` — Colors, typography, spacing
- `constants/transport.ts` — Mode-specific colors and icons

**Transport Mode Colors (TfNSW):**
- Train: `#F6891F` (orange)
- Metro: `#009B77` (teal)
- Bus: `#00B5EF` (blue)
- Ferry: `#5AB031` (green)
- Light Rail: `#EE343F` (red)

---

### T02: API Client

**Goal:** Typed API client with TanStack Query integration.

**Files:**
- `lib/api/client.ts` — Base fetch wrapper with auth
- `lib/api/types.ts` — API response types
- `lib/api/stops.ts` — Stop search queries
- `lib/api/trips.ts` — Trip planning queries
- `lib/api/departures.ts` — Departure queries

**Features:**
- Base URL from env (dev/prod)
- Auth token injection
- Error handling with typed errors
- Request/response logging in dev

---

### T03: TanStack Query Setup

**Goal:** Server state management with caching.

**Files:**
- `lib/query-client.ts` — Query client config
- `providers/query-provider.tsx` — Provider wrapper

**Config:**
- Stale time: 30s for realtime data
- Cache time: 5 minutes
- Retry: 2 attempts
- Refetch on focus

---

### T04: Zustand Stores

**Goal:** Client state management.

**Files:**
- `stores/ui-store.ts` — UI state (modals, sheets)
- `stores/preferences-store.ts` — User preferences (persisted)
- `stores/auth-store.ts` — Auth state

---

### T05: Tab Navigation

**Goal:** 4-tab navigation matching plan.

**Tabs:**
1. **Home** — Quick access, saved trips
2. **Plan** — Trip planner
3. **Departures** — Live departures
4. **Settings** — Preferences, auth

---

### T06: Core UI Components

**Goal:** Reusable components for screens.

**Components:**
- `ui/button.tsx` — Primary/secondary buttons
- `ui/card.tsx` — Content cards
- `ui/skeleton.tsx` — Loading skeletons
- `ui/error-view.tsx` — Error states
- `ui/empty-view.tsx` — Empty states
- `ui/transport-badge.tsx` — Mode indicators

---

### T07: Utilities

**Goal:** Common helper functions.

**Files:**
- `lib/date.ts` — Sydney timezone formatting
- `lib/format.ts` — Duration, distance formatting

---

## Environment Variables

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## Definition of Done

- [ ] App launches on iOS/Android
- [ ] 4 tabs navigable
- [ ] API client can reach backend
- [ ] Design system tokens in place
- [ ] Skeleton loading components work
