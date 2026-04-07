# TERRA — React Migration Design Spec

## Overview

Migrate the existing pure HTML/Three.js globe prototype (`index.html`, ~550 lines) into a production React application within an npm workspaces monorepo. The globe remains imperative Three.js code — React acts as a shell owning the UI layer (panels, filters, popups) while the 3D scene runs independently via canvas ref.

The existing `index.html` is kept as a visual reference during migration and removed once the React version reaches parity.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces |
| Frontend bundler | Vite |
| Frontend framework | React + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (supplemented by other libs as needed) |
| State management | Zustand (3 independent stores) |
| 3D rendering | Three.js (imperative, not react-three-fiber) |
| Shader imports | vite-plugin-glsl |
| Backend | Fastify + TypeScript |
| Testing | Vitest (unit/integration) + Playwright (E2E) |

---

## Monorepo Structure

```
mr-worldwide/
├── package.json                  # npm workspaces root
├── packages/
│   ├── frontend/                 # Vite + React + TypeScript
│   │   ├── package.json
│   │   └── src/
│   │       ├── components/       # React UI (shadcn, panels, filters)
│   │       ├── globe/            # Three.js scene (imperative)
│   │       │   ├── globe-scene.ts
│   │       │   ├── shaders/
│   │       │   │   ├── globe-surface.vert
│   │       │   │   ├── globe-surface.frag
│   │       │   │   ├── atmosphere.vert
│   │       │   │   └── atmosphere.frag
│   │       │   ├── textures/
│   │       │   │   ├── ocean-color.ts
│   │       │   │   ├── contour-lines.ts
│   │       │   │   ├── fallback-night.ts
│   │       │   │   └── texture-loader.ts
│   │       │   ├── atmosphere.ts
│   │       │   ├── post-processing.ts
│   │       │   └── stars.ts
│   │       ├── hooks/
│   │       └── stores/
│   ├── backend/                  # Fastify + TypeScript
│   │   ├── package.json
│   │   └── src/
│   │       ├── routes/
│   │       ├── services/
│   │       └── plugins/
│   └── shared/                   # Shared TypeScript types + constants
│       ├── package.json
│       └── src/
│           ├── types/
│           └── constants/
├── docs/
│   ├── APP-BREAKDOWN.md
│   └── API-STRUCTURE.md
└── index.html                    # Prototype kept as visual reference
```

---

## Three.js Integration Strategy

React as shell, Three.js stays imperative. A single `GlobeCanvas` React component hosts the entire 3D scene via `useRef` + `useEffect`.

### The bridge pattern

`GlobeCanvas` creates a `GlobeScene` instance on mount, passing the canvas element. The scene subscribes to Zustand stores directly (not through React) for state changes like layer toggles and event selection. On unmount, the component calls `dispose()` to clean up all Three.js resources.

The globe scene pushes data back to React by writing to Zustand — for example, projecting a 3D marker position to screen coordinates so the React popup card can position itself.

### Globe module decomposition

The `index.html` prototype breaks into these modules:

| Module | Responsibility |
|---|---|
| `globe-scene.ts` | Scene, camera, renderer, orbit controls, resize handler, animation loop, loading orchestration. Composes all other modules. |
| `shaders/globe-surface.vert` + `.frag` | GLSL vertex/fragment shaders for the globe material — land/ocean distinction, coastlines, city lights, rim lighting |
| `shaders/atmosphere.vert` + `.frag` | Volumetric atmospheric glow shader with ray-based distance calculation |
| `textures/ocean-color.ts` | Procedural ocean color map with per-basin palette variation and noise |
| `textures/contour-lines.ts` | Procedural cyan-teal ocean contour texture — ellipses, curves, spirals |
| `textures/fallback-night.ts` | Procedural city lights texture as fallback when CDN textures fail |
| `textures/texture-loader.ts` | Cascade CDN loader that tries multiple URLs for night/topology textures |
| `post-processing.ts` | EffectComposer with UnrealBloomPass for city light glow |
| `stars.ts` | Star field particle system (1200 points on a distant sphere) |
| `atmosphere.ts` | Atmosphere mesh setup — separate scene for additive blending bypass of bloom |

Each module exports a factory function or class that receives dependencies (renderer, scene, camera) as arguments. No globals, no module-level side effects.

---

## Zustand Store Design

Three independent stores for surgical subscriptions.

### `globe-store.ts`

Globe interaction and loading state.

- `cameraPosition` — current camera position (UI reacts to zoom level)
- `isUserInteracting` — whether the user is currently dragging/zooming
- `isLoaded` — globe textures and scene ready
- `loadProgress` — 0–100 for loading screen

### `event-store.ts`

Event data and selection state.

- `events` — array of normalized EONET events (fetched from backend)
- `selectedEventId` — currently inspected event (drives popup card)
- `selectedEventScreenPosition` — `{ x, y }` projected by the globe scene for popup positioning
- `hoveredEventId` — for hover highlights
- `filters` — active category filters, date range, magnitude range
- `selectEvent(id)` / `clearSelection()` — actions

### `layer-store.ts`

Layer visibility toggles.

- `activeLayers` — set of enabled layer IDs (EONET categories, enhancement layers, space weather)
- `toggleLayer(id)` / `setLayers(ids)` — actions

Separate stores ensure that toggling a layer does not trigger re-renders in components that only read event selection, and vice versa. The Three.js globe scene subscribes imperatively to `layer-store` and `event-store` via `store.subscribe()`.

---

## React Component Tree

```
App
├── LoadingScreen            # Full-screen overlay, fades on globe-store.isLoaded
├── GlobeCanvas              # Canvas ref, mounts GlobeScene, subscribes to stores
├── EventPopupCard           # Frosted-glass card, positioned via projected screen coords
├── LayerPanel               # Collapsible sidebar (shadcn Sidebar)
│   ├── CategoryToggles     # EONET category on/off
│   ├── EnhancementToggles  # FIRMS, USGS density layers
│   └── SpaceWeatherToggle  # DONKI layer
├── FilterBar                # Top bar with category pills, date range
└── StatusBar                # Bottom bar — event count, last refresh time
```

### Key component behaviors

**GlobeCanvas** — The only component that touches Three.js. Creates the imperative `GlobeScene` on mount, disposes on unmount. All Three.js lifecycle management happens here.

**EventPopupCard** — Pure React component. Reads `selectedEventId` and `selectedEventScreenPosition` from `event-store`. Positions itself with CSS `transform: translate(x, y)`. The globe scene handles the 3D-to-2D projection and writes coordinates to the store. This keeps the popup in React's accessibility tree and styling system.

**LayerPanel** — Uses shadcn `Sidebar` component. Each toggle calls `layer-store.toggleLayer(id)`. The globe scene picks up changes via its subscription.

**LoadingScreen** — Matches the existing prototype — app name, thin progress bar, dark background. Reads `globe-store.loadProgress` and applies `opacity: 0` + `pointer-events: none` transition on `isLoaded`.

---

## Backend Architecture

Fastify server acting as a proxy/caching layer between the frontend and NASA APIs.

### Routes

| Route | Upstream | Purpose |
|---|---|---|
| `GET /api/events` | NASA EONET | Curated natural events — core dataset |
| `GET /api/events/:id` | NASA EONET | Single event detail |
| `GET /api/categories` | NASA EONET | Event category list |
| `GET /api/fires` | NASA FIRMS | Fire hotspot density data |
| `GET /api/earthquakes` | USGS Earthquake | Seismic event feed |
| `GET /api/space-weather` | NASA DONKI | Solar flare, CME, geomagnetic storm data |
| `GET /api/imagery/:layer` | NASA GIBS | Satellite tile URL generation |
| `GET /health` | — | Health check |

### Services

- `eonet-client.ts` — fetches EONET, transforms GeoJSON into normalized internal shape
- `firms-client.ts` — fetches FIRMS CSV, parses into typed point arrays
- `usgs-client.ts` — fetches USGS GeoJSON, normalizes property names
- `donki-client.ts` — fetches DONKI solar/geomagnetic JSON
- `cache.ts` — in-memory TTL cache (5–15 min per source, no Redis for v1)

### Plugins

- `cors` — allow frontend origin
- `rate-limit` — protect against runaway polling
- `cache-control` — set response cache headers

Each service client normalizes its upstream API's response format into consistent shapes defined in `packages/shared/types/`. The frontend consumes uniform typed endpoints regardless of whether the upstream data was GeoJSON, CSV, or flat JSON.

The backend holds no session state — purely request/response with caching.

---

## Error Handling

Dual-layer: detailed structured logs on the backend, simplified user-friendly messages on the frontend.

### Backend

Every NASA API call goes through a shared error handler per service client. On upstream failure (timeout, 5xx, rate limit, malformed response):

1. Log the full structured error — status code, upstream URL, response body, timestamp, retry count
2. Return a typed error response with an appropriate HTTP status:

```typescript
interface ApiErrorResponse {
  status: "error";
  code: "UPSTREAM_UNAVAILABLE" | "RATE_LIMITED" | "PARSE_FAILED" | "TIMEOUT";
  source: "eonet" | "firms" | "usgs" | "donki" | "gibs";
  message: string;
}
```

| Error code | HTTP status | Meaning |
|---|---|---|
| `UPSTREAM_UNAVAILABLE` | 502 | NASA API returned 5xx or is unreachable |
| `RATE_LIMITED` | 429 | Upstream rate limit hit, or client polling too fast |
| `PARSE_FAILED` | 502 | Upstream returned data that failed validation/parsing |
| `TIMEOUT` | 504 | Upstream request exceeded timeout threshold |

3. Fall back to cached data if available — return the stale cached response with a `X-Cache: STALE` header instead of the error. Only return the error if no cache exists.

### Frontend

The globe stays visible regardless of data errors. Errors only affect data overlays.

| Scenario | User sees |
|---|---|
| Events fail to load | Toast: "Event data temporarily unavailable — retrying" + auto-retry |
| Single layer fails | That layer's toggle shows a subtle error indicator, others unaffected |
| All APIs down | Banner: "Live data unavailable — showing cached data" or "Unable to reach event data — check connection" |
| Globe textures fail to load | Procedural fallback textures (already built into prototype) |

The frontend pattern-matches on `code` to decide behavior — `RATE_LIMITED` backs off polling, `UPSTREAM_UNAVAILABLE` retries with exponential delay, `TIMEOUT` retries once then shows toast. The `source` field isolates which layer failed.

---

## Testing Strategy

### Unit tests (Vitest)

- **Zustand stores** — toggle layers, select events, verify state transitions
- **Backend services** — mock NASA API responses, verify normalization/transform logic produces correct typed shapes. Highest-value tests — upstream data is messy and inconsistent.
- **Shared type guards** — validators for API response shapes

### Integration tests (Vitest + Supertest)

- **Backend routes** — spin up Fastify, hit each route with mocked upstream responses, verify status codes, response shapes, cache headers, error responses
- **Cache behavior** — verify stale cache served on upstream failure, TTLs respected

### E2E tests (Playwright)

- **Globe loads** — page opens, loading screen appears, globe renders (canvas has pixels), loading screen fades
- **Layer toggles** — click toggle, verify markers appear/disappear
- **Event interaction** — click marker, popup appears with correct data, click away, card closes
- **Error resilience** — intercept API calls, force failures, verify toasts appear and globe stays functional

### Not tested

- Visual shader/texture correctness — the `index.html` prototype serves as the visual reference for eyeball comparison
- Three.js library internals
