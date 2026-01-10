# L2-01: Backend Foundation — Setup

**Parent:** L1-01 (Backend Foundation)  
**Status:** ✅ Complete  
**Estimated Effort:** 4-6 hours

---

## Overview

This L2 plan covers the complete setup of the backend infrastructure, including:
- Express server structure for Vercel serverless
- Redis Cloud connection
- Environment configuration
- Project scaffolding
- Health check endpoint

---

## Tasks

### T01: Project Structure & TypeScript Config

**Goal:** Establish clean project structure following architecture guidelines.

**Files to create/modify:**
```
backend/
├── src/
│   ├── index.ts              # Express app entry (modify existing)
│   ├── api/                  # API route handlers
│   │   └── health.ts         # Health check endpoint
│   ├── lib/                  # Shared utilities
│   │   ├── redis.ts          # Redis client singleton
│   │   ├── env.ts            # Environment variable loader
│   │   └── errors.ts         # Error types and handler
│   ├── middleware/           # Express middleware
│   │   ├── cors.ts           # CORS configuration
│   │   ├── error-handler.ts  # Global error handler
│   │   └── request-logger.ts # Request logging
│   └── types/                # TypeScript type definitions
│       └── index.ts          # Shared types
├── vercel.json               # Vercel deployment config
├── .env.example              # Environment template
├── tsconfig.json             # TypeScript config (modify)
└── package.json              # Dependencies (modify)
```

**Acceptance Criteria:**
- [ ] All directories created
- [ ] TypeScript strict mode enabled
- [ ] Path aliases configured (`@/` → `src/`)
- [ ] ESM modules working correctly

---

### T02: TypeScript Configuration

**Goal:** Configure TypeScript for strict mode and Vercel compatibility.

**File:** `backend/tsconfig.json`

**Changes:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Acceptance Criteria:**
- [ ] Strict mode enabled
- [ ] No TypeScript errors in existing code
- [ ] Path aliases resolve correctly

---

### T03: Package Dependencies

**Goal:** Add required dependencies for backend functionality.

**File:** `backend/package.json`

**Dependencies to add:**
```json
{
  "dependencies": {
    "express": "5.1.0",
    "redis": "^5.10.0",
    "cors": "^2.8.5",
    "zod": "^3.24.0",
    "dotenv": "^16.5.0"
  },
  "devDependencies": {
    "@types/express": "5.0.0",
    "@types/node": "20.11.17",
    "@types/cors": "^2.8.17",
    "typescript": "5.8.3",
    "@vercel/node": "^5.0.0"
  }
}
```

**New dependencies explained:**
- `cors` — Cross-origin resource sharing
- `zod` — Runtime validation and type inference
- `dotenv` — Environment variable loading (dev only)
- `@vercel/node` — Vercel serverless types

**Acceptance Criteria:**
- [ ] All dependencies install without errors
- [ ] No version conflicts

---

### T04: Environment Configuration

**Goal:** Set up environment variable management.

**File:** `backend/.env.example`
```env
# Redis Cloud
REDIS_URL=redis://default:password@host:port

# TfNSW API (for later use)
TFNSW_API_KEY=your_api_key_here

# Supabase (for later use)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_secret_key_here

# Environment
NODE_ENV=development
```

**File:** `backend/src/lib/env.ts`
```typescript
// Type-safe environment variable access
// Validates required vars at startup
// Throws clear errors for missing config
```

**Acceptance Criteria:**
- [ ] `.env.example` documents all expected variables
- [ ] `env.ts` exports typed configuration object
- [ ] Missing required vars throw at startup (not runtime)
- [ ] `.env` added to `.gitignore`

---

### T05: Redis Client

**Goal:** Create Redis client singleton with connection handling.

**File:** `backend/src/lib/redis.ts`

**Implementation requirements:**
- Singleton pattern (reuse connection across requests in serverless)
- Lazy connection (connect on first use)
- Connection health check method
- Graceful error handling for connection failures
- Automatic reconnection
- URL-based configuration from environment

**Key functions:**
```typescript
export const redis: RedisClientType        // Client instance
export async function getRedis()           // Get connected client
export async function checkRedisHealth()   // Returns { connected: boolean, latency?: number }
export async function closeRedis()         // Graceful shutdown
```

**Acceptance Criteria:**
- [ ] Connection established on first `getRedis()` call
- [ ] Health check returns latency in ms
- [ ] Handles connection errors gracefully
- [ ] Works in Vercel serverless context (connection reuse)

---

### T06: Express Application Setup

**Goal:** Configure Express with middleware stack.

**File:** `backend/src/index.ts`

**Middleware order:**
1. CORS
2. JSON body parser
3. Request logger
4. API routes
5. 404 handler
6. Global error handler

**Implementation requirements:**
- Export `app` as default for Vercel
- Trust proxy (for correct client IP behind Vercel)
- JSON limit (e.g., 1mb)
- Strict routing disabled

**Acceptance Criteria:**
- [ ] Middleware applied in correct order
- [ ] CORS allows requests from mobile app origins
- [ ] JSON parsing works for POST requests
- [ ] Errors return structured JSON responses

---

### T07: CORS Middleware

**Goal:** Configure CORS for mobile app access.

**File:** `backend/src/middleware/cors.ts`

**Configuration:**
```typescript
// Development: Allow all origins (localhost, simulators)
// Production: Restrict to known app origins
// Methods: GET, POST, PUT, DELETE, OPTIONS
// Headers: Content-Type, Authorization
// Credentials: true (for auth cookies if needed)
```

**Acceptance Criteria:**
- [ ] Mobile simulators can make requests
- [ ] Preflight OPTIONS requests handled
- [ ] Production restricts origins appropriately

---

### T08: Error Handler Middleware

**Goal:** Consistent error responses across all endpoints.

**File:** `backend/src/lib/errors.ts`
```typescript
// Custom error classes
export class AppError extends Error {
  statusCode: number
  code: string
  isOperational: boolean
}

export class NotFoundError extends AppError {}
export class ValidationError extends AppError {}
export class UnauthorizedError extends AppError {}
export class ServiceUnavailableError extends AppError {}
```

**File:** `backend/src/middleware/error-handler.ts`
```typescript
// Global error handler
// Logs errors (with stack trace in dev)
// Returns structured JSON:
// {
//   error: {
//     code: string,
//     message: string,
//     details?: unknown
//   }
// }
```

**Acceptance Criteria:**
- [ ] All errors return JSON (never HTML)
- [ ] Stack traces only in development
- [ ] Unknown errors return 500 with generic message
- [ ] Known errors (AppError) return appropriate status

---

### T09: Request Logger Middleware

**Goal:** Log incoming requests for debugging.

**File:** `backend/src/middleware/request-logger.ts`

**Log format:**
```
[timestamp] METHOD /path - STATUS - DURATIONms
```

**Implementation:**
- Log on response finish (not request start)
- Include response time
- Skip health check endpoint (too noisy)
- Use console.log (Vercel captures these)

**Acceptance Criteria:**
- [ ] All requests logged (except health check)
- [ ] Response time included
- [ ] No sensitive data logged

---

### T10: Health Check Endpoint

**Goal:** Endpoint for monitoring and deployment verification.

**File:** `backend/src/api/health.ts`

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-09T10:00:00.000Z",
  "services": {
    "redis": {
      "connected": true,
      "latencyMs": 5
    }
  },
  "version": "1.0.0"
}
```

**Implementation:**
- Check Redis connection
- Return degraded status if Redis unavailable (not error)
- Include version from package.json

**Acceptance Criteria:**
- [ ] Returns 200 when healthy
- [ ] Returns 200 with degraded info if Redis down (not 500)
- [ ] Response time < 100ms normally

---

### T11: Vercel Configuration

**Goal:** Configure Vercel for Express deployment.

**File:** `backend/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "crons": []
}
```

**Notes:**
- Vercel automatically handles Express with `@vercel/node`
- All routes directed to Express app
- Crons array prepared for future pollers (L1-02)
- Region can be set to `syd1` for Sydney proximity

**Acceptance Criteria:**
- [ ] `vercel dev` runs locally
- [ ] Routes correctly handled by Express
- [ ] Build succeeds without errors

---

### T12: API Router Setup

**Goal:** Set up modular route structure.

**File:** `backend/src/api/index.ts`

```typescript
// Router that mounts all API routes
// /api/health → health.ts
// Future: /api/trips, /api/departures, etc.
```

**Acceptance Criteria:**
- [ ] Health endpoint accessible at `/api/health`
- [ ] Easy to add new route modules
- [ ] 404 for unknown API routes

---

## Testing Checklist

After implementation, verify:

- [ ] `pnpm install` succeeds
- [ ] `vercel dev` starts server on localhost:3000
- [ ] `GET http://localhost:3000/api/health` returns 200 with status
- [ ] CORS headers present in response
- [ ] Invalid routes return 404 JSON error
- [ ] Redis connection established (if REDIS_URL set)
- [ ] Health check shows Redis status
- [ ] TypeScript compiles with no errors (`pnpm tsc --noEmit`)

---

## Implementation Order

1. **T01** → Create directory structure
2. **T02** → TypeScript configuration
3. **T03** → Install dependencies
4. **T04** → Environment configuration
5. **T05** → Redis client
6. **T06** → Express app setup
7. **T07** → CORS middleware
8. **T08** → Error handling
9. **T09** → Request logger
10. **T10** → Health endpoint
11. **T11** → Vercel config
12. **T12** → API router

---

## Notes & Decisions

### Why `redis` package over `ioredis`?
The `redis` package (node-redis) is already in the skeleton and is the official Redis client. It has good Vercel/serverless support. `ioredis` has more features (cluster, sentinel) but we don't need them initially.

### Why not Edge Functions for API?
Express is more flexible for our needs (middleware, routing). Edge Functions are better for the pollers (L1-02) where we need fast, lightweight execution. The API can still benefit from Vercel's Fluid Compute model.

### Vercel Serverless Connection Reuse
In Vercel serverless, the same instance may handle multiple requests. We use a singleton Redis client to reuse connections within an instance lifetime, avoiding connection overhead per request.

### Future Considerations
- Add rate limiting middleware (before L1-04)
- Add request ID tracking for debugging
- Consider Pino for structured logging if needed

---

## Definition of Done

- [ ] All tasks completed
- [ ] Testing checklist passes
- [ ] Code compiles without TypeScript errors
- [ ] `vercel dev` runs successfully
- [ ] Health endpoint returns correct response
- [ ] Ready to proceed to L1-02 (TfNSW Data Layer)
