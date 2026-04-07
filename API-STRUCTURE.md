# Globe Visualizer — Project Scope

## Executive Summary

A 3D globe visualization application that tracks real-time natural and space weather events worldwide. The app uses NASA's EONET API as its editorial backbone — providing curated, named natural event metadata — and supplements it with higher-density data sources that enrich specific event categories. A separate toggleable layer adds space weather awareness, and NASA satellite imagery tiles serve as the globe's visual surface.

The design philosophy is **curated over overwhelming**: users see a manageable set of headline events by default, with the ability to drill into higher-density data on demand per category.

---

## API Stack

### 1. NASA EONET — Core Event Layer

**Role in app:** The primary data source. Every event pin on the globe originates from or is anchored to an EONET event. This is the editorial backbone that provides named, titled, categorized natural events with NASA's curatorial authority.

**What it provides:**
- 13 event categories: drought, dust/haze, earthquakes, floods, landslides, manmade, sea/lake ice, severe storms, snow, temperature extremes, volcanoes, water color, wildfires
- ~20–80 active events globally at any given time
- GeoJSON geometries (Point or Polygon) per event, each paired with a timestamp
- Temporal trajectories for moving events (storms, icebergs) as multi-coordinate LineStrings
- Magnitude data where available (wind speed in knots, Richter scale, etc.)
- Open/closed lifecycle status with close dates
- Links to source agencies and NASA GIBS satellite imagery layers per category
- Bounding box queries for viewport-based loading

**Output formats:** JSON, GeoJSON, RSS, ATOM

**Auth:** None required. No API key, no rate limits documented.

**Key endpoints:**
| Endpoint | Description |
|---|---|
| `GET /api/v3/events` | All events (default: open only) |
| `GET /api/v3/events/geojson` | Same as above, native GeoJSON FeatureCollection |
| `GET /api/v3/events/{id}` | Single event detail |
| `GET /api/v3/categories` | List all 12 categories |
| `GET /api/v3/categories/{id}` | Events filtered to a single category |
| `GET /api/v3/sources` | List all source agencies |
| `GET /api/v3/layers/{categoryId}` | GIBS imagery layers mapped to a category |
| `GET /api/v3/magnitudes` | Available magnitude types and IDs |

**Key query parameters:**
| Parameter | Example | Description |
|---|---|---|
| `status` | `open`, `closed`, `all` | Filter by event lifecycle (default: open) |
| `category` | `wildfires,severeStorms` | Comma-separated category filter |
| `source` | `InciWeb,EO` | Comma-separated source filter |
| `days` | `20` | Events from the last N days |
| `start` / `end` | `2025-01-01` / `2025-01-31` | Date range filter (YYYY-MM-DD) |
| `bbox` | `-129.02,50.73,-58.71,12.89` | Bounding box (minLon, maxLat, maxLon, minLat) |
| `limit` | `50` | Max events returned |
| `magID` / `magMin` / `magMax` | `mag_kts` / `1.5` / `20` | Magnitude range filter |

**Base URL:** `https://eonet.gsfc.nasa.gov`

**Documentation:**
- API docs: https://eonet.gsfc.nasa.gov/docs/v3
- How-to guide: https://eonet.gsfc.nasa.gov/how-to-guide
- About / disclaimer: https://eonet.gsfc.nasa.gov/what-is-eonet
- Live categories list: https://eonet.gsfc.nasa.gov/api/v3/categories
- Live sources list: https://eonet.gsfc.nasa.gov/api/v3/sources

**Typical usage pattern:**
```
# Fetch all open events from the last 30 days as GeoJSON
GET https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30

# Fetch only wildfires and severe storms
GET https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=wildfires,severeStorms

# Fetch events within a bounding box (continental US)
GET https://eonet.gsfc.nasa.gov/api/v3/events/geojson?bbox=-125,50,-66,24
```

**Polling cadence:** Every 5–15 minutes.

---

### 2. NASA FIRMS — Enhancement Layer (Wildfires)

**Role in app:** Enriches the EONET `wildfires` category with high-density thermal hotspot data. When a user drills into an EONET wildfire event, FIRMS populates the surrounding region with individual fire detections showing the fire's true footprint and intensity.

**What it provides:**
- Individual thermal hotspot detections from MODIS (Aqua/Terra) and VIIRS (Suomi NPP, NOAA-20/21) satellites
- Each detection includes: latitude, longitude, brightness temperature, scan/track pixel size, acquisition date/time, satellite source, confidence level (low/nominal/high), fire radiative power (FRP in MW)
- 30,000–100,000+ detections per day globally
- Data available within ~3 hours of satellite overpass
- Query by bounding box, country, or global extent
- Output: CSV, JSON, KML, shapefile

**Auth:** Free map key required. Register at https://firms.modaps.eosdis.nasa.gov/api/map_key/

**Key endpoints:**
| Endpoint | Description |
|---|---|
| `GET /api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAYS}` | Fire detections by bounding box |
| `GET /api/country/csv/{MAP_KEY}/{SOURCE}/{COUNTRY}/{DAYS}` | Fire detections by country code |

**Source values:** `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `VIIRS_SNPP_NRT`, `MODIS_NRT`

**Documentation:**
- API overview: https://firms.modaps.eosdis.nasa.gov/api/
- Area API: https://firms.modaps.eosdis.nasa.gov/api/area/
- Country API: https://firms.modaps.eosdis.nasa.gov/api/country/
- Data availability: https://firms.modaps.eosdis.nasa.gov/api/data_availability/
- Python tutorial: https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html

**Typical usage pattern:**
```
# Get VIIRS NOAA-20 fire detections for the western US, last 2 days
GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_NOAA20_NRT/-125,32,-104,49/2

# Get fire detections for the entire world, last 24 hours
GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_NOAA20_NRT/world/1
```

**Integration pattern:** When the user taps an EONET wildfire event, extract the event's coordinates, construct a bounding box (±2–5° around the event center), and query FIRMS for detections in that area over the last 1–3 days. Render each detection as a small heat-colored dot on the globe, sized by FRP and colored by confidence.

**Polling cadence:** On-demand when drilling into wildfire events, or daily for a global fire overlay.

---

### 3. USGS Earthquake Hazards Program — Enhancement Layer (Earthquakes)

**Role in app:** Enriches the EONET `earthquakes` category with comprehensive global seismic data. Provides the ambient "pulse of the Earth" showing continuous seismic activity along fault lines, even when no notable EONET earthquake event is active.

**What it provides:**
- Every detected earthquake globally, updating every 1–5 minutes
- Hundreds of events per day
- Each event includes: magnitude, magnitude type, depth (km), location name, felt reports count, CDI (community intensity), MMI (instrumental intensity), tsunami flag, PAGER alert level (green/yellow/orange/red), significance score
- Pre-segmented GeoJSON feeds by magnitude and time window
- Native GeoJSON FeatureCollection output — same format as EONET

**Auth:** None. Completely free, no API key, no rate limits.

**Pre-built GeoJSON feeds (static URLs, no parameters needed):**
| Feed | URL |
|---|---|
| Significant, past hour | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson` |
| M4.5+, past day | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson` |
| M2.5+, past day | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson` |
| M1.0+, past day | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson` |
| All, past hour | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson` |
| All, past day | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` |
| All, past week | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson` |
| All, past month | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson` |

**Custom query endpoint:**
```
GET https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-31&minmagnitude=5
```

**Key query parameters (custom endpoint):**
| Parameter | Description |
|---|---|
| `format` | `geojson`, `csv`, `xml` |
| `starttime` / `endtime` | ISO 8601 date range |
| `minmagnitude` / `maxmagnitude` | Magnitude filter |
| `mindepth` / `maxdepth` | Depth filter (km) |
| `minlatitude` / `maxlatitude` / `minlongitude` / `maxlongitude` | Bounding box |
| `limit` | Max results (default 20000) |
| `orderby` | `time`, `magnitude` |
| `alertlevel` | `green`, `yellow`, `orange`, `red` |

**Documentation:**
- Real-time feeds overview: https://earthquake.usgs.gov/earthquakes/feed/v1.0/
- GeoJSON format spec: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- Custom query API docs: https://earthquake.usgs.gov/fdsnws/event/1/

**Integration pattern:** Default the globe to show `4.5_day.geojson` (significant global quakes). When the user zooms into a region or taps an EONET earthquake event, switch to `2.5_day` or `all_week` for that bounding box to show aftershock clusters and local seismicity. Size dots by magnitude, color by depth (shallow=warm, deep=cool).

**Polling cadence:** Every 1–5 minutes for the active feed. Pre-built feeds auto-update server-side.

---

### 4. NOAA NWS Alerts — Enhancement Layer (Severe Storms, Floods)

**Role in app:** Enriches the EONET `severeStorms` and `floods` categories with real-time severe weather warning polygons for the United States. Adds the human-impact layer showing exactly which areas are under active warnings.

**What it provides:**
- All active NWS alerts: tornado warnings, hurricane watches, flash flood emergencies, winter storm warnings, heat advisories, and dozens more alert types
- GeoJSON polygons showing the exact geographic area under each alert
- Severity levels: Extreme, Severe, Moderate, Minor, Unknown
- Urgency levels: Immediate, Expected, Future, Past, Unknown
- Certainty levels: Observed, Likely, Possible, Unlikely, Unknown
- Onset/expiration timestamps
- Detailed event descriptions and safety instructions

**Coverage:** United States only (including territories).

**Auth:** None. Free, no API key. Requires a `User-Agent` header (e.g., `(your-app-name, contact@email.com)`).

**Key endpoints:**
| Endpoint | Description |
|---|---|
| `GET /alerts/active` | All currently active alerts |
| `GET /alerts/active?area={state}` | Alerts for a specific state (e.g., `CA`) |
| `GET /alerts/active?event={type}` | Filter by event type (e.g., `Tornado Warning`) |
| `GET /alerts/active?severity={level}` | Filter by severity |
| `GET /alerts/active?point={lat},{lon}` | Alerts for a specific coordinate |

**Base URL:** `https://api.weather.gov`

**Documentation:**
- API overview: https://www.weather.gov/documentation/services-web-api
- OpenAPI spec: https://api.weather.gov/openapi.json
- General FAQ: https://weather-gov.github.io/api/general-faqs

**Typical usage pattern:**
```
# Get all active alerts as GeoJSON
GET https://api.weather.gov/alerts/active?status=actual
Header: User-Agent: (globe-visualizer, your@email.com)

# Get tornado and hurricane warnings only
GET https://api.weather.gov/alerts/active?event=Tornado%20Warning,Hurricane%20Warning

# Get alerts for California
GET https://api.weather.gov/alerts/active?area=CA
```

**Integration pattern:** When the globe viewport is over the US and an EONET severe storm or flood event is visible, query NWS for active alerts in that bounding box. Render alert polygons as colored overlays on the globe surface: red for warnings, orange for watches, yellow for advisories. Only activate this layer when zoomed into the US — it has no data elsewhere.

**Polling cadence:** Every 2–5 minutes for active alerts.

---

### 5. NASA DONKI — Independent Layer (Space Weather)

**Role in app:** A separate toggleable layer providing space weather event data. This does not enrich any EONET category — it operates as an independent domain showing Sun-Earth interactions. This is the differentiator that elevates the app from a disaster tracker to a planetary awareness tool.

**What it provides:**
- Coronal Mass Ejections (CMEs): speed, direction, Earth-impact probability, predicted arrival time
- Solar Flares: class (B/C/M/X), peak time, source region on the Sun
- Geomagnetic Storms: Kp index (0–9 scale of magnetic field disturbance)
- Solar Energetic Particle events: proton flux data
- Interplanetary Shocks: arrival timestamps
- Radiation Belt Enhancements: electron flux data
- High Speed Streams: solar wind speed data
- Cause-effect linkages between events (e.g., a flare triggers a CME which causes a geomagnetic storm)

**Auth:** Free NASA API key from https://api.nasa.gov/. Use `DEMO_KEY` for testing (rate-limited).

**Key endpoints (all under `https://api.nasa.gov/DONKI/`):**
| Endpoint | Description |
|---|---|
| `GET /CME?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | Coronal mass ejections |
| `GET /FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | Solar flares |
| `GET /GST?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | Geomagnetic storms |
| `GET /SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | Solar energetic particles |
| `GET /IPS?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | Interplanetary shocks |
| `GET /RBE?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | Radiation belt enhancements |
| `GET /HSS?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | High speed streams |
| `GET /notifications?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}` | All notifications |

Default date range: last 30 days if no dates specified.

**Documentation:**
- DONKI system overview: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- DONKI web interface: https://kauai.ccmc.gsfc.nasa.gov/DONKI/
- NASA API portal (key signup + DONKI docs): https://api.nasa.gov/

**Typical usage pattern:**
```
# Get CMEs from the last 30 days
GET https://api.nasa.gov/DONKI/CME?api_key={KEY}

# Get solar flares from a specific month
GET https://api.nasa.gov/DONKI/FLR?startDate=2025-06-01&endDate=2025-06-30&api_key={KEY}

# Get geomagnetic storms from the last 30 days
GET https://api.nasa.gov/DONKI/GST?api_key={KEY}
```

**Integration pattern:** Poll DONKI every 15–30 minutes. When geomagnetic storms are active (Kp ≥ 5), render aurora-like visual effects at the globe's polar regions. When an Earth-directed CME is predicted, show a solar event indicator in the UI with estimated arrival time. Solar flare activity drives a persistent "solar activity" status badge. This layer is toggled independently of terrestrial events.

**Polling cadence:** Every 15–30 minutes.

---

### 6. NASA GIBS — Visual Layer (Globe Texture)

**Role in app:** The globe's surface imagery. Instead of a static Blue Marble texture, GIBS provides near-real-time satellite imagery tiles via standard WMTS protocol. EONET's Layers API maps each event category to relevant GIBS products, so imagery automatically contextualizes events (smoke plumes for fires, dust clouds for haze, etc.).

**What it provides:**
- Full-resolution global satellite imagery as WMTS tiles
- 900+ imagery products across dozens of instruments
- Key products: VIIRS true color (daily), MODIS true color (daily), aerosol optical depth, land surface temperature, sea surface temperature, snow cover, SO2 (volcanic), fire thermal anomalies
- Imagery typically available within 3–5 hours of satellite overpass
- Historical imagery archive extending back years for many products
- Standard WMTS, WMS, and tiled WMS protocols

**Auth:** None. Free, no API key.

**Base URLs:**
- WMTS: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/`
- WMS: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`
- Tiled WMS: `https://gibs.earthdata.nasa.gov/twms/epsg4326/best/twms.cgi`

**Documentation:**
- GIBS overview: https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api
- GIBS API docs: https://nasa-gibs.github.io/gibs-api-docs/
- Available imagery products: https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/
- NASA Worldview (reference implementation): https://worldview.earthdata.nasa.gov/

**Typical WMTS tile request:**
```
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{LayerName}/default/{Date}/{TileMatrixSet}/{ZoomLevel}/{Row}/{Col}.{Format}

# Example: VIIRS true color, April 1 2025, zoom 3
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2025-04-01/250m/3/2/4.jpg
```

**Integration pattern:** Use GIBS WMTS tiles as the globe's base texture layer, refreshed daily with the most recent true-color imagery. When a user drills into an EONET event, query the EONET Layers API (`/api/v3/layers/{categoryId}`) to get category-specific GIBS products (e.g., aerosol layers for dust events, SO2 for volcanoes) and overlay them in the event's region.

**Polling cadence:** Cache tiles, refresh daily. On-demand for event-specific imagery overlays.

---

## Layer Architecture Summary

| Layer | API | Toggle Behavior | Default State | Density |
|---|---|---|---|---|
| Globe surface | NASA GIBS | Always on | Active | N/A (tiles) |
| Core events | NASA EONET | Always on | Active | Low (20–80) |
| Fire density | NASA FIRMS | Per-category toggle or auto on drill-in | Off | Very high (30k–100k/day) |
| Seismic density | USGS Earthquakes | Per-category toggle or auto on drill-in | Off | High (hundreds/day) |
| Weather alerts | NOAA NWS | Auto-activates over US | Off | Medium |
| Space weather | NASA DONKI | Independent toggle | Off | Low (0–10/day) |

## Auth Requirements Summary

| API | Auth | How to Get |
|---|---|---|
| NASA EONET | None | — |
| NASA FIRMS | Free map key | https://firms.modaps.eosdis.nasa.gov/api/map_key/ |
| USGS Earthquakes | None | — |
| NOAA NWS Alerts | None (User-Agent header required) | — |
| NASA DONKI | Free NASA API key | https://api.nasa.gov/ |
| NASA GIBS | None | — |