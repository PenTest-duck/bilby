# L2-06: Core Mobile Screens

**Parent:** L1-06 (Core Mobile Screens)  
**Status:** ✅ Complete  
**Estimated Effort:** 12-16 hours

---

## Overview

Build polished, delightful user interfaces for trip planning, departures, and stop search. Focus on elegant UX with TfNSW official transport mode icons.

---

## Design Principles

1. **Simple & Clean** — Minimal visual clutter, generous whitespace
2. **Transport-Focused** — Official TfNSW colors and icons for authenticity
3. **Information Hierarchy** — Most important info (time, line) prominent
4. **Delightful Details** — Subtle animations, smooth transitions
5. **Accessible** — Clear contrast, touch targets, screen reader support

---

## Tasks

### T01: Transport Mode Icons

**Goal:** Use official TfNSW mode symbols.

**Assets:**
- `train_mode_symbols_eps_png_white_colour/Train_Mode_Colour_Background_400x400.png`
- `metro_mode_symbols_eps_png_white_colour_2/Metro_Mode_Colour_Background_400x400.png`
- `bus_mode_symbols_eps_png_white_colour_1/Bus_Mode_Colour_Background_400x400.png`
- `ferry_mode_symbols_eps_png_white_colour/Ferry_Mode_Colour_Background_400x400.png`
- `lightrail_mode_symbols_eps_png_white_colour/LightRail_Mode_Colour_Background_400x400.png`

**Component:** `components/transport/mode-icon.tsx`

---

### T02: Stop Search Component

**Goal:** Elegant autocomplete with recent stops.

**Features:**
- Debounced search input
- Recent stops section
- Loading skeleton
- Empty state
- Keyboard dismiss on scroll

**Files:**
- `components/stop-search/search-input.tsx`
- `components/stop-search/stop-list.tsx`
- `components/stop-search/stop-row.tsx`

---

### T03: Home Screen

**Goal:** "What should I catch right now?"

**Sections:**
1. Hero with quick trip suggestions
2. Saved trips (with next departure time)
3. Recent stops quick access
4. Status indicator

---

### T04: Trip Planner Screen

**Goal:** Origin/destination input with results.

**Features:**
- Swap origin/destination button
- Time selector (Now / Depart At / Arrive By)
- Strategy picker (Best / Fastest / Least Walking)
- Results list with best option highlighted

---

### T05: Trip Results Component

**Goal:** Show ranked trip options beautifully.

**Per Trip:**
- Departure → Arrival time
- Duration and transfers
- Leg summary (mode icons)
- "Best" badge for top recommendation
- Realtime delay indicator

---

### T06: Trip Detail Screen

**Goal:** Full journey breakdown.

**Features:**
- Timeline view of legs
- Per-leg: mode icon, line, platform, stops
- Walking segments with distance
- "Why this route?" explainer
- Save/Share actions

---

### T07: Departures Screen

**Goal:** Live departure board for a stop.

**Features:**
- Stop search/selection
- Grouped by platform/direction
- Countdown timers (auto-refresh)
- Delay/cancellation indicators
- Pull-to-refresh

---

### T08: Departure Row Component

**Goal:** Single departure with live countdown.

**Display:**
- Mode icon + Line number
- Destination
- Countdown (minutes or time)
- Platform badge
- Delay indicator (if applicable)

---

## Definition of Done

- [ ] User can search and select stops
- [ ] Trip planning works end-to-end
- [ ] Departures show with live countdown
- [ ] UI feels polished and responsive
- [ ] Accessibility labels in place
