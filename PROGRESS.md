# TERRA — Development Progress

## Project Board

https://github.com/users/freddysongg/projects/2

**Repo:** freddysongg/terra
**39 GitHub issues** across 3 phase epics (Phase 1 + 2 complete, Phase 3 remaining)

---

## Phase 1: Core App — COMPLETE

**Status:** All acceptance criteria verified, lint clean, 47/47 tests pass
**Completed:** 2026-04-07

### What was built

| Component | File(s) | Status |
|---|---|---|
| Monorepo scaffolding | `package.json`, `tsconfig.base.json`, `packages/*/` | Done |
| Shared types + constants | `packages/shared/src/types/`, `packages/shared/src/constants/` | Done |
| NwsAlert type, weatherAlerts layer, ImageryLayerId | `types/events.ts`, `types/layers.ts`, `constants/layers.ts` | Done |
| Category colors matching APP-BREAKDOWN spec | `constants/categories.ts` | Done |
| Category icons (shared icon field + React mapper + marker SVGs) | `categories.ts`, `category-icon.tsx`, `marker-manager.ts` | Done |
| Zustand stores (event, layer, globe, data) | `stores/*.ts` | Done |
| event-store: searchQuery, lastFetchedAt | `stores/event-store.ts` | Done |
| globe-store: isPerformanceMode | `stores/globe-store.ts` | Done |
| data-store: enhancement + space weather data | `stores/data-store.ts` | Done |
| layer-store: 13 EONET categories default ON | `stores/layer-store.ts` | Done |
| Globe scene (Three.js, shaders, textures, atmosphere, stars, post-processing) | `globe/*.ts`, `globe/shaders/`, `globe/textures/` | Done |
| Auto-rotation: stops permanently, clears selection on rotate | `globe/globe-scene.ts` | Done |
| MarkerManager: CSS2DRenderer, back-face culling, click-to-select | `globe/marker-manager.ts` | Done |
| Marker pulse animation on active events (EM-05) | `globe/marker-manager.ts` (injected CSS keyframes) | Done |
| Concentric ring animation on selected marker (EM-06) | `globe/marker-manager.ts` | Done |
| Layer toggle fade transitions (UI-16) | `globe/marker-manager.ts` | Done |
| useEonetPolling hook (10min interval, 3 retries, 1s/2s/4s backoff) | `hooks/use-eonet-polling.ts` | Done |
| TopBar (search + dropdown, event count, solar stub, settings) | `components/top-bar.tsx` | Done |
| LayerPanel (18 toggles: 13 cat + 3 enhance + 1 space + 1 imagery) | `components/layer-panel.tsx` | Done |
| EventFeed (metrics, scrollable list, search filter, click-to-select) | `components/event-feed.tsx` | Done |
| EventPopup (280px, flip logic, connector line, category icon) | `components/event-popup.tsx` | Done |
| BottomBar (active layer pills, coord readout stub) | `components/bottom-bar.tsx` | Done |
| DataProvider (mounts polling hooks) | `components/data-provider.tsx` | Done |
| App shell (all components, Escape key, conditional render after load) | `app.tsx` | Done |
| shadcn/ui (10 components: Button, Input, Badge, ScrollArea, Switch, Tooltip, Card, Collapsible, Popover, Progress) | `components/ui/*.tsx` | Done |
| Loading screen | `components/loading-screen.tsx` | Done |
| Vignette | `components/vignette.tsx` | Done |
| Structured JSON logger | `packages/backend/src/services/logger.ts` | Done |
| EONET backend client + events route | `packages/backend/src/services/eonet-client.ts`, `routes/events.ts` | Done |
| Cache service (TTL, stale fallback) | `packages/backend/src/services/cache.ts` | Done |
| CORS + rate-limit plugins | `packages/backend/src/plugins/` | Done |
| Health route | `packages/backend/src/routes/health.ts` | Done |
| Zoom limits (minDistance 1.8, maxDistance 3.5) | `globe/globe-scene.ts` | Done |

### Test coverage

| Package | Tests | Result |
|---|---|---|
| `@terra/frontend` | 30 tests (5 suites: event-store, layer-store, globe-store, data-store, use-eonet-polling) | All pass |
| `@terra/backend` | 17 tests (4 suites: cache, eonet-client, logger, events route) | All pass |
| **Total** | **47 tests** | **All pass** |

### Spec compliance review

Ran a full audit against all APP-BREAKDOWN acceptance criteria (GR-01 through ID-24).
- Initial audit: 36 PASS / 12 FAIL
- All 12 gaps fixed in 4 targeted agent dispatches
- Final state: all criteria pass

### Key architectural decisions locked in

| Decision | Resolution |
|---|---|
| Serving model | Hybrid: two-process dev, single-process prod |
| NWS activation | Manual toggle, US-scoped only |
| Marker rendering | CSS2DRenderer for EONET, InstancedMesh for enhancement (Phase 2) |
| FIRMS rendering | Dots at all zoom levels (heatmap dropped) |
| Auto-rotation | Stops permanently on first interaction |
| Popup on rotation | Closes (no follow, no detach) |
| Store architecture | 4 stores: event, data, layer, globe |
| DONKI fetching | Triple-fetch (FLR + GST + CME), always-on polling for solar indicator |
| NWS color mapping | Type-based (Warning/Watch/Advisory suffix), not severity-based |
| EONET default state | All 13 categories ON, enhancement/space/imagery OFF |

---

## Phase 2: Data Expansion — COMPLETE

**GitHub Issues:** #19-#28 (10 sub-issues under epic #2)
**Completed:** 2026-04-07
**PRs:** #40 (wave 1), #41 (wave 2), #42 (wave 3)

### What was built

**Wave 1 — Backend (5 API clients):**
- #19 FIRMS client (CSV parsing → FireHotspot[], GET /api/fires)
- #20 USGS client (GeoJSON → Earthquake[], GET /api/earthquakes)
- #21 NWS client (CAP alerts → NwsAlert[], GET /api/alerts)
- #22 DONKI client (triple-fetch FLR+GST+CME → SpaceWeatherSummary, GET /api/space-weather)
- #23 GIBS service (WMTS URL builder, GET /api/imagery/:layer)

**Wave 2 — Frontend renderers + hooks:**
- #24 EnhancementRenderer (instanced FIRMS dots + USGS diamonds on globe)
- #25 AlertPolygonRenderer (NWS alert polygons with type-based coloring)
- #26 Frontend polling hooks (USGS, FIRMS, NWS layer-dependent + DONKI always-on + GIBS on-demand)

**Wave 3 — UI integration:**
- #27 Solar indicator live wiring + SpaceWeatherCard component
- #28 Layer toggle → data fetch integration (verified complete from wave 2 wiring)

### Code review fixes (e94d416)

Reviews caught 5 issues across all 3 waves, all fixed before merge:

| Issue | Wave | Fix |
|---|---|---|
| Renderer globe parenting | 2 | EnhancementRenderer + AlertPolygonRenderer add meshes to `globe` (not `scene`) so they inherit globe rotation |
| useGibsImagery local state | 2 | Write to `data-store.activeImageryUrl` instead of local state, proper AbortController cleanup |
| Duplicated flare logic | 3 | Extract `resolveLatestFlare` + `resolveFlarePrefix` as shared exports from space-weather-card |
| Missing helper tests | 3 | 8 new tests for space weather helpers (flare sorting, prefix extraction) |
| Noisy route test logger | 1 | Silence Fastify logger in space-weather route test |

### Test coverage

| Package | Tests | Result |
|---|---|---|
| `@terra/frontend` | 61 tests (10 suites: 4 stores, 5 hooks, 1 component helpers) | All pass |
| `@terra/backend` | 78 tests (14 suites: 6 clients, 1 cache, 1 logger, 6 routes) | All pass |
| **Total** | **139 tests** | **All pass** |

### GitHub issues

All 10 sub-issues (#19-#28) and epic #2 closed with implementation comments.

---

## Phase 3: Polish + Infrastructure — NOT STARTED

**GitHub Issues:** #29-#37 (9 sub-issues under epic #3)
**Blocked by:** Phase 2 (complete)

### Planned work

- #29 Marker clustering (grid-based spatial algorithm)
- #30 Storm track animated paths
- #31 Aurora shader effect (Kp-driven)
- #32 Satellite imagery overlay (GIBS tiles)
- #33 Search fly-to with region lookup
- #34 Performance Mode (bloom, 4K, contours, aurora)
- #35 Coordinate readout (cursor lat/lng)
- #36 Docker + docker-compose
- #37 GitHub Actions CI pipeline

---

## Design Documents

| Document | Path | Purpose |
|---|---|---|
| Product spec | `APP-BREAKDOWN.md` | Full product spec with acceptance criteria (sections 13.1-13.6) |
| API contracts | `API-STRUCTURE.md` | All 6 upstream API contracts and integration patterns |
| Implementation design | `docs/superpowers/specs/2026-04-07-terra-implementation-design.md` | Resolved contradictions, architectural decisions, phased build order |
| Migration design | `docs/superpowers/specs/2026-04-06-react-migration-design.md` | Original React migration spec |
| Phase 1 plan | `docs/superpowers/plans/2026-04-07-terra-phase1-core-app.md` | 15-task step-by-step implementation plan |

## Coding Standards

Project-level CLAUDE.md at repo root defines:
- Testing rules (fix code first, verify after every feature)
- React + Zustand patterns (pure readers, imperative Three.js subscriptions)
- Three.js + Globe boundaries (all 3D in globe/, dependency injection, mandatory disposal)
- Fastify service contract (constructor(cache, fetchFn), getData(), fallbackOrError())
- shadcn/ui + styling (dark theme only, Tailwind classes, no inline styles)
- Architecture boundary diagram (React ↔ Stores ↔ Three.js)
