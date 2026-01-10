# L2-04: Supabase Integration

**Parent:** L1-04 (Supabase Integration)  
**Status:** ✅ Complete  
**Estimated Effort:** 6-8 hours

---

## Overview

Set up authentication and user data persistence using Supabase. All core features work without auth (guest mode); authentication unlocks data persistence only.

---

## Supabase Project

- **Project ID:** `bwpcstzctimomoofucdr`
- **Region:** `ap-northeast-2` (Seoul - close to Sydney users)
- **Database:** PostgreSQL 17.6

---

## Tasks

### T01: Database Schema

**Goal:** Create tables for user data with RLS policies.

**Tables:**

```sql
-- profiles: User profile data (auto-created on signup)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  display_name text,
  home_stop_id text,
  work_stop_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- saved_trips: User's saved/favorite trips
saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  origin_id text NOT NULL,
  origin_name text NOT NULL,
  destination_id text NOT NULL,
  destination_name text NOT NULL,
  preferred_strategy text DEFAULT 'best',
  is_favorite boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- recent_stops: Recently searched/used stops
recent_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  stop_id text NOT NULL,
  stop_name text NOT NULL,
  used_at timestamptz DEFAULT now(),
  use_count int DEFAULT 1,
  UNIQUE(user_id, stop_id)
)

-- preferences: User preferences/settings
preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  default_strategy text DEFAULT 'best',
  preferred_modes text[] DEFAULT '{}',
  accessibility_required boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  theme text DEFAULT 'system',
  updated_at timestamptz DEFAULT now()
)
```

**RLS Policies:**
- Users can only read/write their own data
- Use `auth.uid()` for ownership checks
- Consolidate policies per table for performance

**Acceptance Criteria:**
- [ ] All tables created with migrations
- [ ] RLS enabled on all tables
- [ ] Policies enforce user isolation

---

### T02: Supabase Client Setup

**Goal:** Configure Supabase client for server-side use.

**Files:**
- `backend/src/lib/supabase.ts` — Client factory
- `backend/src/types/database.ts` — Generated types

**Client types:**
- **Service client** — Uses service_role key, bypasses RLS (for admin operations)
- **User client** — Uses anon key + user JWT, respects RLS

**Acceptance Criteria:**
- [ ] Clients created with proper types
- [ ] Environment variables configured
- [ ] JWT verification working

---

### T03: Auth Middleware

**Goal:** JWT verification middleware for Express.

**File:** `backend/src/middleware/auth.ts`

**Features:**
- Extract Bearer token from Authorization header
- Verify JWT with Supabase
- Inject user context into request
- Optional auth (guest mode) vs required auth

**Middleware functions:**
```typescript
optionalAuth(req, res, next)  // Sets req.user if valid token, continues if not
requireAuth(req, res, next)   // Returns 401 if no valid token
```

**Acceptance Criteria:**
- [ ] Valid JWTs decoded and user attached
- [ ] Invalid/expired tokens rejected with 401
- [ ] Guest requests proceed without user

---

### T04: Auth Endpoints

**Goal:** Token verification endpoint for mobile app.

**File:** `backend/src/api/auth.ts`

**Endpoints:**
```
POST /api/auth/verify  — Verify token and return user info
GET /api/auth/me       — Get current user (requires auth)
```

**Acceptance Criteria:**
- [ ] Verification returns user ID and profile
- [ ] Invalid tokens return 401

---

### T05: User Trips Endpoints

**Goal:** CRUD for saved trips.

**File:** `backend/src/api/user/trips.ts`

**Endpoints:**
```
GET    /api/user/trips          — List user's saved trips
POST   /api/user/trips          — Save a new trip
GET    /api/user/trips/:id      — Get single trip
PUT    /api/user/trips/:id      — Update trip
DELETE /api/user/trips/:id      — Delete trip
POST   /api/user/trips/:id/use  — Mark trip as used (updates last_used_at)
```

**Acceptance Criteria:**
- [ ] All CRUD operations work
- [ ] User can only access own trips
- [ ] Favorites sorted first

---

### T06: User Preferences Endpoints

**Goal:** User preferences management.

**File:** `backend/src/api/user/preferences.ts`

**Endpoints:**
```
GET /api/user/preferences  — Get user preferences
PUT /api/user/preferences  — Update preferences
```

**Acceptance Criteria:**
- [ ] Preferences created on first access
- [ ] Partial updates supported

---

### T07: Recent Stops Endpoints

**Goal:** Track recently used stops for quick access.

**File:** `backend/src/api/user/recent-stops.ts`

**Endpoints:**
```
GET    /api/user/recent-stops      — List recent stops (sorted by recency)
POST   /api/user/recent-stops      — Add/update a recent stop
DELETE /api/user/recent-stops/:id  — Remove from recents
```

**Logic:**
- Upsert on add (increment use_count if exists)
- Limit to 20 most recent

**Acceptance Criteria:**
- [ ] Recents sorted by last used
- [ ] Duplicates increment count instead of creating new

---

### T08: Profile Endpoints

**Goal:** User profile management.

**File:** `backend/src/api/user/profile.ts`

**Endpoints:**
```
GET /api/user/profile  — Get user profile
PUT /api/user/profile  — Update profile (display name, home/work stops)
```

**Acceptance Criteria:**
- [ ] Profile auto-created on first access
- [ ] Home/work stops validated

---

## Implementation Order

1. **T01** → Database schema (migrations)
2. **T02** → Supabase client setup
3. **T03** → Auth middleware
4. **T04** → Auth endpoints
5. **T05** → Saved trips endpoints
6. **T06** → Preferences endpoints
7. **T07** → Recent stops endpoints
8. **T08** → Profile endpoints

---

## Environment Variables

```env
SUPABASE_URL=https://bwpcstzctimomoofucdr.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

---

## Testing Checklist

- [ ] Guest can use /api/trips without auth
- [ ] Auth middleware correctly verifies JWTs
- [ ] Users can save and retrieve trips
- [ ] RLS prevents cross-user data access
- [ ] Preferences persist correctly
- [ ] Recent stops track usage

---

## Definition of Done

- [ ] Database schema deployed
- [ ] Auth middleware functional
- [ ] All user endpoints implemented
- [ ] RLS policies enforced
- [ ] Ready to proceed to L1-05 (Mobile App)
