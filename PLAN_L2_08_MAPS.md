# L2-08: Maps & Visualization

**Parent:** L1-08 (Maps & Visualization)  
**Status:** ✅ Complete  
**Estimated Effort:** 10-14 hours

---

## Overview

Add map views for visual route confirmation and vehicle tracking using Expo Maps (alpha).
- **Bus routes**: Street map view with route polyline overlay
- **Rail/Ferry**: Transit-focused view with route and stop visualization

---

## Technical Approach

### Expo Maps Integration
- Uses `expo-maps` (alpha) which provides:
  - `AppleMaps.View` for iOS (Apple Maps)
  - `GoogleMaps.View` for Android (Google Maps)
- Polylines for route visualization
- Markers for stops and vehicle positions
- Platform-specific implementations required

### Data Sources
- **Route polylines**: `leg.coords` array of `[lat, lng]` from trip planner
- **Stop markers**: `leg.stopSequence` with coordinates
- **Vehicle positions**: `/api/vehicles` endpoint with realtime positions

### Mode-Specific Views
| Mode | Map Type | Features |
|------|----------|----------|
| Bus (5) | Street map | Route overlay, bus positions, street context |
| Train (1) | Transit | Route line, station markers, train positions |
| Metro (2) | Transit | Route line, station markers, metro positions |
| Light Rail (4) | Transit | Route line, stop markers, tram positions |
| Ferry (9) | Hybrid | Water route, wharf markers, ferry positions |
| Walking | Street | Dotted path, turn indicators |

---

## Tasks

### 1. Map Component Infrastructure
- [x] Install expo-maps
- [ ] Create platform-specific map wrapper component
- [ ] Add Sydney-region default camera position
- [ ] Configure Google Maps API key in app.json

### 2. Route Visualization Component
- [ ] Create `RoutePolyline` for rendering leg coordinates
- [ ] Differentiate walking vs transit legs (dotted vs solid)
- [ ] Color-code by transport mode (use existing TransportColors)
- [ ] Add origin/destination markers

### 3. Stop Markers
- [ ] Create `StopMarker` component for stop sequence
- [ ] Show stop name on tap
- [ ] Highlight transfer points
- [ ] Different marker styles for major vs minor stops

### 4. Vehicle Position Markers
- [ ] Create `VehicleMarker` component
- [ ] Show vehicle bearing/direction indicator
- [ ] Display route number on marker
- [ ] Auto-refresh positions (10s interval)

### 5. Trip Map Screen
- [ ] Create `TripMapView` component
- [ ] Show full journey with all legs
- [ ] Fit map bounds to journey extent
- [ ] Toggle between legs

### 6. Departure Map View
- [ ] Create `DepartureMapView` for single route
- [ ] Show all vehicles on route
- [ ] Highlight selected departure vehicle
- [ ] Show user's stop location

### 7. Integration
- [ ] Add map toggle to Trip Detail screen
- [ ] Add map toggle to Departure Board
- [ ] Smooth list ↔ map transitions
- [ ] Handle permissions for user location

---

## Components to Create

| Component | Purpose |
|-----------|---------|
| `MapView` | Platform wrapper for Apple/Google Maps |
| `RoutePolyline` | Renders leg coordinates as polyline |
| `StopMarker` | Station/stop marker with info |
| `VehicleMarker` | Live vehicle position marker |
| `TripMapView` | Full journey visualization |
| `DepartureMapView` | Single route with vehicles |
| `MapToggle` | List/Map view toggle button |

---

## API Hooks to Create

| Hook | Purpose |
|------|---------|
| `useVehiclePositions` | Fetch and poll vehicle positions for route |

---

## Definition of Done

- [ ] User can toggle to map view on trip detail
- [ ] Route polylines display correctly for all transport modes
- [ ] Stop markers show on route
- [ ] Vehicle positions update in real-time
- [ ] Smooth transitions between list and map views

---

## Notes

- Expo Maps is in alpha - may have breaking changes
- Google Maps API key required for Android
- Apple Maps works without additional config on iOS
- Consider fallback UI if maps fail to load
