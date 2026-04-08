# Terra UX Audit Infrastructure — Design Spec

An AI-driven playbook system for comprehensive UX testing, data source validation, and automated issue reporting. Claude Code executes the playbook using Playwright MCP tools, produces a structured report, and creates GitHub issues after user approval.

## Architecture

The system has four artifacts and no standalone test runner:

1. **Playbook** (`docs/playbooks/ux-audit.md`) — step-by-step protocol executed by Claude Code via Playwright MCP tools
2. **Store Bridge** (`packages/frontend/src/dev/store-bridge.ts`) — dev-only module exposing Zustand stores on `window.__TERRA__` for state verification
3. **Report Template** (`docs/playbooks/report-template.md`) — structured output format where each finding is shaped as a GitHub issue
4. **CLAUDE.md Trigger** — workflow section activating the audit on "run ux tests" or "run ux audit"

### Workflow

```
User says "run ux tests"
  → CLAUDE.md trigger activates
  → Claude loads playbook from docs/playbooks/ux-audit.md
  → Opens app at http://localhost:5173 via Playwright MCP
  → Executes 4 phases sequentially, capturing findings
  → Presents structured report in conversation
  → User reviews: approve / dismiss / edit / group findings
  → Claude creates GitHub issues for approved findings via gh CLI
```

### Execution Tools

All interaction happens through existing Playwright MCP tools:

- `browser_navigate` — load the app
- `browser_snapshot` — capture accessibility tree for DOM inspection
- `browser_click` — interact with UI elements by ref
- `browser_fill_form` — type in search fields
- `browser_press_key` — test ESC dismissal
- `browser_evaluate` — read store state via `window.__TERRA__`
- `browser_console_messages` — capture console errors/warnings
- `browser_network_requests` — capture failed HTTP requests
- `browser_take_screenshot` — visual evidence for findings
- `browser_wait_for` — wait for loading states to resolve
- `browser_hover` — test tooltip/hover interactions

No custom Playwright test runner, no `npx playwright test`, no framework overhead. Claude Code is the test engine; the playbook is the protocol.

## Store Bridge

A single function exposing all four Zustand stores on `window.__TERRA__` for read access during audits.

### Implementation

```typescript
// packages/frontend/src/dev/store-bridge.ts
import type { StoreApi } from "zustand";

interface TerraBridge {
  readonly events: StoreApi<EventState>;
  readonly globe: StoreApi<GlobeState>;
  readonly layers: StoreApi<LayerState>;
  readonly data: StoreApi<DataState>;
}

export function initStoreBridge(stores: TerraBridge): void {
  if (import.meta.env.DEV) {
    (window as Record<string, unknown>).__TERRA__ = stores;
  }
}
```

### Wiring

Called once in `data-provider.tsx` at the component body level (alongside the existing polling hook calls). Passes all four store references.

### Safety

- Gated behind `import.meta.env.DEV` — Vite tree-shakes the entire function body out of production builds
- Read-only access to store state via `.getState()`
- No mutations exposed — the bridge is for observation, not control

### What It Enables

During audit, Claude can run `browser_evaluate` with:

- `() => window.__TERRA__.events.getState().events.length` — event count
- `() => [...window.__TERRA__.layers.getState().activeLayers]` — active layer IDs
- `() => window.__TERRA__.globe.getState().isLoaded` — globe load state
- `() => window.__TERRA__.data.getState().spaceWeather` — space weather data
- `() => window.__TERRA__.events.getState().selectedEventId` — selected event

## Marker Data Attributes

The existing `createMarkerElement()` in `marker-manager.ts` creates `<div class="terra-marker">` elements with no identifying attributes. The Playwright snapshot can see them as generic divs but cannot distinguish which marker belongs to which event.

### Change

Add two data attributes to the marker container in `createMarkerElement()`:

```typescript
container.dataset.eventId = event.id;
container.dataset.category = event.category;
```

This enables:
- Clicking a specific event's marker by selector `[data-event-id="EONET_1234"]`
- Counting markers per category via `[data-category="wildfires"]`
- Verifying marker count matches store event count per category

Zero visual impact. The attributes exist only in the DOM, not rendered.

## Playbook Phases

### Phase 1: Pre-flight Checks

Purpose: verify the app is running and ready before testing. This phase gates all subsequent phases — if any check fails, the audit aborts with a clear pre-flight failure report.

| Check | Method | Pass Criteria | Timeout |
|-------|--------|---------------|---------|
| 1.1 Frontend loads | `browser_navigate` to `http://localhost:5173` | Page loads without error | 10s |
| 1.2 Backend health | `browser_evaluate` fetch to `/health` | Response `{ status: "ok" }` | 5s |
| 1.3 Loading screen clears | `browser_wait_for` text gone or `browser_evaluate` store | `globe-store.isLoaded === true` | 30s |
| 1.4 Events populated | `browser_evaluate` store | `event-store.events.length > 0` | 15s (waits for first EONET poll) |
| 1.5 Console capture started | `browser_console_messages` | Baseline captured, note any boot-time errors | immediate |

If 1.1 fails: report "Frontend is not running at localhost:5173. Start it with `npm run dev:frontend`."
If 1.2 fails: report "Backend is not running at localhost:3001. Start it with `npm run dev:backend`."
If 1.3 times out: report "Globe failed to load within 30s. Check texture loading and network connectivity."
If 1.4 times out: report "No events loaded after 15s. Check EONET API connectivity and /api/events endpoint."

### Phase 2: Data Source Validation

Purpose: verify each upstream data source is healthy, returning valid data in the expected shape. Findings from this phase do NOT block Phase 3 — broken data sources are recorded as findings, not gates.

#### 2.1 EONET Events (`/api/events`)

- Validate response matches `ApiResponse<NaturalEvent[]>` shape
- Check `status` field: "ok" or "error"
- If "ok": verify events array is non-empty, each event has valid `id`, `title`, `category` (one of 13 `EventCategoryId` values), `geometries` with coordinates in valid ranges (lat: -90 to 90, lng: -180 to 180), `status` is "open" or "closed"
- Check freshness: at least some events have geometries with timestamps within the last 30 days
- Validate `sourceUrl` fields are well-formed URLs
- If "error": record error code (`UPSTREAM_UNAVAILABLE`, `RATE_LIMITED`, `PARSE_FAILED`, `TIMEOUT`), source, and message

#### 2.2 FIRMS Fires (`/api/fires?bbox=world`)

- Validate response matches `ApiResponse<FireHotspot[]>` shape
- If "ok": verify each hotspot has `lat` (-90 to 90), `lng` (-180 to 180), valid `confidence` value, `frp` >= 0, `acquisitionTime` parseable as date
- Check freshness: acquisition times within last 48 hours
- If "error": record — FIRMS rate limiting (429) is a known issue

#### 2.3 USGS Earthquakes (`/api/earthquakes`)

- Validate response matches `ApiResponse<Earthquake[]>` shape
- If "ok": verify each quake has `magnitude` in range 0-10, `depth` >= 0, valid coordinates (not 0,0), `time` parseable and within last 7 days
- Validate `alert` field is null or one of "green", "yellow", "orange", "red"

#### 2.4 NWS Alerts (`/api/alerts`)

- Validate response matches `ApiResponse<NwsAlert[]>` shape
- If "ok": verify each alert has valid `severity` ("Extreme", "Severe", "Moderate", "Minor", "Unknown"), `geometry` with valid polygon coordinates, `onset`/`expiration` parseable as dates
- Check: not all alerts expired (at least some with `expiration` in the future)
- Empty array is valid — there may be no active US weather alerts

#### 2.5 Space Weather (`/api/space-weather`)

- Validate response matches `ApiResponse<SpaceWeatherSummary>` shape
- If "ok": verify structure has `solarFlares`, `coronalMassEjections`, `geomagneticStorms` arrays
- Solar flare `classType` should match pattern (X/M/C/B followed by number)
- Timestamps should parse correctly
- Empty arrays are valid — there may be no active space weather events

#### 2.6 Error Response Audit

- For any endpoint returning `status: "error"`: record a finding with:
  - The error code and message
  - Whether cached fallback data was served (check `cached: true` in response)
  - The upstream source that failed
- Severity mapping: UPSTREAM_UNAVAILABLE → high, RATE_LIMITED → medium, PARSE_FAILED → high, TIMEOUT → medium

### Phase 3: UI Interaction Testing

Purpose: exercise all interactive UI components and verify behavior matches expected state.

#### 3.1 Layer Panel

- Open the layer panel (click expand button)
- Read all layer switches via `browser_snapshot`
- Toggle at least 5 representative layers across groups:
  - 2 event categories with known events (check store first)
  - 1 event category with 0 events (verify no false finding)
  - 1 enhancement layer (fireDensity or seismicDensity)
  - 1 space weather layer
- After each toggle: verify `layer-store.activeLayers` matches switch states via store bridge
- Verify event count badges update when layers toggle
- Close the panel

#### 3.2 Event Feed

- Open the event feed panel
- Verify events are listed (DOM contains event items)
- Verify sort order: newest events appear first (check timestamps via store)
- Click the first event in the feed
- Verify via store: `selectedEventId` is now set
- Verify via store: `flyToTarget` was set (fly-to triggered)
- Verify popup appears in DOM

#### 3.3 Search

- Click search input in top bar
- Type a query that matches a known event title (read from store first)
- Verify event feed filters: visible events should contain the search term
- Clear the search input
- Verify feed resets to full list
- Select a region from the dropdown
- Verify `flyToTarget` was set in globe-store

#### 3.4 Event Popup

- With an event selected (from 3.2), verify popup contains:
  - Event title text
  - Category badge with correct label
  - Status badge ("Open" or "Closed")
  - Coordinates display
  - Source link (href present and well-formed)
  - Close button
- Click close button → verify `selectedEventId` is null
- Select another event → press ESC → verify `selectedEventId` is null
- Select another event → click empty canvas area → verify popup closes

#### 3.5 Space Weather Card

- Ensure space weather layer is active (toggle on if needed)
- Verify space weather card appears in DOM
- Verify card content matches `data-store.spaceWeather`:
  - Solar activity level/class displayed
  - If flares exist: flare class shown
  - If CMEs exist: CME status shown
- Toggle space weather layer off → verify card disappears

#### 3.6 Bottom Bar

- Verify active layer pills are visible for each active layer
- Click a pill's close button → verify that layer is removed from `activeLayers`
- Verify coordinate display exists (may show "—" if cursor not on globe)

#### 3.7 Globe State

- Verify globe canvas element exists in DOM
- Verify `globe-store.isLoaded === true`
- Toggle performance mode via settings → verify `globe-store.isPerformanceMode` flips
- Count `.terra-marker` elements in DOM → compare against events in store for active categories
- For each active event category: count markers with `[data-category="X"]` vs events in store with that category

#### 3.8 Top Bar

- Verify event count badge is visible and shows a number
- Verify solar activity indicator is present
- Click settings button → verify performance mode toggle appears

#### 3.9 Loading Screen

- This is implicitly tested in Phase 1 (we wait for it to clear)
- If it doesn't clear within 30s, that's a Phase 1 pre-flight failure

### Phase 4: Cross-cutting Checks

Purpose: sweep for errors and state inconsistencies accumulated during the entire audit session.

#### 4.1 Console Error Audit

- Call `browser_console_messages` with level "error" and `all: true`
- Categorize each error:
  - **React errors**: component stack traces, hook violations, key warnings
  - **Three.js errors**: WebGL context lost, shader compilation, geometry errors
  - **Network errors**: fetch failures, CORS, timeouts
  - **App-level errors**: uncaught exceptions, store errors, type errors
- Severity: uncaught exceptions → critical, React errors → high, Three.js warnings → medium, deprecation notices → low
- Also check warnings (`level: "warning"`) for non-blocking issues

#### 4.2 Network Failure Audit

- Call `browser_network_requests` with filter `/api/`
- Flag any request with:
  - Status 4xx or 5xx
  - Status 0 (network error / CORS)
  - No response (timeout)
- Cross-reference with Phase 2 findings to avoid duplicates
- Note: texture loading failures (GIBS tiles) should be checked separately with a broader filter

#### 4.3 State Integrity

- Read all store states via store bridge
- Verify: for each active event category, `document.querySelectorAll('[data-category="X"]').length` approximately matches event count for that category in the store (some may be clustered or behind the globe, so allow tolerance)
- Verify: if `selectedEventId` is set, popup element exists in DOM; if null, no popup
- Verify: `activeLayers` set matches toggle switch states in layer panel
- Check for orphaned state: no `selectedEventId` pointing to an event not in the events array

## Report Format

Each audit produces a report presented in conversation (not written to a file). The report follows this structure:

```markdown
# Terra UX Audit Report
Date: YYYY-MM-DD | Duration: ~Xm | Status: Complete

## Summary
Found N critical, N high, N medium, N low findings
Data sources: X/6 healthy, Y degraded
Console errors: N unique errors captured

## Findings

### [CRITICAL-1] Title describing the issue
Category: bug | data-source | ui-friction | performance | stale-data
Affected: component-name.tsx or /api/endpoint
Description: What is wrong
Evidence: API response, console log, store state snapshot, or screenshot reference
Impact: What the user experiences
Reproduction: Steps to reproduce (where applicable)

### [HIGH-1] ...
(continues ordered by severity)

## Data Source Health
| Source | Status | Details |
|--------|--------|---------|
| EONET | ok | 45 events, newest: 2h ago |
| FIRMS | error | 429 Rate Limited |
| ... | ... | ... |

## Console Summary
| Level | Count | Sources |
|-------|-------|---------|
| error | 2 | Three.js (1), fetch (1) |
| warning | 5 | React (3), deprecation (2) |
```

### Finding Categories

- **bug** — broken functionality: clicks don't work, data doesn't display, wrong values shown
- **data-source** — upstream API issues: errors, rate limits, stale/corrupt data
- **ui-friction** — UX problems: confusing state, elements hidden/overlapping, unclear feedback
- **performance** — slow load times, janky animations, excessive re-renders
- **stale-data** — data that's valid in shape but old beyond expected freshness thresholds

### Severity Levels

- **critical** — feature completely broken, data corruption, uncaught exceptions
- **high** — significant functionality impaired, broken API, major UX blocker
- **medium** — noticeable issue but workaround exists, minor data staleness
- **low** — cosmetic issue, deprecation warning, edge case UX friction

## Incident Protocol

After the report is presented:

1. **User reviews** — approve all, dismiss specific findings, edit severities, group related findings
2. **Duplicate check** — before creating issues, run `gh issue list --state open` and check for title similarity against existing issues; flag potential duplicates for user decision
3. **Issue creation** — for each approved finding, create a GitHub issue using the `github-issues` skill with:
   - Title: finding title (e.g., "FIRMS API rate limited — fire hotspots unavailable")
   - Labels: category label + severity label (e.g., `bug`, `critical`)
   - Body: summary, evidence, expected behavior, suggested fix direction
4. **Fix cycle** — user implements fixes (or asks Claude to), then re-runs "run ux tests" to verify

## CLAUDE.md Integration

Add to the project CLAUDE.md under a new `## UX Audit Workflow` section:

```markdown
## UX Audit Workflow

When the user says "run ux tests", "run ux audit", or "audit the app":

1. Read the playbook at `docs/playbooks/ux-audit.md`
2. Open the app at `http://localhost:5173` using Playwright MCP tools
3. Execute all 4 phases sequentially, capturing findings
4. Present the structured report in conversation for user approval
5. After approval, create GitHub issues for approved findings

Prerequisites: frontend (`npm run dev:frontend`) and backend (`npm run dev:backend`) must be running locally.
```

## Acceptance Criteria

### AC-1: Store Bridge

- `window.__TERRA__` exists in dev mode with keys: `events`, `globe`, `layers`, `data`
- Each key exposes `.getState()` returning current store state
- Does NOT exist in production builds (`npm run build` then serve)
- `npm run lint -w packages/frontend` passes

### AC-2: Marker Data Attributes

- Every `.terra-marker` div has `data-event-id` matching `event.id`
- Every `.terra-marker` div has `data-category` matching `event.category`
- Clicking a marker by `[data-event-id="X"]` triggers the same selection behavior
- Existing tests pass unchanged

### AC-3: Playbook — Phase 1 (Pre-flight)

- Checks backend `/health` endpoint and aborts with clear message if unreachable
- Navigates to `localhost:5173` and waits for loading screen to clear (max 30s)
- Confirms `globe-store.isLoaded === true` via store bridge
- Confirms `event-store.events.length > 0` (data has loaded)
- Begins console error capture from this point forward
- If any check fails: reports pre-flight failure, does NOT continue to Phase 2

### AC-4: Playbook — Phase 2 (Data Sources)

- Hits all 5 data API endpoints via `browser_evaluate` fetch calls (`/health` is covered in Phase 1)
- For each: validates response matches `ApiResponse` shape (status field present)
- For "ok" responses: validates data arrays are non-empty (where expected), field types match shared types
- Checks freshness: event timestamps within expected ranges
- For "error" responses: records error code, source, message as findings
- Distinguishes "no data available" (valid empty array) from "data source broken" (error response)
- Does NOT block Phase 3

### AC-5: Playbook — Phase 3 (UI Interaction)

- Opens and closes layer panel, toggles at least 5 representative layers
- Cross-checks `layer-store.activeLayers` against visible switch states
- Opens event feed, clicks an event, verifies: `selectedEventId` set, popup appears
- Types a search query, verifies feed filters, clears and verifies reset
- Verifies event popup shows: title, category badge, coordinates, close button works
- Tests ESC key dismisses popup (`selectedEventId` → null)
- Toggles space weather layer, verifies card appears/disappears
- Checks bottom bar shows active layer pills
- For layers with 0 events: confirms "no markers" is expected via store check, not flagged as bug

### AC-6: Playbook — Phase 4 (Cross-cutting)

- Collects all console errors/warnings via `browser_console_messages` with `all: true`
- Collects all failed network requests via `browser_network_requests`
- Checks store state integrity: event count vs DOM marker count, selected event vs popup presence
- Categorizes each console error by source (React, Three.js, network, app-level)
- Each issue found becomes a finding with evidence

### AC-7: Report Output

- Report has summary header with finding counts by severity
- Each finding has: severity tag, category, affected component, description, evidence
- Findings ordered: critical → high → medium → low
- If 0 findings: reports clean bill of health
- Report is presented in conversation, not auto-written to a file

### AC-8: Issue Creation Gate

- Issues are NEVER created without explicit user approval
- User can dismiss, edit severity, or group findings before creation
- Before creating: checks existing open issues for duplicates via `gh issue list`
- Issues follow existing repo patterns (github-issues skill)
- Each issue has: title, labels (category + severity), body with summary/evidence/expected/suggested fix

### AC-9: CLAUDE.md Trigger

- "run ux tests" / "run ux audit" activates the workflow
- Playbook is loaded from `docs/playbooks/ux-audit.md` and followed step-by-step
- If app is not running: detects in Phase 1, reports clearly, does not crash
- Full audit completes within a single conversation session

## File Inventory

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `docs/playbooks/ux-audit.md` | Full playbook protocol with all 4 phases |
| CREATE | `docs/playbooks/report-template.md` | Report format reference |
| CREATE | `packages/frontend/src/dev/store-bridge.ts` | Dev-only store exposure on window.__TERRA__ |
| EDIT | `packages/frontend/src/components/data-provider.tsx` | Wire up initStoreBridge() call |
| EDIT | `packages/frontend/src/globe/marker-manager.ts` | Add data-event-id and data-category attributes |
| EDIT | `CLAUDE.md` | Add UX Audit Workflow section |

3 new files, 3 edits. No new dependencies. No test infrastructure to maintain.
