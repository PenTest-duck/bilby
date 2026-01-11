# L2-07: Real-Time & Disruptions

**Parent:** L1-07 (Real-Time & Disruptions)  
**Status:** ✅ Complete  
**Estimated Effort:** 8-12 hours

---

## Overview

Implement live updates for departures and trip results, with disruption-first UX showing alerts, delays, and cancellations prominently.

---

## Tasks

### 1. Real-Time Polling Infrastructure
- [ ] Configure TanStack Query for auto-refetch intervals
- [ ] Add configurable polling intervals (15s for departures, 60s for trips)
- [ ] Implement "last updated" timestamp tracking
- [ ] Add visual "live" indicator with pulsing animation

### 2. Live Departure Updates
- [ ] Update `useDepartures` hook with polling
- [ ] Add countdown timer that updates every second
- [ ] Show "Updated X seconds ago" in departure board
- [ ] Handle stale data gracefully

### 3. Trip Real-Time Updates  
- [ ] Update `useTripPlan` hook with background refresh
- [ ] Show delay propagation in journey results
- [ ] Update arrival times with real-time data
- [ ] Mark cancelled legs clearly

### 4. Alert Components
- [ ] Create `AlertBanner` component for route disruptions
- [ ] Create `AlertBadge` for compact alert indicators
- [ ] Create `AlertDetailModal` for full alert information
- [ ] Support severity levels: info, warning, severe

### 5. Disruption UX (per PRD)
- [ ] Quick heads-up banner (what happened)
- [ ] Clear recommendation (what to do)
- [ ] Impact on arrival time calculation
- [ ] Alternative route suggestions (expandable)

### 6. Service Status
- [ ] Create `useServiceStatus` hook for network-wide alerts
- [ ] Update Home screen status card with real alerts
- [ ] Group alerts by transport mode
- [ ] Cache and background refresh status

### 7. Push Notification Foundation
- [ ] Expo push notification setup
- [ ] Permission request flow UI
- [ ] Token registration placeholder (backend integration later)

---

## Components to Create

| Component | Purpose |
|-----------|---------|
| `AlertBanner` | Full-width disruption banner |
| `AlertBadge` | Compact severity indicator |
| `AlertDetailModal` | Detailed alert view with actions |
| `LiveIndicator` | Pulsing dot with "Live" text |
| `LastUpdated` | "Updated X seconds ago" display |
| `CountdownTimer` | Auto-updating minute countdown |

---

## Hooks to Update/Create

| Hook | Changes |
|------|---------|
| `useDepartures` | Add polling, stale time config |
| `useTripPlan` | Add background refresh |
| `useServiceStatus` | New - fetch network alerts |
| `useAlerts` | New - fetch route-specific alerts |
| `useCountdown` | New - real-time countdown hook |

---

## Definition of Done

- [ ] Departure times update automatically every 15s
- [ ] Delayed services show updated ETA prominently
- [ ] Cancelled services excluded from results
- [ ] Alert banner appears when disruption affects route
- [ ] User can tap alert to see details and alternatives
- [ ] "Updated X ago" shows data freshness
- [ ] Notification permission flow works

---

## Notes

- Polling should be paused when app is backgrounded
- Use optimistic updates where possible
- Alerts should be dismissible but persist across sessions
- Consider battery impact of frequent polling
