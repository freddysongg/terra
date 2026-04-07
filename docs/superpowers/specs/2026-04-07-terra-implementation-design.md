# TERRA — Full Implementation Design Spec

## Overview

Design spec for building TERRA from the current state (monorepo scaffolded, globe scene migrated, EONET client + route built, stores defined) to a complete 3-phase implementation covering all 6 API sources, full UI, marker system, enhancement layers, and infrastructure.

This spec resolves contradictions between the APP-BREAKDOWN and API-STRUCTURE documents, locks in architectural decisions made during design review, and defines the phased build order optimized for parallel agent dispatch via GitHub Issues.

---

## Resolved Contradictions

Conflicts between APP-BREAKDOWN, API-STRUCTURE, and existing code that were resolved during design review:

| Conflict | APP-BREAKDOWN says | API-STRUCTURE / code says | Resolution |
|---|---|---|---|
| Serving model | Single process, no CORS (ID-07, ID-08) | Vite proxy + CORS plugin exists | **Hybrid** — two-process in dev (Vite + Fastify, Vite proxies `/api`), single-process in prod (Fastify serves built assets). CORS plugin conditional on dev mode. |
| NWS activation | Manual toggle only (section 5) | Auto-activates over US (layer summary) | **Manual toggle, US-scoped** — user enables NWS manually, data only fetches/renders when viewport is over US. No auto-activation. |
| Auto-rotation | Stops permanently on first interaction (section 3) | Resumes after 3s delay (globe-scene.ts:87-98) | **Stops permanently** — fix existing code to match spec. No resume. |
| FIRMS rendering | Heatmap at wide zoom, dots at continental (EM-16, EM-17) | N/A | **Dots only at all zoom levels** — heatmap dropped. Instanced dots at every zoom level. |

---

## Architectural Decisions

### Serving model: hybrid

- **Dev:** Vite dev server (port 5173) + Fastify (port 3001). Vite proxies `/api` and `/health` to Fastify. CORS plugin active.
- **Prod:** Fastify serves built React assets at `/*` and API at `/api/*`. Single port. No CORS needed.
- CORS plugin is conditional: enabled when `NODE_ENV !== 'production'`.

### Marker system: globe owns it

- `MarkerManager` is a module inside `packages/frontend/src/globe/`.
- `GlobeScene` creates, owns, and disposes it.
- `MarkerManager` subscribes directly to `event-store` and `layer-store` via `store.subscribe()`.
- Click handling via raycasting on the canvas. On hit → writes `selectedEventId` + `selectedEventScreenPosition` to `event-store`. On miss → clears selection.
- Back-face culling runs per frame: `dot(markerNormal, cameraDirection) < 0` → remove from DOM.
- EONET markers use `CSS2DRenderer` (DOM-based, with CSS animations and icons).
- Enhancement markers (Phase 2) use `InstancedMesh` via a separate `EnhancementRenderer` module, also owned by `GlobeScene`.
- React never touches Three.js objects. Three.js never renders DOM UI. Zustand stores are the only bridge.

### Frontend data fetching: custom hooks per source

- One hook per API source. No shared abstraction.
- Each hook encapsulates: start condition, polling interval, store writes, error handling, cleanup.
- Individually unit-testable with Vitest.

### Store architecture: split data-store

Four Zustand stores with clear ownership:

| Store | Owns |
|---|---|
| `event-store` | EONET events, selectedEventId, selectedEventScreenPosition, hoveredEventId, filters, searchQuery |
| `data-store` (new) | earthquakes, fireHotspots, nwsAlerts, spaceWeather, activeImageryUrl |
| `layer-store` | activeLayers Set, toggleLayer() |
| `globe-store` | isLoaded, loadProgress, cameraPosition, performanceMode |

Cross-store communication: stores import each other's `getState()` inside actions when needed. Three.js modules subscribe imperatively to multiple stores via `store.subscribe()`.

### Auto-rotation: stop permanently

First user interaction (drag, scroll) stops auto-rotation for the session. No resume. Existing `globe-scene.ts` resume-after-delay timer to be removed.

### Event popup: rotation closes it

Globe rotation closes the popup. Popup does not follow the marker. No detach behavior. User positions globe first, then clicks marker.

### Panel initial state: both expanded

EventFeed (left) and LayerPanel (right) both start expanded on initial load.

---

## Shared Type Additions

### New type: `NwsAlert`

Add to `packages/shared/src/types/`:

```typescript
export interface NwsAlert {
  id: string;
  event: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  headline: string;
  description: string;
  geometry: NwsAlertGeometry | null;
  onset: string;
  expiration: string;
}

export interface NwsAlertGeometry {
  type: "Polygon";
  coordinates: number[][][];
}
```

### Updated `EnhancementLayerId`

```typescript
type EnhancementLayerId = "fireDensity" | "seismicDensity" | "weatherAlerts";
```

`"weatherAlerts"` added to the union. `LAYER_REGISTRY` in constants updated to include the new entry.

---

## Backend Service Architecture

### Service contract

Every API client follows this pattern:

```
class XxxClient {
  constructor(cache: TtlCache<T>, fetchFn: FetchFn)
  async getData(...params): Promise<ApiResponse<T>>
  private fallbackOrError(reason: string): ApiResponse<T>
}
```

Every route file follows this pattern:

```
registerXxxRoute(app: FastifyInstance): Promise<void>
  - creates own TtlCache with source-specific TTL
  - creates own client instance
  - registers GET endpoint(s)
  - maps ApiResponse.status to HTTP status codes
  - sets X-Cache header on stale responses
```

### Client breakdown

| Client | File | Route | Upstream format | Output type | TTL |
|---|---|---|---|---|---|
| `EonetClient` | `eonet-client.ts` | `/api/events`, `/api/events/:id`, `/api/categories` | JSON | `NaturalEvent[]` | 10 min |
| `FirmsClient` | `firms-client.ts` | `/api/fires` | CSV | `FireHotspot[]` | 30 min |
| `UsgsClient` | `usgs-client.ts` | `/api/earthquakes` | GeoJSON | `Earthquake[]` | 5 min |
| `NwsClient` | `nws-client.ts` | `/api/alerts` | GeoJSON (CAP) | `NwsAlert[]` | 3 min |
| `DonkiClient` | `donki-client.ts` | `/api/space-weather` | JSON | `SpaceWeatherSummary` | 20 min |
| `GibsService` | `gibs-service.ts` | `/api/imagery/:layer` | N/A (URL builder) | Tile URL string | 24 hr |

### Special patterns

**DONKI dual-fetch:** `DonkiClient.getData()` fetches both `/FLR` (solar flares) and `/GST` (geomagnetic storms) concurrently via `Promise.allSettled`. Results merged into a single `SpaceWeatherSummary`. Single cache key for the merged result. If one endpoint fails and the other succeeds, return partial data — the successful portion populates normally, the failed portion returns an empty array (`[]`). The `SpaceWeatherSummary` type uses non-nullable arrays (`readonly SolarFlare[]`, `readonly GeomagneticStorm[]`) so consumers always get arrays, never null — an empty array means "no data or fetch failed."

**GIBS URL builder:** `GibsService` does not fetch upstream data. It constructs WMTS tile URLs from layer name + date + tile coordinates. The route accepts query params (layer, date, z, x, y) and returns the constructed URL. Cache is on the URL-to-tile mapping, not upstream data.

**NWS User-Agent header:** All NWS requests must include `User-Agent: (terra-globe, contact@terra.dev)` header. This is an NWS API requirement, not optional.

**FIRMS API key:** Stored server-side in `.env` as `FIRMS_MAP_KEY`. Never exposed to frontend. The `FirmsClient` reads it from process env.

**DONKI API key:** Stored server-side in `.env` as `NASA_API_KEY`. Shared with any other NASA API that needs it.

---

## Frontend Polling Architecture

### Hook matrix

| Hook | Start condition | Interval | Writes to | On error |
|---|---|---|---|---|
| `useEonetPolling` | App mount (always active) | 10 min | `event-store.events` | 3 retries w/ backoff → wait for next interval. Stale data stays visible, timestamp shows age. |
| `useUsgsPolling` | `seismicDensity` layer on | 5 min | `data-store.earthquakes` | 3 retries w/ backoff → wait for next interval. Toast, revert toggle. |
| `useFirmsPolling` | `fireDensity` layer on | 30 min | `data-store.fireHotspots` | 3 retries w/ backoff → wait for next interval. Toast, revert toggle. |
| `useNwsPolling` | `weatherAlerts` layer on | 3 min | `data-store.nwsAlerts` | 3 retries w/ backoff → wait for next interval. Toast, revert toggle. |
| `useDonkiPolling` | `spaceWeather` layer on | 20 min | `data-store.spaceWeather` | 3 retries w/ backoff → wait for next interval. Solar indicator → gray. |
| `useGibsImagery` | User clicks "View imagery" | On-demand (no interval) | `data-store.activeImageryUrl` | 3 retries w/ backoff. Toast "Imagery unavailable". |

### Frontend retry strategy

On backend error response, retry up to 3 times with exponential backoff (1s, 2s, 4s). If all retries fail, wait for the next normal polling interval. No separate retry loop. This sits on top of the backend's own 3-retry cycle against upstream APIs.

### Hook lifecycle

- Hooks that depend on layer toggles subscribe to `layer-store`. When the layer is toggled off, the hook clears its interval and resets its store field.
- On unmount (component teardown), all intervals are cleared.
- Each hook fetches immediately on activation (not waiting for the first interval tick).

---

## UI Component Architecture

### Layout

All UI elements float over the full-viewport globe as translucent overlays. No panel pushes the globe aside. The globe canvas is always 100% viewport. Non-interactive overlays use `pointer-events: none`.

### Design direction

Dark frosted-glass aesthetic inspired by modern dashboard UIs. Key principles:
- Cards with real depth — layered glass effects, subtle inner shadows, not flat rgba backgrounds
- Strong typography hierarchy — bold numbers, muted labels, proper weight contrast
- Generous spacing — cards breathe, content doesn't touch edges
- Sparse color accents — most chrome is neutral dark/gray, category colors used for data points and indicators only
- Soft rounded cards — larger border radius, modern not clinical
- shadcn/ui components throughout — Card, Badge, Switch, ScrollArea, Collapsible, Input, Popover, Progress
- Subtle animations via Tailwind transitions — fade in/out for layer toggles, smooth panel collapse/expand

### Component → Store mapping

| Component | Reads | Writes | shadcn components |
|---|---|---|---|
| `TopBar` | event-store (event count, search), data-store (spaceWeather for solar indicator) | event-store (searchQuery), globe-store (performanceMode) | Input, Badge, Popover, Switch |
| `LayerPanel` | layer-store (activeLayers), event-store (counts per category) | layer-store (toggleLayer) | Switch, ScrollArea, Collapsible |
| `EventFeed` | event-store (events, searchQuery) | event-store (selectEvent) | ScrollArea, Collapsible |
| `EventPopup` | event-store (selectedEventId, screenPosition) | event-store (clearSelection) | Badge, Button |
| `BottomBar` | layer-store (activeLayers), globe-store (cursorCoordinates) | nothing | Badge |
| `SpaceWeatherCard` | data-store (spaceWeather), layer-store (spaceWeather toggle) | nothing | Card, Badge |
| `LoadingScreen` | globe-store (isLoaded, loadProgress) | nothing | Progress |
| `Vignette` | nothing | nothing | none (pure CSS) |

### Component file locations

All in `packages/frontend/src/components/`:

```
components/
├── top-bar/
│   ├── top-bar.tsx
│   ├── search-input.tsx
│   ├── event-count-badge.tsx
│   ├── solar-indicator.tsx
│   └── settings-gear.tsx
├── layer-panel/
│   ├── layer-panel.tsx
│   ├── category-toggle.tsx
│   ├── enhancement-toggle.tsx
│   └── space-weather-toggle.tsx
├── event-feed/
│   ├── event-feed.tsx
│   ├── feed-metrics.tsx
│   └── event-list.tsx
├── event-popup.tsx
├── space-weather-card.tsx
├── bottom-bar.tsx
├── globe-canvas.tsx        (exists)
├── loading-screen.tsx      (exists)
└── vignette.tsx            (exists)
```

---

## Error Handling Strategy

### Backend error flow

```
Upstream API call
  → Success? Cache response, return ApiResponse { status: "ok" }
  → Failure? Retry with exponential backoff (1s, 2s, 4s), max 3 attempts
    → All retries exhausted?
      → Stale cache exists? Return stale data + X-Cache: STALE header
      → No cache? Return ApiErrorResponse { status: "error", code, source, message }
```

### Frontend error flow

```
Backend call
  → Success? Write to store
  → Failure? Retry with exponential backoff (1s, 2s, 4s), max 3 attempts
    → All retries exhausted? Handle per source type (see matrix below), wait for next poll
```

### Error behavior matrix

| Source type | Initial load failure | Polling refresh failure | Layer toggle failure |
|---|---|---|---|
| EONET (critical, always on) | Block UI: "Unable to load event data" + retry button | Silent: stale data stays, "Updated Xm ago" shows age | N/A |
| Enhancement (FIRMS/USGS/NWS) | N/A (not loaded on init) | Toast + auto-retry next interval | Toast + revert toggle to off |
| DONKI (ambient) | N/A (not loaded on init) | Solar indicator → gray, tooltip "Unavailable" | Same as refresh failure |
| GIBS (on-demand) | N/A | N/A | Toast "Imagery unavailable", no overlay |

### Backend structured logging

Every log entry includes: timestamp (ISO8601), log level (info/warn/error), source API name, request context (endpoint, params), response status, error message + stack (on failure), cache hit/miss, retry attempt number.

JSON to stdout. No external logging service for v1.

---

## Phased Build Order

### Phase 1: Core App (Globe + EONET + Full UI Shell)

Goal: user opens TERRA, sees globe with real EONET event markers, interacts with all UI panels, clicks markers, sees event details.

| Work item | Dependencies | Parallelizable |
|---|---|---|
| Fix auto-rotation (stop permanently) | globe-scene | Yes |
| Add `data-store` to stores | shared types | Yes |
| Add `NwsAlert` type + `weatherAlerts` layer ID to shared | — | Yes |
| Event markers via CSS2DRenderer (`MarkerManager`) | globe-scene, event-store | Yes |
| `useEonetPolling` hook | event-store, backend `/api/events` | Yes |
| `EventPopup` card | event-store, marker click wiring | After markers |
| `TopBar` (search, event count, settings gear — solar indicator stubbed gray) | event-store, layer-store | Yes |
| `LayerPanel` (right sidebar, all toggle groups) | layer-store | Yes |
| `EventFeed` sidebar (left, metrics + list + click-to-fly) | event-store | Yes |
| `BottomBar` (layer pills, coordinate readout) | layer-store, globe-scene | Yes |
| shadcn/ui setup (install, theme config, base components) | — | Yes |

Critical path: **shadcn setup → MarkerManager → EventPopup**. Everything else fans out from existing stores.

### Phase 2: Data Expansion (All API Clients + Enhancement Layers)

Goal: all 6 data sources connected, enhancement layers rendering, space weather operational.

| Work item | Dependencies | Parallelizable |
|---|---|---|
| `FirmsClient` + `/api/fires` route + tests | shared types, cache | Yes |
| `UsgsClient` + `/api/earthquakes` route + tests | shared types, cache | Yes |
| `NwsClient` + `/api/alerts` route + tests | shared types, cache | Yes |
| `DonkiClient` + `/api/space-weather` route + tests | shared types, cache | Yes |
| `GibsService` + `/api/imagery/:layer` route | shared types | Yes |
| FIRMS instanced dot renderer (`EnhancementRenderer`) | globe-scene | Yes |
| USGS instanced diamond renderer | globe-scene, EnhancementRenderer | After renderer |
| NWS alert polygon renderer | globe-scene | Yes |
| `useUsgsPolling` hook | data-store, USGS route | After route |
| `useFirmsPolling` hook | data-store, FIRMS route | After route |
| `useNwsPolling` hook | data-store, NWS route | After route |
| `useDonkiPolling` hook | data-store, DONKI route | After route |
| `useGibsImagery` hook | data-store, GIBS route | After route |
| Solar indicator live wiring | DONKI hook, TopBar | After DONKI hook |
| `SpaceWeatherCard` | DONKI hook, layer-store | After DONKI hook |
| Layer toggle → data fetch wiring | all hooks, layer-store | After hooks |

5 backend agents in parallel (one per client), then 5+ frontend agents for renderers and hooks.

### Phase 3: Polish + Infrastructure

Goal: clustering, visual effects, search, performance mode, deployment infra.

| Work item | Dependencies | Parallelizable |
|---|---|---|
| Marker clustering (grid-based spatial) | MarkerManager from Phase 1 | Yes |
| Storm track animated paths | EONET multi-geometry events | Yes |
| Aurora shader effect (Kp-driven) | DONKI data from Phase 2 | Yes |
| Satellite imagery overlay (GIBS tiles on globe) | GIBS route from Phase 2 | Yes |
| Search fly-to with region lookup table | TopBar, globe-scene camera | Yes |
| Performance Mode toggle (bloom off, skip 4K, reduce contours) | globe-store, globe-scene | Yes |
| Docker + docker-compose | All code | Yes |
| GitHub Actions CI pipeline (lint → type check → test → build) | All code | Yes |
| `.env.example` + env management | Backend config | Yes |
| Coordinate readout (cursor lat/lng on globe hover) | globe-scene, globe-store | Yes |

---

## Testing Strategy

### Phase 1 tests

| Target | Framework | Priority |
|---|---|---|
| Zustand stores (event, layer, globe, data) | Vitest | High |
| `useEonetPolling` hook | Vitest | High |
| MarkerManager (creation, culling, selection) | Vitest | Medium |
| E2E: globe loads, markers appear, popup opens | Playwright | High |

### Phase 2 tests

| Target | Framework | Priority |
|---|---|---|
| All backend clients (FIRMS CSV, USGS normalization, NWS, DONKI dual-fetch) | Vitest | Highest |
| All backend routes (status codes, cache headers, errors) | Vitest | High |
| Each polling hook | Vitest | Medium |
| E2E: toggle layer, enhancement data appears | Playwright | High |

### Phase 3 tests

| Target | Framework | Priority |
|---|---|---|
| Clustering algorithm (pure function) | Vitest | High |
| Docker build + CI pipeline | GitHub Actions | High |

### Not tested

- Visual shader/texture correctness (eyeball against prototype)
- Three.js rendering internals
- Component visual styling

---

## Acceptance Criteria Reference

All acceptance criteria from APP-BREAKDOWN sections 13.1 through 13.6 remain in force. This spec does not redefine them — it resolves conflicts, fills gaps, and adds:

- **NwsAlert type** added to shared package
- **`weatherAlerts`** added to `EnhancementLayerId`
- **`data-store`** added as fourth Zustand store
- **Frontend retry strategy** defined: 3 retries with exponential backoff, then wait for next polling interval
- **FIRMS heatmap** removed from scope (dots at all zoom levels)
- **DONKI dual-fetch** pattern documented as first-class
- **GIBS URL builder** pattern documented (no upstream fetch)
- **Design direction** documented: dark frosted-glass inspired by modern dashboard UIs, shadcn/ui components, strong typography hierarchy, sparse color accents
