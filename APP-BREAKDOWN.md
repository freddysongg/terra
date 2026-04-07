# TERRA — Global Natural Event Tracker

## Product specification v1.1

---

## 1. What is TERRA

TERRA is a 3D globe visualization application that tracks real-time natural and space weather events worldwide. It presents a curated, manageable view of what's happening on Earth right now — wildfires, earthquakes, storms, volcanic eruptions, floods, and more — plotted as interactive markers on a dark, cinematic nighttime globe. Users can spin, zoom, and explore the Earth to discover active events, drill into high-density data for specific event types, and optionally view space weather activity affecting the planet.

The design philosophy is **curated over overwhelming**. Rather than flooding the screen with thousands of data points, TERRA surfaces 20–80 headline events from NASA's editorial curation, with the ability to progressively reveal higher-density data layers on demand.

---

## 2. Who is this for

- People interested in real-time global situational awareness
- Developers and researchers monitoring natural hazards
- Educators demonstrating Earth science and natural disaster patterns
- Portfolio piece demonstrating full-stack engineering, 3D visualization, and multi-API data integration

---

## 3. User experience

### First impression

The user opens TERRA and sees a loading screen (app name, thin progress bar, dark background). Behind the scenes, a 2K globe texture and initial EONET data load in parallel. Once ready, the scene transitions seamlessly into a slowly rotating 3D globe rendered in a dark nighttime aesthetic — city lights glow warm amber against dark navy continents, a faint cyan atmospheric rim (20–30% peak opacity) traces the globe's silhouette, and sparse, minimalistic teal contour lines drift slowly across ocean surfaces suggesting movement. The mood is cinematic, clean, and immediately communicates "command center." Scattered across the globe are small color-coded event markers indicating active natural events. A higher-resolution 4K texture loads in the background and crossfades in (~500ms) without any visible pop.

### Core interaction loop

1. **Browse** — The globe auto-rotates slowly. Event markers are visible at a glance, color-coded by category (orange for fires, blue for storms, red for volcanoes, gold for earthquakes, etc.). The user gets an immediate sense of global activity without clicking anything.

2. **Explore** — The user clicks and drags to rotate the globe, scroll-zooms to get closer to a region of interest. As they zoom in, cluster markers break apart into individual event markers. The globe interaction feels smooth with momentum/damping.

3. **Inspect** — Clicking an event marker opens a frosted-glass popup card anchored to that marker's position. The card shows the event title, category, magnitude (if available), status (active/closed), source agency, and a timestamp. An action to "view satellite imagery" can overlay NASA GIBS tiles for that region.

4. **Drill down** — When viewing a specific event category (e.g., a wildfire), the user can toggle on the corresponding enhancement layer (e.g., NASA FIRMS fire hotspots) to see the high-density data surrounding that event. This transforms a single "Wildfire in Oregon" pin into thousands of thermal detections showing the fire's true footprint.

5. **Toggle layers** — A side panel or toolbar allows toggling data layers on/off: EONET event categories, enhancement layers (fire density, seismic density, weather alerts), and the space weather layer. Each toggle immediately updates what's visible on the globe.

### Interaction details

| Action | Behavior |
|---|---|
| Idle (no prior interaction) | Globe auto-rotates ~1 revolution per 24 minutes |
| First user interaction | Auto-rotation stops permanently (until page refresh) |
| Click + drag | Free orbit rotation around the globe |
| Release after drag | Momentum continues briefly, then decelerates smoothly to a stop. Globe stays at final resting position. |
| Scroll wheel | Smooth zoom in/out. Max zoom out: globe at ~70% of viewport. Max zoom in: continental level (e.g., Africa fills viewport). |
| Click marker | Popup card appears with event details |
| Click empty space | Any open popup card closes |
| Toggle layer | Markers for that layer appear/disappear with fade animation |
| Zoom in past threshold | Cluster markers break into individual markers |
| Input | Mouse + keyboard only (v1). No touch/mobile support. |

---

## 4. User flow

```
┌─────────────────────────────────────────────────┐
│                   LANDING                        │
│  Globe loads with loading indicator              │
│  Textures + initial EONET data fetch in parallel │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                 GLOBE VIEW                       │
│  Auto-rotating globe with EONET event markers    │
│  Category filter pills visible at top/side       │
│  Layer toggles accessible                        │
└────────┬───────────┬───────────┬────────────────┘
         │           │           │
         ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────────┐
   │  TAP     │ │  TOGGLE  │ │  TOGGLE      │
   │  MARKER  │ │  ENHANCE │ │  SPACE WX    │
   └────┬─────┘ └────┬─────┘ └──────┬───────┘
        │             │              │
        ▼             ▼              ▼
   ┌──────────┐ ┌──────────────┐ ┌──────────────┐
   │  POPUP   │ │  DENSITY     │ │  AURORA/     │
   │  CARD    │ │  LAYER       │ │  SOLAR DATA  │
   │  w/ info │ │  appears     │ │  overlays    │
   │  + link  │ │  (FIRMS/     │ │  globe       │
   │  to GIBS │ │  USGS/NWS)   │ │              │
   └──────────┘ └──────────────┘ └──────────────┘
```

---

## 5. Data sources

### Core layer — NASA EONET

The editorial backbone. Every event on the globe originates from EONET's curated feed.

| Property | Value |
|---|---|
| Provider | NASA Earth Observatory |
| Base URL | `https://eonet.gsfc.nasa.gov/api/v3` |
| Auth | None required |
| Format | JSON, GeoJSON |
| Update frequency | Poll every 5–15 minutes |
| Typical density | 20–80 active events globally |
| Coverage | Global |
| Documentation | https://eonet.gsfc.nasa.gov/docs/v3 |

**Primary endpoint:** `GET /events/geojson?status=open&days=30`

Returns a GeoJSON FeatureCollection with event markers containing: id, title, description, category, source, magnitude, geometry (Point or Polygon with timestamps), and open/closed status. Multi-coordinate events (storms, icebergs) include temporal trajectories as LineStrings.

**Event categories available:** drought, dustHaze, earthquakes, floods, landslides, manmade, seaLakeIce, severeStorms, snow, tempExtremes, volcanoes, waterColor, wildfires

**Queryable by:** category, source, status, date range, bounding box, magnitude range, limit

---

### Enhancement layer — NASA FIRMS (fires)

Enriches EONET's `wildfires` category with satellite-detected thermal hotspots.

| Property | Value |
|---|---|
| Provider | NASA LANCE |
| Base URL | `https://firms.modaps.eosdis.nasa.gov/api` |
| Auth | Free map key (register at FIRMS site) |
| Format | CSV, JSON, KML |
| Update frequency | On-demand or daily |
| Typical density | 30,000–100,000+ detections/day globally |
| Coverage | Global |
| Documentation | https://firms.modaps.eosdis.nasa.gov/api/ |

**Primary endpoint:** `GET /area/csv/{MAP_KEY}/{SOURCE}/{BBOX}/{DAYS}`

Each detection includes: lat, lng, brightness temperature, confidence, fire radiative power, satellite source, acquisition time.

**Integration pattern:** When user taps an EONET wildfire event or enables the fire density layer, query FIRMS with a bounding box around the area of interest. Render each detection as a small heat-colored dot sized by fire radiative power.

---

### Enhancement layer — USGS Earthquakes

Enriches EONET's `earthquakes` category with comprehensive global seismic data.

| Property | Value |
|---|---|
| Provider | US Geological Survey |
| Base URL | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary` |
| Auth | None required |
| Format | GeoJSON |
| Update frequency | Every 1–5 minutes (auto-updating feeds) |
| Typical density | Hundreds of events/day |
| Coverage | Global |
| Documentation | https://earthquake.usgs.gov/fdsnws/event/1/ |

**Primary feeds (static GeoJSON URLs):**
- `4.5_day.geojson` — significant quakes, past 24h (default global view)
- `2.5_day.geojson` — moderate quakes (regional zoom)
- `all_week.geojson` — all quakes past 7 days (deep drill-in)

Each event includes: magnitude, depth, location, felt reports, tsunami flag, PAGER alert level, significance score.

**Integration pattern:** Use `4.5_day.geojson` for all views in v1. No feed switching based on zoom level — continental zoom does not warrant higher-density feeds. Size markers by magnitude, color by depth.

---

### Enhancement layer — NOAA NWS Alerts (US only)

Enriches EONET's `severeStorms` and `floods` categories with real-time warning polygons.

| Property | Value |
|---|---|
| Provider | National Weather Service |
| Base URL | `https://api.weather.gov` |
| Auth | None (User-Agent header required) |
| Format | GeoJSON |
| Update frequency | Poll every 2–5 minutes |
| Typical density | Variable (high during severe weather) |
| Coverage | United States only |
| Documentation | https://www.weather.gov/documentation/services-web-api |

**Primary endpoint:** `GET /alerts/active`

Returns GeoJSON with alert polygons, severity (Extreme/Severe/Moderate/Minor), urgency, event type (Tornado Warning, Flash Flood Emergency, etc.), onset/expiration timestamps, and safety instructions.

**Integration pattern:** Manual toggle only — user enables the NWS layer via the layer panel. No auto-activation. When enabled, render alert polygons as colored overlays: red for warnings, orange for watches, yellow for advisories. Data only covers the US; layer shows nothing when viewing other regions.

---

### Independent layer — NASA DONKI (space weather)

A separate toggleable domain showing Sun-Earth interactions. Not tied to any EONET category.

| Property | Value |
|---|---|
| Provider | NASA CCMC / Moon-to-Mars Space Weather Analysis Office |
| Base URL | `https://api.nasa.gov/DONKI` |
| Auth | Free NASA API key (https://api.nasa.gov/) |
| Format | JSON |
| Update frequency | Poll every 15–30 minutes |
| Typical density | 0–10 events/day |
| Coverage | N/A (solar/magnetospheric) |
| Documentation | https://ccmc.gsfc.nasa.gov/tools/DONKI/ |

**Key endpoints:**
- `GET /CME` — coronal mass ejections
- `GET /FLR` — solar flares (B/C/M/X class)
- `GET /GST` — geomagnetic storms (Kp index)
- `GET /SEP` — solar energetic particles

**Integration pattern:** Space weather drives two visual systems:

1. **Aurora effect** — When a geomagnetic storm is active (Kp ≥ 5), render a shader-based green/purple glow band at the globe's polar regions (60°–90° N/S). Intensity scales with Kp level: Kp 5 = faint glow, Kp 7 = moderate, Kp 9 = intense with wider latitude coverage. Renders below event markers on the globe surface. Completely disabled in Performance Mode.

2. **Solar indicator + info card** — The solar indicator dot in the top bar is always active regardless of the space weather layer toggle (ambient awareness). When the space weather layer is toggled ON, a space weather info card appears showing: current solar flare class, last flare time, and Earth-directed CME status with estimated arrival time (±6 hours qualifier).

The space weather layer toggle controls the aurora effect and info card. The solar indicator dot is always visible.

---

### Visual layer — NASA GIBS (satellite imagery)

The globe's optional satellite imagery overlay. Not event data — visual texture.

| Property | Value |
|---|---|
| Provider | NASA EOSDIS |
| Base URL | `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/` |
| Auth | None required |
| Format | WMTS tiles (JPG/PNG) |
| Update frequency | Cache tiles, refresh daily |
| Coverage | Global |
| Documentation | https://nasa-gibs.github.io/gibs-api-docs/ |

**Integration pattern:** When a user drills into an EONET event and clicks "view satellite imagery," query the EONET Layers API (`/api/v3/layers/{categoryId}`) to get category-specific GIBS products (true color for fires, aerosol optical depth for dust, SO2 for volcanoes). Load corresponding WMTS tiles and overlay them on the globe surface. Overlay scope is dynamic: if the event has polygon geometry, use that boundary; if it's a point, use a default radius (~5° lat/lng) around the coordinates.

---

## 6. Data flow architecture

```
   ┌──────────────────────────────────────────────────────────┐
   │                     CLIENT (React)                       │
   │                                                          │
   │  ┌────────────────┐    ┌──────────────────────────────┐  │
   │  │ POLLING LAYER  │    │       MARKER RENDERER        │  │
   │  │ fetches from   │───▶│ Converts events → 3D markers │  │
   │  │ backend proxy  │    │ Clustering, color, sizing    │  │
   │  └────────────────┘    └──────────────────────────────┘  │
   └──────────────┬───────────────────────────────────────────┘
                  │ fetch /api/*
                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │                BACKEND PROXY (Express/Fastify)           │
   │                                                          │
   │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
   │  │ IN-MEMORY    │  │  NORMALIZER  │  │  JSON LOGGER  │  │
   │  │ CACHE        │  │  Unified     │  │  Structured   │  │
   │  │ per-API TTLs │  │  event shape │  │  error logs   │  │
   │  └──────────────┘  └──────────────┘  └───────────────┘  │
   │                                                          │
   │  API keys stored server-side (FIRMS, DONKI)              │
   │  Retry: 3 attempts w/ exponential backoff, then wait     │
   └──────────────┬───────────────────────────────────────────┘
                  │ upstream API calls
                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │                  UPSTREAM APIs                           │
   │                                                          │
   │  NASA EONET  ·  USGS Quakes  ·  NASA DONKI              │
   │  NASA FIRMS  ·  NOAA NWS     ·  NASA GIBS               │
   └──────────────────────────────────────────────────────────┘
```

### Backend proxy server

The backend is a lightweight API proxy (Express or Fastify, TBD) that sits between the React client and all upstream APIs. It runs as a persistent server, hosted locally for v1 with AWS deployment designed later.

**Backend responsibilities:**
- Proxies all external API calls (EONET, FIRMS, USGS, NWS, DONKI, GIBS)
- Stores and manages API keys server-side (FIRMS map key, DONKI NASA key)
- Caches API responses in-memory with per-API TTLs
- Normalizes all API responses into a consistent internal event schema
- Structured JSON error logging via a reusable logger class
- Rate limit management against upstream APIs
- Retry failed upstream calls: exponential backoff (1s, 2s, 4s), max 3 attempts, then wait for next poll cycle

**Backend does NOT handle:**
- User authentication (no user accounts)
- Database or persistent storage (in-memory cache only, lost on restart)
- WebSocket push (client polls the backend)

### Communication model

Client-driven polling. The client fetches from the backend on regular intervals. The backend checks cache freshness — returns cached data if fresh, fetches upstream if stale.

### Polling strategy

- EONET: Client fetches `/api/eonet` on app load, then every 10 minutes
- USGS: Client fetches `/api/usgs` on load, refresh every 5 minutes
- DONKI: Client fetches `/api/donki` on load if space weather layer is enabled, refresh every 20 minutes
- FIRMS: Client fetches `/api/firms` on-demand when user enables fire density layer
- NWS: Client fetches `/api/nws` on-demand when globe viewport is over the US
- GIBS: Client fetches `/api/gibs` on-demand when user requests satellite imagery for a specific event

### Cache TTLs

| API | Cache TTL | Reasoning |
|---|---|---|
| EONET | 10 minutes | Matches poll interval, events don't change faster |
| USGS | 5 minutes | Earthquakes are time-sensitive |
| DONKI | 20 minutes | Space weather changes slowly |
| FIRMS | 30 minutes | Fire data updates ~daily, aggressive caching fine |
| NWS | 3 minutes | Weather alerts are urgent, shorter cache |
| GIBS | 24 hours | Satellite tiles rarely change intraday |

### Normalized event schema

All upstream API responses are normalized to a consistent shape before reaching the client:

```json
{
  "id": "string",
  "title": "string",
  "category": "wildfires | severeStorms | volcanoes | earthquakes | ...",
  "source": "eonet | usgs | firms | nws | donki",
  "coordinates": { "lat": 0.0, "lng": 0.0 },
  "magnitude": { "value": 0.0, "unit": "string" },
  "status": "active | closed",
  "timestamp": "ISO8601 string",
  "geometry": "GeoJSON geometry (for polygons, tracks)",
  "metadata": "source-specific extra fields"
}
```

### Deduplication

No deduplication between data sources for v1. EONET and USGS may report the same earthquake — both are displayed. Visual differentiation (circle vs diamond markers, per EM-18) communicates the data source distinction.

### Error handling

**User-facing (client):**

| Scenario | User sees |
|---|---|
| EONET fails on initial load | "Unable to load event data. Retrying..." with a retry button |
| EONET fails on refresh poll | Nothing visible — stale data stays, "Updated 15m ago" shows age |
| FIRMS fails when toggling fire layer | Toast notification: "Fire data temporarily unavailable" — toggle reverts to off |
| DONKI fails | Solar indicator shows gray dot, tooltip "Unavailable" |
| Any API returns empty data | Normal render with no markers — no error shown |

**Developer-facing (backend):**

Structured JSON logs written to stdout. A reusable logger class provides consistent format across all backend components. Log entries include:
- Timestamp (ISO8601)
- Log level (info, warn, error)
- Source API name
- Request context (endpoint, params)
- Response status code
- Error message and stack trace (on failure)
- Cache hit/miss indicator
- Retry attempt number (on retry)

No external logging service for v1. JSON stdout is compatible with any future log aggregator (CloudWatch, Datadog, etc.).

---

## 7. UI components

### Visual style

The UI follows a dark, frosted-glass aesthetic matching the globe's nighttime command-center feel. All panels use translucent dark backgrounds with subtle blur, thin borders, and muted text. Accent colors match event categories. No white backgrounds anywhere.

**Design references:**
- Globe rendering: dark nighttime Earth with warm amber city lights, cyan atmospheric rim glow, teal ocean contour lines (see reference images 2, 3)
- Marker interaction: numbered cluster bubbles, popup cards with structured data (see reference image 1 — IQAir style)
- Dashboard overlay: frosted-glass cards floating over the globe, search bar, stat summaries (see reference image 3)
- Globe interaction model: spinnable/zoomable 3D globe with smooth orbit controls (see https://hegemonglobal.com/ for interaction feel, not visual style)
- **Active mockup:** 3D globe prototype in progress (see `globe-v26*.png` for latest iterations). Iterating on nighttime texture, ocean contour lines, city light warmth, and atmospheric glow. Final visual parameters (exact glow intensity, contour density, color temperature) will be derived from the mockup once finalized.

### Layout model

All UI elements float over the full-viewport globe as translucent overlays. No panel pushes the globe aside — the globe is always 100% of the viewport. Side panels are collapsible to maximize globe visibility. Non-interactive overlay areas use `pointer-events: none`.

### Component inventory

**Globe canvas** (full viewport)
The Three.js rendered globe occupying 100% of the viewport. Everything else floats on top.

**Vignette** (full viewport, non-interactive)
CSS radial gradient overlay that subtly darkens the viewport edges for a cinematic effect. Barely noticeable — purely atmospheric. `pointer-events: none`.

**Top bar** (centered pill, ~40% viewport width)
Frosted-glass pill-shaped bar floating at the top center of the viewport. Left and right sides of the viewport remain open (globe visible behind). Contains:
- Search input with dropdown results (searches event titles, category names, and region names like "Asia" or "Pacific")
- Active event count badge
- Solar activity indicator (from DONKI — solar flare class, not Kp index)
- Settings gear icon (opens dropdown with Performance Mode toggle)

Search behavior: client-side filter + fly-to. Typing filters the event feed sidebar in real-time AND displays a dropdown list of matching results. Selecting a region (e.g., "Asia") rotates the globe to center on that region. Selecting an event flies to that event.

Region fly-to uses a hardcoded client-side lookup table mapping ~15–20 region names to lat/lng coordinates (e.g., `"Asia": { lat: 34, lng: 100 }`, `"Pacific": { lat: 0, lng: -160 }`, `"Europe": { lat: 50, lng: 15 }`, etc.).

**Solar activity indicator:**

| Solar flare class | Dot color | Tooltip |
|---|---|---|
| No recent flares | Gray | "No activity" |
| B or C class | Green | "Quiet" |
| M class | Yellow | "Active" |
| X class | Red | "Solar storm" |

**Layer toggle panel** (right edge, collapsible)
Frosted-glass panel floating on the right edge of the viewport. Collapsible via a small toggle button visible when collapsed. When expanded, shows a vertical list of toggle switches grouped into sections:
- EONET category filters (wildfires, storms, earthquakes, volcanoes, etc.)
- Enhancement layers (fire density, seismic density, weather alerts)
- Space weather layer
- Satellite imagery overlay

Each toggle shows an icon, label, and active event count for that category. Toggling a layer immediately shows/hides the corresponding data overlay on the globe with a fade animation.

**Event popup card** (anchored to marker, single instance)
Appears on marker click. Frosted-glass panel (~280px wide) positioned with a screen-space offset to the side of the marker's projected position. Connected to the marker by a thin line. Flips to the opposite side if the marker is near the viewport edge.
- Category icon + event title (bold)
- Source agency (muted text)
- Magnitude badge (if available) with unit
- Status pill: green "Active" or gray "Closed"
- Timestamp (relative: "2 hours ago" or absolute)
- "View satellite imagery" action link
- "View source" link to the originating agency's page

Popup behavior:
- Only one popup open at a time
- Clicking a different marker closes the current popup and opens the new one
- Clicking empty space closes the popup
- Pressing Escape closes the popup
- Globe rotation closes the popup
- Scroll-zooming keeps the popup open
- Popup does not follow the marker during rotation — it closes instead

**Event feed sidebar** (left edge, collapsible)
Frosted-glass panel floating on the left edge of the viewport. Collapsible via a small toggle button. Contains:
- **Summary metrics** (top of panel, 3 items):
  - Total active events (e.g., "47 active")
  - Most active category (e.g., "Wildfires: 12")
  - Last updated timestamp (e.g., "Updated 2m ago")
- **Event list** (scrollable):
  - Each item shows category icon, event title, and relative time
  - Sorted by recency
  - Clicking an item rotates the globe to that event and opens its popup card
  - List filters in real-time as the user types in the search bar

**Bottom bar** (minimal, full width)
- Current layer indicators as small pills showing which data sources are active
- Coordinate readout (lat/lng of cursor position on globe) — hidden when cursor is over a UI panel, visible only when hovering over the globe surface

No zoom +/- buttons in v1 — zoom is handled entirely by scroll wheel.

**Loading state**
Centered on viewport: app name, thin progress bar, muted text "Loading." Same dark background as the scene for seamless transition.

### Component hierarchy

```
<App>
  ├── <GlobeCanvas />           ← Three.js renderer (full viewport)
  ├── <Vignette />              ← CSS radial gradient overlay (pointer-events: none, subtle)
  ├── <TopBar>                  ← Centered pill (~40% width)
  │   ├── <SearchInput />       ← With dropdown results list
  │   ├── <EventCountBadge />
  │   ├── <SolarIndicator />    ← Solar flare class (B/C/M/X)
  │   └── <SettingsGear />      ← Dropdown with Performance Mode toggle
  ├── <LayerPanel>              ← Right edge, collapsible
  │   ├── <CategoryToggle /> × 13
  │   ├── <EnhancementToggle /> × 3
  │   └── <SpaceWeatherToggle />
  ├── <SpaceWeatherCard />      ← Shown when space weather layer toggled ON
  ├── <EventPopup />            ← Single instance, screen-space anchored
  ├── <EventFeed>               ← Left edge, collapsible
  │   ├── <FeedMetrics />       ← 3 summary stats
  │   └── <EventList />         ← Scrollable, filterable
  ├── <BottomBar>
  │   ├── <ActiveLayerPills />
  │   └── <CoordinateReadout /> ← Hidden when cursor over UI panels
  └── <LoadingScreen />         ← Shown during initial load
```

---

## 8. Event marker design

### Rendering approach

EONET event markers are rendered as **HTML overlay elements** (via CSS2DRenderer) projected onto the globe surface. Each marker is a styled 2D DOM element with a category-specific icon, color-coded background, and CSS animations. Markers are positioned with a slight vertical offset above the globe surface to prevent z-fighting.

**Visibility:** Markers on the back side of the globe are fully removed from the DOM (not just hidden). Visibility is determined by comparing the marker's surface normal against the camera direction (`dot product < 0` = hidden). Markers re-render when they rotate into view. This prevents phantom click targets and improves performance.

**Enhancement layer markers** (FIRMS, USGS) use instanced Three.js geometry for performance at scale, not HTML overlays.

### Marker types

**Default marker** — styled 2D element (4–6px) with a category icon, color-coded by category. A slow pulse animation (2–3 second radial opacity fade) indicates the event is active/open. Each category has a distinct icon (flame for fires, lightning for storms, mountain for volcanoes, wave for earthquakes, etc.).

**Cluster marker** — when multiple markers overlap at the current zoom level, they merge into a larger circle (16–24px) displaying a count number. The circle color reflects the **highest-severity category** in the cluster (see severity ranking below). Clusters break apart at half-continent zoom level.

**Cross-category clusters** — markers from different categories merge into a single cluster at high-level view. The cluster color is determined by the highest-severity category present, and the count reflects total events across all categories. At half-continent zoom, clusters break into individual category markers.

**Selected marker** — the clicked marker transitions to a concentric ring animation: bright center dot with 2–3 expanding rings that fade outward. Color matches the event category.

**Storm track** — EONET events with multi-coordinate geometries (storms, icebergs) render as animated paths on the globe surface. The path shows the event's temporal trajectory with timestamps at key points.

### Category severity ranking

Used for cluster bubble color (highest-severity category wins). Ranked from most to least severe:

| Rank | Category |
|---|---|
| 1 | Volcanoes |
| 2 | Earthquakes |
| 3 | Severe storms |
| 4 | Wildfires |
| 5 | Floods |
| 6 | Landslides |
| 7 | Manmade (fixed middle rank for v1) |
| 8 | Drought |
| 9 | Temp extremes |
| 10 | Dust/haze |
| 11 | Snow |
| 12 | Sea/lake ice |
| 13 | Water color |

### Category color scheme

| Category | Color | Hex | Marker style | Icon |
|---|---|---|---|---|
| Wildfires | Warm orange | `#ff6b35` | Pulsing dot | Flame |
| Severe storms | Electric blue | `#4e9eff` | Dot + track line | Lightning bolt |
| Volcanoes | Deep red | `#e8403f` | Pulsing dot | Mountain/eruption |
| Earthquakes | Amber gold | `#f5a623` | Ripple rings | Seismic wave |
| Floods | Cyan teal | `#00bcd4` | Pulsing dot | Water drop |
| Drought | Muted tan | `#c4956a` | Pulsing dot | Cracked ground |
| Dust/haze | Sandy gray | `#a89882` | Pulsing dot | Cloud |
| Landslides | Brown | `#8b6914` | Pulsing dot | Slope |
| Sea/lake ice | Ice blue | `#b3e5fc` | Dot + track line | Snowflake |
| Snow | White blue | `#e0f0ff` | Pulsing dot | Snow |
| Temp extremes | Hot pink / cool blue | `#ff4081` / `#40c4ff` | Pulsing dot | Thermometer |
| Water color | Green teal | `#26a69a` | Pulsing dot | Water |
| Manmade | Purple gray | `#9c7cb5` | Pulsing dot | Warning triangle |
| Space weather | Aurora green | `#69f0ae` | Globe effect | Sun |

### Enhancement layer rendering

**NASA FIRMS (fire density):**
- At wide zoom: rendered as a **heatmap overlay** on the globe surface (density-based color gradient)
- At max zoom (continental): individual thermal detections rendered as **instanced tiny dots** (1–2px), colored by fire radiative power

**USGS Earthquakes (seismic density):**
- Rendered as **instanced geometry** (diamond shape to differentiate from EONET circle markers)
- Sized by magnitude, colored by depth
- Visually distinct from EONET earthquake markers to prevent confusion about data source

### Clustering

**Algorithm:** Grid-based spatial clustering. The visible globe is divided into a grid; markers in the same cell merge into a cluster bubble.

**Break threshold:** Clusters break apart into individual markers at half-continent zoom level (roughly half of Africa visible in viewport).

**Cross-category behavior:** At high-level view, markers from all enabled categories merge into shared clusters. Cluster color = highest-severity category present. Count = total events.

---

## 9. Tech stack

| Layer | Technology |
|---|---|
| Rendering | Three.js (r170+) |
| Post-processing | EffectComposer, UnrealBloomPass (disabled in Performance Mode) |
| Camera controls | OrbitControls |
| Globe texture | NASA Earth-at-night — progressive load (2K immediate, 4K background) |
| Contour lines | Procedural Canvas2D → texture, animated (decorative only) |
| UI framework | React + shadcn/ui component library |
| Backend | Express or Fastify (TBD), persistent server |
| API calls | Client → backend proxy → upstream APIs |
| Build tools | Vite |
| Testing | Vitest (backend only for v1) |
| CI/CD | GitHub Actions (lint + type check + build) |
| Containerization | Docker + docker-compose (full stack) |
| Hosting (v1) | Local development only (Docker or npm scripts) |
| Hosting (future) | AWS: ECS Fargate, ALB, S3 + CloudFront, managed via Terraform |
| Error handling | Dual-layer: structured backend JSON logs (developer), simplified messages (user) |

### Repository structure

Monorepo with shared TypeScript types between client and server:

```
terra/
├── docker-compose.yml          ← Full-stack local dev
├── Dockerfile                  ← Multi-stage build (frontend + backend)
├── package.json                ← Root workspace config
├── .env.example                ← Required env vars template (committed)
├── .env                        ← Actual env vars (gitignored)
├── client/                     ← React + Vite frontend
│   ├── src/
│   └── package.json
├── server/                     ← Express/Fastify backend proxy
│   ├── src/
│   └── package.json
├── shared/                     ← Shared TypeScript types, constants
│   └── types.ts                ← Normalized event schema, category types
└── .github/
    └── workflows/
        └── ci.yml              ← Lint + type check + build
```

### Deployment model

**v1 (local development):**
- Run via `docker-compose up` (preferred) or `npm run dev` scripts
- Single `.env` file for API keys
- No public URL, no cloud hosting
- Express/Fastify serves both API routes (`/api/*`) and built React static files (`/*`) — single process, single port, no CORS

**Future (AWS):**
- Terraform-managed infrastructure
- ECS Fargate for containerized backend
- S3 + CloudFront for static frontend assets
- ALB for load balancing
- Multiple environments (dev, staging, prod) with separate `.env` configs

---

## 10. API auth requirements

| API | Auth type | How to obtain | Cost |
|---|---|---|---|
| NASA EONET | None | — | Free |
| NASA FIRMS | Map key | https://firms.modaps.eosdis.nasa.gov/api/map_key/ | Free |
| USGS Earthquakes | None | — | Free |
| NOAA NWS Alerts | User-Agent header | Include app name + contact email | Free |
| NASA DONKI | API key | https://api.nasa.gov/ | Free |
| NASA GIBS | None | — | Free |

---

## 11. Layer toggle matrix

| Layer | API source | Default state | Activation trigger | Density |
|---|---|---|---|---|
| Globe surface | Nighttime texture | Always on | — | N/A |
| Contour lines | Procedural | Always on | — | N/A |
| Atmosphere glow | Shader | Always on | — | N/A |
| Solar indicator dot | NASA DONKI `/FLR` | Always on | — (ambient awareness, independent of toggle) | N/A |
| Core events | NASA EONET | On | — | Low (20–80) |
| Fire density | NASA FIRMS | Off | Toggle or fire event drill-in | Very high |
| Seismic density | USGS Earthquakes | Off | Toggle or quake event drill-in | High |
| Weather alerts | NOAA NWS | Off | Manual toggle only | Medium |
| Space weather (aurora + info card) | NASA DONKI | Off | Manual toggle | Low |
| Satellite imagery | NASA GIBS | Off | "View imagery" on event popup | N/A (tiles) |

---

## 12. Future considerations

- **Mobile responsiveness** — touch gestures for globe interaction, responsive UI panels
- **Notification system** — alert when a new high-severity event appears
- **Historical replay** — timeline scrubber to replay events over past days/weeks/months
- **Event analytics** — aggregate statistics (events by category over time, regional breakdowns)
- ~~**Backend proxy**~~ — moved to core architecture (see Tech stack)
- **PWA** — installable progressive web app with offline cached globe texture
- **Accessibility** — screen reader support for event data, keyboard navigation
- **AWS deployment** — ECS Fargate + ALB + S3/CloudFront, managed via Terraform (architecture defined, not yet implemented)
- **Multi-environment** — separate dev/staging/prod configs with environment-specific `.env` files
- **Frontend tests** — React component tests via Vitest + React Testing Library
- **Event deduplication** — merge overlapping EONET + USGS earthquake events
- **Redis cache** — shared cache layer for multi-instance deployments
- **Dynamic manmade severity** — per-event severity scoring instead of fixed middle rank

---

## 13. Acceptance criteria

### 13.1 Globe rendering

#### Textures and visual surface

| ID | Criterion | Details |
|---|---|---|
| GR-01 | Progressive texture loading | Load 2K (2048×1024) NASA night texture immediately. Background-load 4K texture and crossfade swap (~500ms shader blend) with no visible pop. |
| GR-02 | City lights | Warm amber city lights visible on the night texture. Comes from the NASA night-Earth texture — no additional light layer required. |
| GR-03 | Ocean contour lines | Decorative animated lines on ocean surfaces suggesting movement. Minimalistic and sparse — not dense coverage. Slow drift animation. Not tied to real data. Teal color palette. |
| GR-04 | Atmospheric rim glow | Fresnel-based glow extending outward from globe edge. Peak opacity at rim: 20–30%. Fades to transparent over a short distance. Cyan tint. Subtle — not dramatic. |
| GR-05 | Overall mood | Dark, cinematic, command-center feel. No white backgrounds. Navy continents, amber lights, cyan/teal accents. |

#### Camera and interaction

| ID | Criterion | Details |
|---|---|---|
| GR-06 | Auto-rotation | ~1 revolution per 24 minutes on initial load. Stops permanently on first user interaction. Does not resume until page refresh. |
| GR-07 | Click + drag | Free orbit rotation around the globe via OrbitControls. |
| GR-08 | Momentum on release | After drag release, globe continues briefly in the drag direction, then decelerates smoothly to a stop. Globe stays at final position — no snap-back, no auto-rotation resume. |
| GR-09 | Scroll zoom | Smooth zoom in/out via scroll wheel. |
| GR-10 | Zoom out limit | Globe cannot be smaller than ~70% of the viewport. Globe is always the dominant visual element. |
| GR-11 | Zoom in limit | Continental level — e.g., Africa or Europe fills most of the viewport. No further zoom. Sufficient to distinguish individual markers but not sub-country detail. |
| GR-12 | Input | Mouse + keyboard only for v1. No touch or mobile support required. |

#### Performance

| ID | Criterion | Details |
|---|---|---|
| GR-13 | Target devices | Modern desktop/laptop computers. Integrated graphics (Intel Iris, Apple M-series) and dedicated GPUs. Windows and macOS. |
| GR-14 | Target framerate | 60fps on dedicated GPU. 30fps minimum on integrated graphics. |
| GR-15 | Post-processing | UnrealBloomPass enabled by default. Disabled when Performance Mode is ON. |
| GR-16 | Performance Mode | User-facing toggle in settings. ON = bloom off, stay on 2K texture (skip 4K load), reduce/disable ocean contour animation. OFF = full quality. |

#### Loading sequence

| ID | Criterion | Details |
|---|---|---|
| GR-17 | Initial load | Show loading screen → load 2K texture + initial API data in parallel → render globe → dismiss loading screen → background-load 4K texture → crossfade when ready. |
| GR-18 | Texture swap | 2K→4K swap uses shader-based crossfade (~500ms). No visible pop or flicker. Skipped entirely if Performance Mode is ON. |

### 13.2 Event markers and clustering

#### Marker rendering

| ID | Criterion | Details |
|---|---|---|
| EM-01 | Rendering technology | EONET markers rendered as HTML overlay elements via CSS2DRenderer. Enhancement layer markers (FIRMS, USGS) rendered as instanced Three.js geometry. |
| EM-02 | Back-face culling | Markers on the back side of the globe are fully removed from the DOM. Visibility determined by dot product of marker normal vs camera direction. Markers re-render when rotating into view. |
| EM-03 | Surface offset | Markers positioned with slight vertical hover above the globe surface to prevent z-fighting with the sphere geometry. |
| EM-04 | Category icons | Each category has a distinct 2D icon (flame, lightning bolt, mountain, seismic wave, water drop, etc.) displayed within the marker element. |
| EM-05 | Pulse animation | Active/open event markers display a slow pulse animation (2–3 second radial opacity fade) via CSS. |
| EM-06 | Selected state | Clicked marker transitions to concentric ring animation: bright center dot + 2–3 expanding rings fading outward. Color matches event category. |

#### Clustering

| ID | Criterion | Details |
|---|---|---|
| EM-07 | Algorithm | Grid-based spatial clustering. Visible globe divided into grid cells; markers in the same cell merge. |
| EM-08 | Break threshold | Clusters break into individual markers at half-continent zoom (roughly half of Africa visible). |
| EM-09 | Cross-category merge | At high-level view, markers from all enabled categories merge into shared clusters. |
| EM-10 | Cluster color | Determined by the highest-severity category present in the cluster (per severity ranking table). |
| EM-11 | Cluster count | Displays total event count across all categories in the cluster. |
| EM-12 | Cluster size | 16–24px circle with count number displayed inside. |
| EM-13 | Disabled layers | Markers from disabled layers are excluded from clusters — they do not contribute to count or color. |

#### Severity ranking

| ID | Criterion | Details |
|---|---|---|
| EM-14 | Ranking order | Volcanoes > Earthquakes > Severe storms > Wildfires > Floods > Landslides > Manmade > Drought > Temp extremes > Dust/haze > Snow > Sea/lake ice > Water color. |
| EM-15 | Manmade ranking | Fixed at middle rank (between Landslides and Drought) for v1. No per-event dynamic severity. |

#### Enhancement layers

| ID | Criterion | Details |
|---|---|---|
| EM-16 | FIRMS wide zoom | Fire detections rendered as a heatmap overlay (density-based color gradient on globe surface). |
| EM-17 | FIRMS max zoom | At continental zoom, individual thermal detections rendered as instanced dots (1–2px), colored by fire radiative power. |
| EM-18 | USGS shape | Earthquake detections rendered as diamond-shaped instanced geometry — visually distinct from EONET circle markers. |
| EM-19 | USGS sizing | USGS markers sized by magnitude, colored by depth. |
| EM-20 | Source differentiation | Enhancement layer markers must be visually distinguishable from EONET markers so users know which data source they're viewing. |

### 13.3 UI components

#### Layout

| ID | Criterion | Details |
|---|---|---|
| UI-01 | Globe viewport | Globe canvas occupies 100% of the viewport. All UI elements float over it as translucent overlays. No panel pushes the globe aside. |
| UI-02 | Overlay layering | Non-interactive overlay areas (vignette) use `pointer-events: none`. Interactive panels capture pointer events only within their bounds. |
| UI-03 | Visual style | All panels use frosted-glass aesthetic: translucent dark backgrounds, subtle backdrop blur, thin borders, muted text. No white backgrounds. |

#### Top bar

| ID | Criterion | Details |
|---|---|---|
| UI-04 | Shape and position | Pill-shaped frosted-glass bar, centered horizontally at the top of the viewport. ~40% viewport width. Left and right sides of viewport remain open. |
| UI-05 | Search input | Text input supporting event titles, category names, and region names (e.g., "Asia", "Pacific"). |
| UI-06 | Search dropdown | Typing displays a dropdown list of matching results below the search bar. Results update in real-time as user types. |
| UI-07 | Search fly-to | Selecting a region result rotates the globe to center on that region. Selecting an event result flies to that event and opens its popup. |
| UI-08 | Search feed filter | Typing in search filters the event feed sidebar in real-time to show only matching events. |
| UI-09 | Event count badge | Displays total number of active events currently loaded. |
| UI-10 | Solar indicator | Colored dot reflecting current solar flare class from DONKI. Gray = no activity, green = B/C class ("Quiet"), yellow = M class ("Active"), red = X class ("Solar storm"). Tooltip on hover shows the label. |
| UI-11 | Settings gear | Icon in the top bar. Clicking opens a dropdown with the Performance Mode toggle (ON/OFF). |
| UI-35 | Region lookup table | Hardcoded client-side mapping of ~15–20 region names to lat/lng coordinates. Used by search fly-to. Includes continents, oceans, and major regions. |

#### Layer panel (right edge)

| ID | Criterion | Details |
|---|---|---|
| UI-12 | Position | Frosted-glass panel floating on the right edge of the viewport, overlaying the globe. |
| UI-13 | Collapsible | Collapsible via a small toggle button. When collapsed, only the toggle button is visible. When expanded, shows full toggle list. **Starts expanded on initial load.** |
| UI-14 | Toggle groups | Toggles organized into sections: EONET categories (13), Enhancement layers (3), Space weather (1), Satellite imagery (1). |
| UI-15 | Toggle content | Each toggle shows: category icon, label, and active event count for that category. |
| UI-16 | Toggle behavior | Toggling a layer immediately shows/hides the corresponding markers/overlay on the globe with a fade animation. |

#### Event popup card

| ID | Criterion | Details |
|---|---|---|
| UI-17 | Positioning | Screen-space offset to the side of the marker's projected 2D position. Connected to marker by a thin line. Flips to opposite side if marker is near viewport edge. |
| UI-18 | Single instance | Only one popup open at a time. Clicking a different marker closes the current and opens the new one. |
| UI-19 | Close triggers | Closes on: click empty space, press Escape, globe rotation, click different marker. Does NOT close on scroll-zoom. |
| UI-20 | Card content | Category icon + title (bold), source agency (muted), magnitude badge with unit (if available), status pill (green "Active" / gray "Closed"), relative timestamp, "View satellite imagery" link, "View source" link. |
| UI-21 | Width | ~280px fixed width. |

#### Event feed sidebar (left edge)

| ID | Criterion | Details |
|---|---|---|
| UI-22 | Position | Frosted-glass panel floating on the left edge of the viewport, overlaying the globe. |
| UI-23 | Collapsible | Collapsible via a small toggle button, same pattern as the layer panel. **Starts expanded on initial load.** |
| UI-24 | Summary metrics | Top of panel displays 3 metrics: total active events, most active category with count, last updated timestamp. |
| UI-25 | Event list | Scrollable list of active events. Each item shows category icon, event title, and relative time. Sorted by recency. |
| UI-26 | Event click | Clicking an event list item rotates the globe to that event and opens its popup card. |
| UI-27 | Search integration | List filters in real-time as the user types in the top bar search input. |

#### Bottom bar

| ID | Criterion | Details |
|---|---|---|
| UI-28 | Active layer pills | Small pills showing which data sources are currently active/enabled. |
| UI-29 | Coordinate readout | Shows lat/lng of cursor position on globe. Hidden entirely when cursor is over any UI panel. Visible only when hovering over the globe surface. |
| UI-30 | No zoom buttons | Zoom +/- buttons are cut from v1. Zoom handled by scroll wheel only. |

#### Vignette

| ID | Criterion | Details |
|---|---|---|
| UI-31 | Effect | CSS radial gradient overlay darkening viewport edges. Barely noticeable — purely atmospheric. |
| UI-32 | Non-interactive | `pointer-events: none`. Does not interfere with any UI elements or globe interaction. |

#### Loading screen

| ID | Criterion | Details |
|---|---|---|
| UI-33 | Content | App name, thin progress bar, muted "Loading" text. Dark background matching the scene. |
| UI-34 | Transition | Dismisses seamlessly once 2K texture and initial API data are loaded. No jarring cut. |

### 13.4 Data layer and API integration

#### Backend proxy

| ID | Criterion | Details |
|---|---|---|
| DL-01 | Server framework | Express or Fastify (TBD). Persistent server, not serverless. Hosted locally for v1. |
| DL-02 | API key protection | FIRMS map key and DONKI NASA API key stored server-side only. Never exposed to the client. |
| DL-03 | Proxy endpoints | Backend exposes `/api/eonet`, `/api/usgs`, `/api/donki`, `/api/firms`, `/api/nws`, `/api/gibs` — one endpoint per upstream API. |
| DL-04 | No auth | No user authentication. Backend is an open proxy for v1 (secured by network/hosting in production). |
| DL-05 | No persistent storage | No database. In-memory cache only, lost on server restart. |

#### Caching

| ID | Criterion | Details |
|---|---|---|
| DL-06 | Cache layer | In-memory cache on the backend server process. No Redis. |
| DL-07 | Cache TTLs | EONET: 10min, USGS: 5min, DONKI: 20min, FIRMS: 30min, NWS: 3min, GIBS: 24hr. |
| DL-08 | Client-driven model | Client polls backend on regular intervals. Backend returns cached data if fresh, fetches upstream if stale. |
| DL-09 | Stale data on failure | If upstream fetch fails after retries, backend serves stale cached data (if available) rather than returning an error. |

#### Polling intervals (client-side)

| ID | Criterion | Details |
|---|---|---|
| DL-10 | EONET | Fetch on app load, then every 10 minutes. |
| DL-11 | USGS | Fetch on load, refresh every 5 minutes. |
| DL-12 | DONKI | Fetch on load (if space weather layer enabled), refresh every 20 minutes. |
| DL-13 | FIRMS | On-demand only — when user enables fire density layer. |
| DL-14 | NWS | On-demand only — when user manually toggles NWS layer on. US coverage only. |
| DL-15 | GIBS | On-demand only — when user requests satellite imagery for a specific event. |
| DL-30 | GIBS overlay scope | Dynamic: if event has polygon geometry, use that boundary. If point geometry, use a default radius (~5° lat/lng) around coordinates. |

#### Data normalization

| ID | Criterion | Details |
|---|---|---|
| DL-16 | Normalized schema | All upstream responses normalized to a consistent event shape: id, title, category, source, coordinates, magnitude, status, timestamp, geometry, metadata. |
| DL-17 | No deduplication | EONET and USGS may report the same earthquake — both are displayed. Visual differentiation (circle vs diamond per EM-18) communicates data source. |

#### Error handling (user-facing)

| ID | Criterion | Details |
|---|---|---|
| DL-18 | Critical failure (initial load) | EONET fails on initial load → "Unable to load event data. Retrying..." with retry button. |
| DL-19 | Refresh failure (polling) | EONET fails on refresh → stale data remains visible, "Updated 15m ago" timestamp shows data age. |
| DL-20 | Enhancement layer failure | FIRMS/NWS fails when toggling → toast notification ("Fire data temporarily unavailable"), toggle reverts to off. |
| DL-21 | DONKI failure | Solar indicator shows gray dot with "Unavailable" tooltip. |
| DL-22 | Empty response | Normal render with no markers for that layer. No error shown — empty is valid. |

#### Error handling (developer-facing)

| ID | Criterion | Details |
|---|---|---|
| DL-23 | Log format | Structured JSON logs written to stdout. |
| DL-24 | Reusable logger | Single logger class reused across all backend components. Consistent format everywhere. |
| DL-25 | Log fields | Every log entry includes: timestamp (ISO8601), log level (info/warn/error), source API name, request context (endpoint, params), response status, error message + stack trace (on failure), cache hit/miss, retry attempt number. |
| DL-26 | No external services | No Sentry or external logging service for v1. Stdout JSON only. |

#### Retry strategy

| ID | Criterion | Details |
|---|---|---|
| DL-27 | Immediate retry | On upstream API failure, retry with exponential backoff: 1s, 2s, 4s delay between attempts. |
| DL-28 | Max attempts | Maximum 3 retry attempts per request. |
| DL-29 | Fallback after max retries | After 3 failures, serve stale cache if available. If no cache, return error to client. Wait for next poll cycle to try again. |

### 13.5 Space weather layer

#### Aurora effect

| ID | Criterion | Details |
|---|---|---|
| SW-01 | Rendering approach | Shader-based green/purple glow band at high latitudes (60°–90° N/S). Not a particle system or texture overlay. |
| SW-02 | Activation threshold | Aurora appears when geomagnetic storm is active (Kp ≥ 5 from DONKI `/GST` endpoint). |
| SW-03 | Scaled intensity | Kp 5 = faint glow, narrow band. Kp 7 = moderate glow, wider band. Kp 9 = intense glow, widest latitude coverage. Not binary on/off. |
| SW-04 | Render order | Aurora renders below event markers. Markers always float above the aurora glow on the globe surface. |
| SW-05 | Performance Mode | Aurora effect is completely disabled when Performance Mode is ON. No reduced version — fully off. |
| SW-06 | Both poles | Aurora renders at both North and South polar regions simultaneously. |

#### Solar indicator (always active)

| ID | Criterion | Details |
|---|---|---|
| SW-07 | Always visible | Solar indicator dot in the top bar is always active regardless of the space weather layer toggle. Provides ambient awareness. |
| SW-08 | Flare class display | Indicator reflects current solar flare class from DONKI `/FLR` endpoint. Not Kp index. |
| SW-09 | Color mapping | Gray = no recent flares. Green = B/C class ("Quiet"). Yellow = M class ("Active"). Red = X class ("Solar storm"). |
| SW-10 | Tooltip | Hover shows the label text (e.g., "Quiet", "Active", "Solar storm", "No activity", or "Unavailable" on API failure). |

#### Space weather info card

| ID | Criterion | Details |
|---|---|---|
| SW-11 | Toggle-dependent | Info card appears only when the space weather layer is toggled ON. |
| SW-12 | Card content | Displays: current solar flare class with label, last flare time (relative timestamp), Earth-directed CME status. |
| SW-13 | CME arrival time | If an Earth-directed CME is detected, shows estimated arrival time with ±6 hours qualifier (e.g., "Arriving in ~18 hours ±6h"). |
| SW-14 | No CME | If no Earth-directed CME is active, shows "No Earth-directed CMEs" or similar. |
| SW-15 | Card style | Frosted-glass style matching other UI panels. Positioned near the layer panel or top bar area — not anchored to the globe. |

#### Layer toggle behavior

| ID | Criterion | Details |
|---|---|---|
| SW-16 | Toggle ON | Activates: aurora effect on globe (if Kp ≥ 5) + space weather info card. Solar indicator dot is unaffected (always on). |
| SW-17 | Toggle OFF | Deactivates: aurora effect + info card. Solar indicator dot remains visible and active. |

### 13.6 Infrastructure and deployment

#### Repository

| ID | Criterion | Details |
|---|---|---|
| ID-01 | Monorepo | Single repository with `client/`, `server/`, and `shared/` directories. |
| ID-02 | Shared types | `shared/types.ts` contains normalized event schema, category types, and constants imported by both client and server. |
| ID-03 | Workspace config | Root `package.json` manages workspaces. Both `client/` and `server/` have their own `package.json`. |

#### Docker

| ID | Criterion | Details |
|---|---|---|
| ID-04 | docker-compose | `docker-compose.yml` at repo root. `docker-compose up` starts the full stack (frontend + backend) for local dev. |
| ID-05 | Dockerfile | Multi-stage Dockerfile at repo root. Builds frontend assets, then bundles them into the backend server image. Single container serves everything. |
| ID-06 | Dev workflow | Developers can run via `docker-compose up` (preferred) or `npm run dev` scripts (fallback). Both work. |

#### Server serving model

| ID | Criterion | Details |
|---|---|---|
| ID-07 | Single process | Express/Fastify serves both API routes (`/api/*`) and built React static files (`/*`). Single process, single port. |
| ID-08 | No CORS | Because frontend and backend are served from the same origin, no CORS configuration is needed for v1. |

#### Environment management

| ID | Criterion | Details |
|---|---|---|
| ID-09 | .env file | Single `.env` file at repo root for API keys and config. Gitignored. |
| ID-10 | .env.example | `.env.example` committed to repo showing all required variables without values. Includes: FIRMS map key, DONKI NASA API key, server port, log level. |
| ID-11 | Single environment | Dev only for v1. No staging/prod distinction. |

#### CI/CD

| ID | Criterion | Details |
|---|---|---|
| ID-12 | GitHub Actions | `.github/workflows/ci.yml` runs on PR and push to main. |
| ID-13 | CI pipeline steps | Lint → type check → backend tests → build. All must pass. No auto-deploy. |
| ID-14 | No deploy | v1 has no automated deployment. Deploy is manual (local Docker only). |

#### Testing

| ID | Criterion | Details |
|---|---|---|
| ID-15 | Framework | Vitest for backend tests. |
| ID-16 | Backend test scope | Tests cover: proxy endpoint responses, cache behavior (TTL, stale-while-error), error handling (retry logic, fallback), data normalization (upstream shapes → normalized schema). |
| ID-17 | No frontend tests | No React component tests for v1. Frontend is manually tested. |
| ID-18 | CI integration | Backend tests run as part of the CI pipeline (lint → type check → test → build). |

#### Future AWS architecture (not built in v1)

| ID | Criterion | Details |
|---|---|---|
| ID-19 | Container registry | Docker image pushed to ECR. |
| ID-20 | Compute | ECS Fargate runs the containerized backend. |
| ID-21 | Load balancing | ALB in front of Fargate tasks. |
| ID-22 | Static assets | React build output served via S3 + CloudFront CDN. |
| ID-23 | IaC | All AWS resources managed via Terraform. No manual console provisioning. |
| ID-24 | Terraform scope | Terraform manages cloud infrastructure only. Local dev uses npm/Docker scripts — Terraform does not touch local setup. |