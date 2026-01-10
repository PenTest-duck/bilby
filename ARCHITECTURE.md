# ARCHITECTURE.md — Bilby

## Overview

Bilby is a decision-first public transport app for NSW. The architecture is designed to:

* Minimise **time-to-decision** for users
* Centralise intelligence on the backend
* Be resilient to partial outages and stale data
* Scale cleanly within **serverless constraints**

The stack:

* **Mobile:** Expo (iOS + Android)
* **Backend API:** Express (Node.js, TypeScript)
* **Hosting:** Vercel (Serverless + Edge)
* **Background Jobs:** Vercel Cron + Edge Functions
* **Cache:** Redis Cloud
* **Database & Auth:** Supabase

---

## High-Level System Diagram

```
┌──────────────┐
│   Expo App   │
└───────┬──────┘
        │ HTTPS
        ▼
┌────────────────────────┐
│   Express API (Vercel) │
│                        │
│ - Trip orchestration   │
│ - Ranking engine       │
│ - Explainability       │
└───────┬────────┬───────┘
        │        │
        ▼        ▼
┌────────────┐  ┌────────────────┐
│ Redis Cloud│  │ Supabase (DB)  │
│ (Realtime) │  │ Auth + Storage │
└───────┬────┘  └────────────────┘
        ▼
┌─────────────────────────────┐
│ Vercel Edge Cron Pollers    │
│ - TfNSW polling (10s)       │
│ - Normalisation             │
│ - Cache updates             │
└─────────────────────────────┘
```

---

## Core Architectural Rules (Non-Negotiable)

1. **The mobile app never talks to TfNSW APIs directly**
2. **The Express API never talks to TfNSW APIs directly**
3. **Only Edge pollers communicate with TfNSW**
4. **Redis is the source of truth for realtime transport data**
5. **Supabase is used only for user-centric data**

This separation ensures determinism, low latency, and predictable behaviour.

---

## Mobile App (Expo)

### Responsibilities

* Render UI and decisions
* Display ranked routes and recommendations
* Handle skeleton loading states
* Provide explainability on tap
* Cache minimal state locally

### Explicitly Not Responsible For

* Routing logic
* Ranking heuristics
* Interpreting raw TfNSW data

### Data Strategy

* **TanStack Query** for server data (polling, caching, SWR)
* **Zustand** for UI and ephemeral state

### UX Rules

* Skeletons over spinners
* First screen answers: **"What should I catch right now?"**
* Data freshness shown explicitly (e.g. "Updated 4s ago")

---

## Backend API (Express on Vercel)

### Responsibilities

* Serve mobile clients
* Read realtime data from Redis
* Apply ranking & decision heuristics
* Attach explainability metadata
* Enforce authentication and preferences

### Responsibilities Explicitly Excluded

* Polling TfNSW APIs
* Storing large realtime datasets
* Running long-lived background jobs

### Suggested Structure

```
/api
 ├── trips.ts          // "What should I catch right now?"
 ├── realtime.ts       // Departures, vehicle status
 ├── disruptions.ts   // Alerts and impacts
 ├── widgets.ts       // Widget-optimised endpoints
 ├── auth.ts          // Supabase token verification
 └── health.ts
```

---

## Edge Pollers (Vercel Edge Functions + Cron)

### Responsibilities

* Poll TfNSW APIs every **~10 seconds**
* Use HEAD requests to detect changes
* Fetch via GET when updates are detected
* Normalise data into Bilby-native models
* Write results to Redis

### Polling Frequency

* **Target:** Every 10 seconds per feed
* Feeds should be staggered to avoid burst load

### TfNSW Feeds

* Realtime Alerts
* Realtime Timetables
* Realtime Trip Updates
* Vehicle Positions

### Explicit Constraints

* No heavy computation
* No routing or ranking logic
* No Supabase access
* Short execution only

### Suggested Structure

```
/edge/pollers
 ├── alerts.ts
 ├── timetables.ts
 ├── vehicles.ts
 ├── trip-updates.ts
 └── normalise.ts
```

---

## Redis (Realtime Cache & Computation Layer)

Redis is the **realtime backbone** of Bilby.

### Key Namespace Strategy

```
tfnsw:alerts:{mode}
tfnsw:vehicles:{route_id}
tfnsw:timetables:{stop_id}
tfnsw:trip_updates:{trip_id}

bilby:stats:route:{route_id}
bilby:stats:line:{line}
bilby:computed:recommendations:{hash}
```

### Stored Data

* Normalised TfNSW payloads
* Latest realtime snapshots
* Rolling reliability statistics
* Pre-computed aggregates

### TTL Strategy

| Data Type         | TTL         |
| ----------------- | ----------- |
| Vehicle positions | 30–60s      |
| Trip updates      | 30–60s      |
| Alerts            | 5–10 min    |
| Timetables        | 1–6 hours   |
| Reliability stats | 24–72 hours |

---

## Ranking & Decision Engine

### Inputs

* Trip planner options
* Realtime disruptions
* Vehicle and timetable data
* Historical reliability metrics
* User preferences (if any)

### Outputs

A ranked, opinionated response optimised for decision-making.

Example:

```json
{
  "best": {
    "label": "Best",
    "arrival": "08:42",
    "confidence": 0.91,
    "why": ["Fastest", "Low walking"]
  },
  "alternatives": [...]
}
```

### Key Principle

> Ranking logic lives **only** in the backend and is fully explainable.

---

## Supabase (Persistence & Auth)

### Used For

* Authentication (passwordless email, OAuth)
* User profiles
* Saved trips
* User preferences

### Explicitly Not Used For

* Realtime transport data
* TfNSW payload storage
* High-frequency writes

---

## Authentication Flow

1. App starts in **guest mode**
2. Supabase Auth used for sign-in
3. JWT passed to Express API
4. Express verifies token with Supabase
5. Preferences and saved trips unlocked

---

## Error Handling & Degradation

| Failure           | Behaviour                      |
| ----------------- | ------------------------------ |
| TfNSW outage      | Serve cached data + warning    |
| Poller failure    | Serve stale data + timestamp   |
| Redis unavailable | Best effort fallback           |
| Partial feed      | Degraded but actionable result |

User should always receive *some* answer.

---

## Extensibility

* Region-agnostic domain models
* Provider abstraction for TfNSW-like systems
* Configuration-driven transport modes

---

## Summary

This architecture is designed to:

* Deliver **fast, confident decisions**
* Respect serverless and edge constraints
* Centralise intelligence while keeping the client simple
* Scale to additional regions without rewrites

**Expo + Express + Vercel + Redis + Supabase** is a strong foundation for Bilby — provided responsibilities remain cleanly separated.
