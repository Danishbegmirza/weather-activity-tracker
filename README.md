# AeroRank — Weather Activity Ranker

A full-stack TypeScript application that accepts a city or town and returns a **7-day ranking** of how desirable it will be to visit for four activities, based on real-time weather forecasts from Open-Meteo.

**Activities ranked:** Skiing · Surfing · Outdoor Sightseeing · Indoor Sightseeing

---

## Live Demo

| Component | URL |
|-----------|-----|
| Frontend | *Deploy to Vercel — see instructions below* |
| Backend API | *Deploy to Vercel — see instructions below* |
| GraphQL Playground | `http://localhost:4000/graphql` (local) |

---

## Project Structure

```
aerorank/
├── backend/                      # Node.js + Express + Apollo GraphQL
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── schema.ts             # GraphQL type definitions
│   │   ├── resolvers.ts          # Query resolvers
│   │   ├── config/               # Centralized configuration
│   │   ├── middleware/           # Rate limiter, logger, error handler
│   │   ├── services/             # Open-Meteo API client, cache
│   │   ├── scoring/              # Activity scoring strategies
│   │   └── utils/                # Logger, validation
│   └── .env.example              # Environment template
└── frontend/                     # React + Vite + Apollo Client
    └── src/
        ├── components/           # UI components
        ├── graphql/              # Apollo client + queries
        └── types.ts              # TypeScript interfaces
```

---

## Prerequisites

| Tool | Minimum Version |
|------|-----------------|
| Node.js | 18+ (20 recommended) |
| npm | 9+ |

If you manage Node versions with nvm:
```bash
nvm use 20
```

---

## 1. Backend Setup

### Install dependencies

```bash
cd backend
npm install
```

### Environment variables

Create `backend/.env` (copy from `.env.example`):

```env
# Server
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

# CORS — comma-separated allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=false

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL_SECONDS=1800

# Open-Meteo (optional — defaults to public endpoints)
OPEN_METEO_FORECAST_DAYS=7
OPEN_METEO_MAX_SEARCH_RESULTS=10
```

### Start the server

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm run build && npm start
```

API runs at `http://localhost:4000/graphql`.

### Run tests

```bash
npm test
```

---

## 2. Frontend Setup

### Install dependencies

```bash
cd frontend
npm install
```

### Environment variables

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

> **Note:** Vite only exposes variables prefixed with `VITE_` to client code.

### Start the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 3. Run Both Together (Monorepo)

From the project root:

```bash
npm install    # installs all workspace dependencies
npm run dev    # starts backend + frontend concurrently
```

---

## Deploying to Vercel

Both projects deploy independently on Vercel. Deploy the **backend first** so you have its URL for the frontend.

### Deploy Backend

1. Push the repo to GitHub.
2. In Vercel → **Add New Project** → import the repo → set **Root Directory** to `backend`.
3. Add these **Environment Variables** in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | Your frontend Vercel URL (e.g., `https://aerorank.vercel.app`) |
| `LOG_LEVEL` | `info` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |
| `CACHE_TTL_SECONDS` | `1800` |

4. Deploy. Note the deployed URL (e.g., `https://aerorank-api.vercel.app`).

### Deploy Frontend

1. In Vercel → **Add New Project** → same repo → set **Root Directory** to `frontend`.
2. Add this **Environment Variable**:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | Your backend Vercel URL (e.g., `https://aerorank-api.vercel.app`) |

3. Deploy.

---

## API Reference

**Base URL:** `http://localhost:4000` (local) or your deployed backend URL.

### Health Check

```bash
curl http://localhost:4000/health
```

**Response — 200 OK**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-19T10:00:00.000Z",
  "uptime": 3600.5
}
```

### Readiness Check

```bash
curl http://localhost:4000/ready
```

**Response — 200 OK**
```json
{
  "status": "ready",
  "timestamp": "2026-06-19T10:00:00.000Z"
}
```

---

### GraphQL: `searchCities`

Search for cities/towns by name.

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query SearchCities($query: String!) { searchCities(query: $query) { name latitude longitude country admin1 timezone } }",
    "variables": { "query": "Chamonix" }
  }'
```

**Response**
```json
{
  "data": {
    "searchCities": [
      {
        "name": "Chamonix",
        "latitude": 45.92375,
        "longitude": 6.86933,
        "country": "France",
        "admin1": "Auvergne-Rhône-Alpes",
        "timezone": "Europe/Paris"
      }
    ]
  }
}
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Query must be at least 2 characters |

---

### GraphQL: `getActivityRankings`

Get 7-day activity rankings for a location.

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetRankings($lat: Float!, $lon: Float!, $tz: String!, $city: String!, $country: String!) { getActivityRankings(latitude: $lat, longitude: $lon, timezone: $tz, cityName: $city, country: $country) { city { name country } rankings { name overallScore dailyScores { date score reasoning } } } }",
    "variables": {
      "lat": 43.4806,
      "lon": -1.5568,
      "tz": "Europe/Paris",
      "city": "Biarritz",
      "country": "France"
    }
  }'
```

**Response**
```json
{
  "data": {
    "getActivityRankings": {
      "city": {
        "name": "Biarritz",
        "country": "France"
      },
      "rankings": [
        {
          "name": "Surfing",
          "overallScore": 72,
          "dailyScores": [
            {
              "date": "2026-06-19",
              "score": 85,
              "reasoning": "Optimal wave height (1.5m). Excellent long-period groundswell (12s)."
            }
          ]
        },
        {
          "name": "Outdoor Sightseeing",
          "overallScore": 68,
          "dailyScores": [...]
        }
      ]
    }
  }
}
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Validation error (e.g., latitude out of range, invalid timezone) |
| 502 | External API (Open-Meteo) unavailable |

**Validation Rules:**
- `latitude`: must be between -90 and 90
- `longitude`: must be between -180 and 180
- `timezone`: must match `Region/City` format or `UTC`
- `cityName`, `country`: required, max 100 characters

---

## Key Design Decisions

### Backend

#### Strategy Pattern for Scoring
Each activity (Skiing, Surfing, etc.) implements `ActivityScoringStrategy`. New activities can be added by creating a new strategy class and registering it with `ScoringEngine` — no changes to existing code required.

```typescript
interface ActivityScoringStrategy {
  id: string;      // Stable identifier for lookups and GraphQL
  label: string;   // Human-readable display name (can change without breaking code)
  computeScore(metrics: WeatherMetrics): ScoringResult;
}

interface ScoringResult {
  score: number;
  reasoning: string;
  reasons: StructuredReason[];  // Code-based for programmatic access
}
```

The separation of `id` (stable) from `label` (display) prevents brittle string-matching when activity names change. Structured reason codes replace substring matching for control flow.

#### Open-Meteo Integration
- **Geocoding API** for city search with autocomplete
- **Forecast API** for temperature, precipitation, wind, weather codes, humidity
- **Marine API** for wave height/period (surfing scores)

**Resilience features:**
- **Timeout + retry**: All outbound requests use `AbortSignal.timeout()` (10s default) with exponential backoff retry
- **Zod validation**: Upstream JSON is validated against schemas to catch malformed responses early
- **Graceful fallback**: Marine API returns null wave data for inland locations instead of failing

#### In-Memory Cache with LRU Eviction
Weather data is cached for 30 minutes (configurable) per coordinate pair. Cache keys are rounded to 4 decimal places (~11m precision) to maximize hit rate.

```typescript
const cacheKey = `rankings_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
```

**Production-grade features:**
- **Request coalescing**: Concurrent cache misses for the same key share a single in-flight fetch (prevents thundering herd)
- **LRU eviction**: Bounded to `CACHE_MAX_ENTRIES` (default 1000) — least recently accessed entries evicted when full
- **Periodic cleanup**: Expired entries swept every 5 minutes

#### Pino Structured Logging
All logs are JSON-formatted in production for log aggregation tools. Development mode uses `pino-pretty` for human-readable output. Every request includes a UUID for distributed tracing.

#### Rate Limiting & GraphQL Security
- **Rate limiting**: 100 requests/minute per IP (configurable)
- **Query depth limiting**: Capped at 7 levels deep to prevent malicious nested queries
- **Introspection disabled** in production

#### Input Validation
All GraphQL inputs are validated before reaching the service layer. Validation errors return `BAD_USER_INPUT` error codes with descriptive messages.

#### Graceful Shutdown
SIGTERM/SIGINT handlers allow in-flight requests to complete (10s timeout) before the process exits.

### Frontend

#### Apollo Client
GraphQL queries with automatic caching, loading states, and error handling. The client is configured to proxy through Vite in development.

```typescript
const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
});
```

#### Component Architecture
| Component | Responsibility |
|-----------|----------------|
| `SearchBar` | Accessible city autocomplete with keyboard navigation |
| `RankingDashboard` | Activity cards sorted by score with sparklines |
| `DailyBreakdown` | Per-day weather details and score reasoning |
| `HistorySidebar` | Recent searches persisted in `localStorage` |
| `ErrorBoundary` | Catches render errors, shows recovery UI |

#### Debounced Search
Search queries are debounced (300ms) to reduce API calls while typing.

#### Accessibility (a11y)
- **ARIA attributes**: `role="listbox"`, `aria-activedescendant`, `aria-expanded` on autocomplete
- **Keyboard navigation**: Arrow keys, Enter, Escape, Home/End in search dropdown
- **Screen reader support**: Visually hidden labels, live regions for status updates

#### Lucide React Icons
Lightweight, tree-shakeable icons for activity types (Snowflake, Waves, Camera, Landmark).

#### CSS Variables for Theming
Score colors (`--score-excellent`, `--score-good`, etc.) and activity accents are defined as CSS custom properties for easy theming.

---

## Scoring Model

| Activity | Primary Signals | Score Range |
|----------|-----------------|-------------|
| **Skiing** | Sub-freezing temps, fresh snowfall, rain penalty, wind >50km/h = 0 | 0–100 |
| **Surfing** | Wave height (1–2.5m optimal), wave period (>9s ideal), wind penalty | 0–100 |
| **Outdoor Sightseeing** | Temp 18–25°C ideal, clear skies, low wind, no precipitation, humidity comfort | 0–100 |
| **Indoor Sightseeing** | Inverse of outdoor — higher when weather is poor | 30–95 |

`overallScore` = average of 7 daily scores. Rankings sorted descending.

Scoring thresholds are externalized in `scoringConfig.ts` for easy tuning without code changes.

---

## How AI Assisted

AI tools (Cursor / ChatGPT) were used as a **productivity aid**:

| Task | AI Contribution | Human Judgment |
|------|-----------------|----------------|
| Boilerplate | GraphQL schema, Vite setup | Architecture decisions |
| Scoring heuristics | Initial thresholds | Fine-tuning (e.g., wind cutoff) |
| UI structure | Component layout | UX flow |
| Tests | Edge case generation | Test selection |
| Production hardening | Middleware patterns, cache coalescing | Config defaults |
| Accessibility | ARIA patterns, keyboard handlers | Interaction design |
| Code review fixes | Implementation of specific patterns | Trade-off decisions |

**Key decisions made without AI:**
- Strategy pattern vs. monolithic scoring function
- Marine API fallback for inland cities
- Daily `reasoning` strings for transparency
- Rate limit thresholds
- Separating strategy `id` from `label` to prevent brittle string matching

---

## Omissions & Trade-offs

### Intentionally Skipped

| Omitted | Reason |
|---------|--------|
| User accounts | Out of scope for weather demo |
| Database | No persistent data needed |
| Redis cache | In-memory sufficient for single instance |
| Docker/CI | Not required for assessment |
| Frontend tests | Time budget; manual testing |

### Known Shortcuts & Fixes

| Shortcut | Fix |
|----------|-----|
| Client passes city metadata alongside coordinates | Re-geocode server-side or use result ID |
| Skiing ignores resort proximity | Integrate ski-resort database |
| Surfing uses city-center marine data | Snap to nearest coastline |
| In-memory cache lost on restart | Use Redis |
| No API versioning | Add `/graphql/v1` |
| No authentication | Add JWT/API key for production |

---

## External APIs

All data from [Open-Meteo](https://open-meteo.com/) (free, no API key required):

| API | Purpose |
|-----|---------|
| [Geocoding](https://open-meteo.com/en/docs/geocoding-api) | City search |
| [Weather Forecast](https://open-meteo.com/en/docs) | Temperature, precipitation, wind |
| [Marine Weather](https://open-meteo.com/en/docs/marine-weather-api) | Wave height, period |

> **Disclaimer:** Scores are heuristic recommendations — not suitable for safety-critical decisions (avalanche risk, surf rescue, etc.).

---

## Tech Stack

### Backend
| Package | Purpose |
|---------|---------|
| `@apollo/server` | GraphQL server |
| `express` | HTTP framework |
| `zod` | Schema validation for API responses |
| `graphql-depth-limit` | Query depth limiting |
| `pino` / `pino-pretty` | Structured logging |
| `express-rate-limit` | Rate limiting |
| `helmet` | Security headers |
| `compression` | Gzip responses |
| `jest` / `ts-jest` | Unit testing |

### Frontend
| Package | Purpose |
|---------|---------|
| `react` | UI framework |
| `vite` | Build tool |
| `@apollo/client` | GraphQL client |
| `lucide-react` | Icons |

---

## License

Private assessment project.
