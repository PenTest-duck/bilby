# PLAN_L2_09_IOS_LIVE_ACTIVITIES.md — iOS Live Activity & Dynamic Island

## Overview

This plan implements iOS Live Activities for Bilby, enabling users to track their transit journey from the Lock Screen and Dynamic Island without unlocking their phone. Inspired by CityMapper's implementation, this creates an effortless "glanceable" experience for commuters.

## User Experience Vision

When a user selects a specific route/journey in the Bilby app, they can "Go" to activate a Live Activity that provides:

1. **Lock Screen Widget** - Full journey tracking with upcoming stops, times, and alerts
2. **Dynamic Island (Compact)** - Quick glance at next action and countdown
3. **Dynamic Island (Minimal)** - Transport mode icon when multiple activities active
4. **Dynamic Island (Expanded)** - Detailed view on long-press showing full journey context

### Journey Phases (CityMapper-inspired)

| Phase | Lock Screen Shows | Dynamic Island Shows |
|-------|-------------------|---------------------|
| **Walk to Stop** | Distance/time to stop, departure countdown | Walking icon + time to departure |
| **Waiting at Stop** | Platform, next departure, delay info | Line badge + countdown |
| **On Vehicle** | Stops remaining, arrival time, next stop | Line badge + stops to go |
| **Transfer** | Walk to next platform, connection time | Walking icon + connection countdown |
| **Arriving** | Final destination, arrival time | Destination name + "Arriving" |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         iOS Device                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│  │   Expo App      │    │   Widget Extension (Swift)           │   │
│  │   (React Native)│    │   - BilbyLiveActivity                │   │
│  │                 │◄──►│   - Lock Screen UI                   │   │
│  │   - Start LA    │    │   - Dynamic Island UI                │   │
│  │   - Track state │    │   - ActivityAttributes               │   │
│  │   - End LA      │    └──────────────────────────────────────┘   │
│  └────────┬────────┘                     ▲                          │
│           │                              │ Push Token               │
│           │ HTTP                         │                          │
└───────────┼──────────────────────────────┼──────────────────────────┘
            │                              │
            ▼                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (Express)                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ /api/live-      │  │ Live Activity   │  │ APNs Push Service   │ │
│  │ activity        │  │ Manager         │  │ (ActivityKit Push)  │ │
│  │                 │  │                 │  │                     │ │
│  │ - Register token│  │ - Track active  │  │ - Send updates      │ │
│  │ - Get updates   │  │   activities    │  │ - End activities    │ │
│  │ - End activity  │  │ - Poll realtime │  │                     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘ │
│           │                    │                       │            │
│           ▼                    ▼                       ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Redis Cache                                   ││
│  │  live_activity:{token} -> { journey, pushToken, lastUpdate }    ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
      ┌───────────┐
      │   APNs    │ ◄── ActivityKit Push Notifications
      └───────────┘
```

---

## Data Model

### ActivityAttributes (Static - set at start)

```swift
struct BilbyTripAttributes: ActivityAttributes {
    // Journey identification
    var tripId: String
    var originId: String
    var originName: String
    var destinationId: String
    var destinationName: String
    
    // Primary transport info
    var lineNumber: String        // e.g., "T1", "333", "M1"
    var lineName: String          // e.g., "North Shore Line"
    var modeId: Int               // 1=train, 2=metro, 4=light_rail, 5=bus, 9=ferry
    var lineColor: String         // Hex color for line badge
    
    // Journey metadata
    var totalLegs: Int
    var plannedArrival: Date
}
```

### ContentState (Dynamic - updated in real-time)

```swift
struct ContentState: Codable, Hashable {
    // Current journey phase
    var phase: TripPhase          // .walkingToStop, .waiting, .onVehicle, .transferring, .arriving
    
    // Timing
    var nextEventTime: Date       // Departure/arrival time
    var delayMinutes: Int         // Realtime delay (0 if on time)
    var isDelayed: Bool
    var isCancelled: Bool
    
    // Location context
    var currentStopName: String   // Where user is now
    var nextStopName: String      // Next relevant stop
    var stopsRemaining: Int       // Stops until destination/transfer
    var platform: String?         // Platform number if available
    
    // Progress
    var currentLeg: Int           // Which leg of journey (1-indexed)
    var progress: Double          // 0.0 - 1.0 journey completion
    
    // Alerts
    var hasAlert: Bool
    var alertMessage: String?
    
    // For transfers
    var nextLineNumber: String?   // Next line to catch
    var nextLineModeId: Int?
    var connectionTime: Int?      // Minutes to make connection
}

enum TripPhase: String, Codable {
    case walkingToStop = "walking_to_stop"
    case waiting = "waiting"
    case onVehicle = "on_vehicle"
    case transferring = "transferring"
    case arriving = "arriving"
    case completed = "completed"
}
```

---

## Implementation Tasks

### Phase 1: Swift Widget Implementation

#### 1.1 Create BilbyTripAttributes
- Define `ActivityAttributes` struct with static journey data
- Define `ContentState` struct with dynamic realtime data
- Add `TripPhase` enum for journey state machine

#### 1.2 Create Lock Screen View
- Design compact, glanceable layout
- Show: Line badge, destination, countdown, platform, delay indicator
- Phase-specific layouts (walking vs waiting vs on vehicle)
- Support for alerts and cancellations

#### 1.3 Create Dynamic Island Views
- **Compact Leading**: Line badge/mode icon
- **Compact Trailing**: Countdown timer or stops remaining
- **Minimal**: Mode icon only
- **Expanded**: Full journey context with progress bar

#### 1.4 Add Interactivity (Optional Phase)
- Button to show next departure alternatives
- Toggle to expand/collapse stop list
- Deep link to full app on tap

### Phase 2: Native Module Bridge

#### 2.1 Create Expo Module (expo-live-activity)
```
app/
  modules/
    expo-live-activity/
      ios/
        ExpoLiveActivityModule.swift
        ExpoLiveActivityModule.m
      src/
        index.ts
        ExpoLiveActivity.types.ts
      expo-module.config.json
```

#### 2.2 Implement Swift Bridge Functions
- `startActivity(attributes, contentState)` → returns activityId + pushToken
- `updateActivity(activityId, contentState)` 
- `endActivity(activityId, finalState, dismissalPolicy)`
- `areActivitiesEnabled()` → boolean
- `getActiveActivities()` → array of active activity IDs

#### 2.3 Push Token Handling
- Observe `pushTokenUpdates` async sequence
- Send push token to backend when available/updated
- Handle token invalidation

### Phase 3: Backend Implementation

#### 3.1 API Endpoints

```typescript
// POST /api/live-activity/register
// Register a new Live Activity and store push token
{
  activityId: string,
  pushToken: string,
  journey: {
    tripId: string,
    originId: string,
    destinationId: string,
    legs: Leg[],
    plannedDeparture: string,
    plannedArrival: string
  }
}

// GET /api/live-activity/:activityId/state
// Get current journey state (for local updates)

// DELETE /api/live-activity/:activityId
// End activity and cleanup

// POST /api/live-activity/:activityId/end
// End with final state
```

#### 3.2 Live Activity Manager Service
- Track active activities in Redis with TTL (max 8 hours)
- Poll realtime data and compute journey state
- Determine when to send push updates
- Handle journey phase transitions

#### 3.3 ~~APNs Push Service~~ NOTE THAT WE WILL USE EXPO NOTIFICATION PUSH SERVICE
- Implement ActivityKit push notification format
- Use `apns-push-type: liveactivity` header
- Send `event: update` or `event: end` payloads
- Handle frequent updates (configured in Info.plist)

### Phase 4: React Native Integration

#### 4.1 useLiveActivity Hook
```typescript
function useLiveActivity() {
  return {
    isSupported: boolean,
    isEnabled: boolean,
    activeActivity: ActivityInfo | null,
    startActivity: (journey: Journey) => Promise<string>,
    updateActivity: (state: ContentState) => Promise<void>,
    endActivity: () => Promise<void>,
  }
}
```

#### 4.2 UI Integration
- Add "Go" button to trip selection screen
- Show Live Activity status indicator
- Handle activity lifecycle (start, running, ended)
- Deep link handling from Live Activity taps

### Phase 5: Dynamic Island Polish

#### 5.1 Animations
- Smooth countdown transitions
- Phase change animations
- Progress bar animations

#### 5.2 Edge Cases
- Multiple Live Activities (show most relevant)
- StandBy mode support
- CarPlay support (future)

---

## Technical Constraints

### Apple Live Activity Limits
- **Max duration**: 8 hours active, then auto-ends
- **Lock Screen retention**: Up to 4 hours after ending
- **Update frequency**: Standard ~1/hour, Frequent updates with special entitlement
- **Image size**: Must fit presentation size (e.g., minimal ≤ 45x36.67pt)
- **No network/location**: Live Activity runs in sandbox, must receive updates via push

### Push Notification Requirements
- **APNs Setup**: Requires Apple Developer account with Push Notification capability
- **Token-based auth**: Use `.p8` key file for APNs authentication
- **Content-State**: JSON payload must match Swift `ContentState` exactly
- **Timestamps**: Required in payload for ordering updates

### Expo/React Native Considerations
- **Prebuild required**: Must run `npx expo prebuild` after changes
- **@bacons/apple-targets**: Handles widget extension bundling
- **App Groups**: Required for sharing data between app and widget extension

---

## Files to Create/Modify

### New Files

```
app/
  targets/
    widget/
      BilbyLiveActivity.swift       # Main Live Activity implementation
      BilbyTripAttributes.swift     # Data models
      Views/
        LockScreenView.swift        # Lock screen presentation
        DynamicIslandView.swift     # Dynamic Island presentations
        Components/
          LineBadgeView.swift       # Transport line badge
          CountdownView.swift       # Time countdown
          ProgressView.swift        # Journey progress
      
  modules/
    expo-live-activity/
      ios/
        ExpoLiveActivityModule.swift
      src/
        index.ts
        types.ts
      expo-module.config.json
      
  hooks/
    use-live-activity.ts            # React hook for Live Activity
    
  components/
    live-activity/
      go-button.tsx                 # Start Live Activity button
      activity-status.tsx           # Current activity indicator

backend/
  src/
    api/
      live-activity.ts              # API endpoints
    lib/
      live-activity-manager.ts      # Activity state management
      apns-client.ts                # APNs push client
    types/
      live-activity.ts              # Shared types
```

### Modified Files

```
app/
  targets/
    widget/
      index.swift                   # Add BilbyLiveActivity to bundle
      expo-target.config.js         # Add entitlements
      Info.plist                    # NSSupportsLiveActivities = YES
      
  app.json                          # Add push notification config
  
backend/
  src/
    api/
      index.ts                      # Register live-activity routes
    index.ts                        # Initialize APNs client
```

---

## UX Design Details

### Lock Screen Layout

```
┌─────────────────────────────────────────────────┐
│  [T1]  Central                         12 min  │
│        Platform 18 • On time              ▼    │
│  ─────────────────────────────────────────────  │
│  ● Epping                            08:42     │
│  │                                             │
│  ○ Chatswood                         08:51     │
│  ○ North Sydney                      08:58     │
│  ○ Wynyard                           09:02     │
│  ◉ Central ← Your stop               09:08     │
└─────────────────────────────────────────────────┘
```

### Dynamic Island Compact

```
┌──────────────────────────────────────────┐
│  [T1]                              12min │
│  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀                    │
└──────────────────────────────────────────┘
```

### Dynamic Island Expanded

```
┌─────────────────────────────────────────────────┐
│  [T1]   to Central              ════════════▶  │
│                                                 │
│  Departing Epping • Platform 18                 │
│                                                 │
│  ●──────○──────○──────○──────◉                 │
│  Epping  Chats  NSyd  Wynyard Central          │
│                                                 │
│            Arrives 09:08 • 12 min              │
└─────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Live Activity starts when user taps "Go" on journey
- [ ] Lock Screen shows correct journey information
- [ ] Dynamic Island compact shows line + countdown
- [ ] Dynamic Island expanded shows full journey
- [ ] Push notifications update the Live Activity
- [ ] Activity ends when journey completes
- [ ] Delays are reflected in real-time
- [ ] Cancellations show appropriate messaging
- [ ] Tapping activity deep links to app
- [ ] Activity persists when app is backgrounded
- [ ] Multiple journeys handled correctly
- [ ] StandBy mode displays correctly
- [ ] Location tracking automatically updates journey phase
- [ ] Walking directions shown with distance and compass
- [ ] Phase transitions work correctly based on proximity

---

## Implementation Order

1. ✅ **Swift Data Models** - BilbyTripAttributes, ContentState, TripPhase
2. ✅ **Basic Lock Screen View** - Simple layout with line, destination, time
3. ✅ **Native Module Bridge** - Start/update/end functions
4. ✅ **Backend Registration** - Store push tokens, activity state
5. ✅ **React Hook** - useLiveActivity with start/end
6. 🔄 **UI Integration** - "Go" button on trip screen
7. ✅ **Push Updates** - Backend sends updates via Expo Push Service
8. ✅ **Dynamic Island** - Compact, minimal, expanded views
9. 🔄 **Location Tracking** - Auto-cycle journey phases based on user location
10. ⬚ **Polish** - Animations, transitions, edge cases
11. ⬚ **Interactivity** - Buttons in Live Activity (optional)

---

## Dependencies

### Already Installed
- `@bacons/apple-targets` - Widget extension support
- `expo-notifications` - Push notification infrastructure
- `expo-server-sdk` - Backend push notification service
- `expo-location` - Location tracking for phase detection

### To Install
```bash
# In app directory
npx expo install expo-task-manager
```

### Configuration Required
- Apple Developer: Enable Push Notifications capability
- Apple Developer: Configure App Groups for data sharing
- Apple Developer: Enable Background Modes (Location updates)
- Info.plist: `NSSupportsLiveActivities = YES`
- Info.plist: `NSSupportsLiveActivitiesFrequentUpdates = YES` (optional)
- Info.plist: `NSLocationWhenInUseUsageDescription`
- Info.plist: `NSLocationAlwaysAndWhenInUseUsageDescription`
- Environment: `EXPO_ACCESS_TOKEN` for enhanced push security (optional)
- Environment: `EXPO_PUBLIC_PROJECT_ID` for Expo push tokens

---

## Push Notification Architecture

We use **Expo Push Service** instead of direct APNs for Live Activity updates:

```
1. App starts Live Activity → Gets ActivityKit push token
2. App registers with backend → Sends Expo push token + activity info
3. Backend stores activity state in Redis
4. Backend periodically computes new state from realtime data
5. Backend sends silent push via Expo Push Service
6. App receives push → Updates Live Activity locally via native module
```

This approach:
- ✅ Uses existing Expo infrastructure
- ✅ No APNs certificate management required
- ✅ Works with Expo's push notification service
- ✅ App can update Live Activity when woken by push

---

## Location-Based Journey Tracking

The app uses real-time location to automatically cycle through journey phases:

### Location Tracking Flow

```
1. User starts Live Activity → App requests location permission
2. App starts background location tracking
3. Location updates trigger phase calculations:
   - Distance to next stop/waypoint
   - Proximity to boarding/alighting points
   - Walking vs transit detection
4. Phase changes update Live Activity locally
5. Navigation instructions shown for walking legs
```

### Phase Detection Logic

| Phase | Detection Criteria |
|-------|-------------------|
| **Walking to Stop** | User location > 50m from origin stop |
| **Waiting** | User location ≤ 50m from stop, before departure time |
| **On Vehicle** | After departure time OR moving along route at transit speed |
| **Transferring** | Arrived at intermediate stop, walking to next platform |
| **Arriving** | Within 500m of destination OR 1 stop remaining |
| **Completed** | User location ≤ 100m from final destination |

### Navigation Instructions

For walking legs, the Live Activity displays:
- **Distance remaining** to next stop
- **Direction** (compass bearing or turn-by-turn)
- **ETA** based on walking speed
- **Street name** when available

### ContentState Extensions for Navigation

```swift
// Additional fields for navigation
var walkingDistanceMeters: Int?      // Distance to next waypoint
var walkingDirection: String?         // "Head north on George St"
var walkingBearing: Double?           // Compass bearing (0-360)
var userLatitude: Double?             // Current user position
var userLongitude: Double?
```

### Files for Location Tracking

```
app/
  hooks/
    use-journey-location.ts           # Location tracking + phase detection
  lib/
    geo-utils.ts                      # Distance, bearing calculations
    phase-detector.ts                 # Journey phase state machine
```
