# UX Audit Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a playbook-driven UX audit system that Claude Code executes via Playwright MCP tools to test the Terra app, validate data sources, capture errors, and produce structured findings that map to GitHub issues.

**Architecture:** Four artifacts — a store bridge (code), marker data attributes (code), a playbook document, and a CLAUDE.md trigger. No test framework, no dependencies. Claude Code is the test engine; the playbook is the protocol.

**Tech Stack:** TypeScript, Zustand, Playwright MCP, Markdown

**Spec:** `docs/superpowers/specs/2026-04-07-ux-audit-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| CREATE | `packages/frontend/src/dev/store-bridge.ts` | Expose Zustand stores on `window.__TERRA__` in dev mode |
| EDIT | `packages/frontend/src/components/data-provider.tsx` | Call `initStoreBridge()` at mount |
| EDIT | `packages/frontend/src/globe/marker-manager.ts` | Add `data-event-id` and `data-category` to marker elements |
| CREATE | `docs/playbooks/ux-audit.md` | Full playbook protocol for all 4 audit phases |
| CREATE | `docs/playbooks/report-template.md` | Report format reference |
| EDIT | `CLAUDE.md` | Add UX Audit Workflow section |

---

### Task 1: Store Bridge

**Files:**
- Create: `packages/frontend/src/dev/store-bridge.ts`
- Modify: `packages/frontend/src/components/data-provider.tsx`

- [ ] **Step 1: Create the store bridge module**

Create `packages/frontend/src/dev/store-bridge.ts`:

```typescript
import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { useDataStore } from "../stores/data-store.js";

export function initStoreBridge(): void {
  if (import.meta.env.DEV) {
    (window as Record<string, unknown>).__TERRA__ = {
      events: useEventStore,
      globe: useGlobeStore,
      layers: useLayerStore,
      data: useDataStore,
    };
  }
}
```

Note: Zustand's `create()` returns a hook that also has `.getState()`, `.setState()`, and `.subscribe()` — it is both a React hook and a vanilla store API. Attaching the hook directly to window gives full read access via `.getState()`.

- [ ] **Step 2: Wire the bridge into DataProvider**

Modify `packages/frontend/src/components/data-provider.tsx`. Add the import and call at the top of the component body, before the polling hooks:

```typescript
import type { ReactNode } from "react";
import { useEonetPolling } from "../hooks/use-eonet-polling.js";
import { useUsgsPolling } from "../hooks/use-usgs-polling.js";
import { useFirmsPolling } from "../hooks/use-firms-polling.js";
import { useNwsPolling } from "../hooks/use-nws-polling.js";
import { useDonkiPolling } from "../hooks/use-donki-polling.js";
import { initStoreBridge } from "../dev/store-bridge.js";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps): React.ReactElement {
  initStoreBridge();
  useEonetPolling();
  useDonkiPolling();
  useUsgsPolling();
  useFirmsPolling();
  useNwsPolling();
  return <>{children}</>;
}
```

`initStoreBridge()` is safe to call on every render — the `import.meta.env.DEV` guard makes it a no-op in production, and in dev it simply reassigns the same store references to `window.__TERRA__`.

- [ ] **Step 3: Type check**

Run: `npm run lint -w packages/frontend`
Expected: passes with no errors

- [ ] **Step 4: Run existing tests**

Run: `npm run test -w packages/frontend`
Expected: all existing tests pass unchanged

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/dev/store-bridge.ts packages/frontend/src/components/data-provider.tsx
git commit -m "feat: add dev-only store bridge exposing zustand stores on window.__TERRA__"
```

---

### Task 2: Marker Data Attributes

**Files:**
- Modify: `packages/frontend/src/globe/marker-manager.ts:193-200`

- [ ] **Step 1: Add data attributes to createMarkerElement**

In `packages/frontend/src/globe/marker-manager.ts`, inside the `createMarkerElement` function, add two lines after the container is created (after line 194 `container.className = "terra-marker";`):

```typescript
function createMarkerElement(event: NaturalEvent): HTMLDivElement {
  injectMarkerStyles();

  const meta = CATEGORY_META[event.category];
  const color = meta?.color ?? "#ffffff";
  const iconName = meta?.icon ?? "activity";

  const container = document.createElement("div");
  container.className = "terra-marker";
  container.dataset.eventId = event.id;
  container.dataset.category = event.category;
  container.style.cssText = `
    pointer-events: auto;
    cursor: pointer;
    width: ${MARKER_SIZE}px;
    height: ${MARKER_SIZE}px;
    position: relative;
  `;
```

Only two lines added: `container.dataset.eventId = event.id;` and `container.dataset.category = event.category;`. These produce `data-event-id="..."` and `data-category="..."` HTML attributes on every marker div.

- [ ] **Step 2: Type check**

Run: `npm run lint -w packages/frontend`
Expected: passes with no errors

- [ ] **Step 3: Run existing tests**

Run: `npm run test -w packages/frontend`
Expected: all existing tests pass unchanged (clustering tests don't touch marker DOM)

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/globe/marker-manager.ts
git commit -m "feat: add data-event-id and data-category attributes to marker elements"
```

---

### Task 3: Playbook Document

**Files:**
- Create: `docs/playbooks/ux-audit.md`

- [ ] **Step 1: Create playbooks directory and write the playbook**

Create `docs/playbooks/ux-audit.md`:

```markdown
# Terra UX Audit Playbook

A step-by-step protocol for Claude Code to execute via Playwright MCP tools. This playbook tests the full Terra application — UI interactions, data source health, console errors, and state integrity.

**Prerequisites:** Frontend (`npm run dev:frontend`) and backend (`npm run dev:backend`) must be running locally.

**App URL:** http://localhost:5173

---

## Phase 1: Pre-flight Checks

This phase gates all subsequent phases. If any check fails, abort and report the failure.

### 1.1 Navigate to the app

Use `browser_navigate` to open `http://localhost:5173`.

If the page fails to load or returns an error, report:
> "Frontend is not running at localhost:5173. Start it with `npm run dev:frontend`."

### 1.2 Check backend health

Use `browser_evaluate` to run:
```javascript
() => fetch('/health').then(r => r.json())
```

Expected: `{ status: "ok" }`. If fetch fails or returns unexpected response, report:
> "Backend is not running at localhost:3001. Start it with `npm run dev:backend`."

### 1.3 Wait for globe to load

Use `browser_evaluate` to poll (or `browser_wait_for`):
```javascript
() => window.__TERRA__?.globe.getState().isLoaded
```

Wait up to 30 seconds. The loading screen shows a progress percentage — it fades out when `isLoaded` becomes true.

If timeout: report "Globe failed to load within 30s. Check texture loading and network connectivity."

### 1.4 Wait for events to populate

Use `browser_evaluate`:
```javascript
() => window.__TERRA__?.events.getState().events.length
```

Wait up to 15 seconds for this to be > 0. The first EONET poll fires on mount.

If timeout: report "No events loaded after 15s. Check EONET API connectivity and /api/events endpoint."

### 1.5 Capture console baseline

Use `browser_console_messages` with `level: "error"` to capture any boot-time errors.
Record these as findings if present — they indicate problems during initialization.

---

## Phase 2: Data Source Validation

Hit each API endpoint and validate responses. Broken data sources are findings, NOT gates — proceed to Phase 3 regardless.

### 2.1 EONET Events

Use `browser_evaluate`:
```javascript
() => fetch('/api/events').then(r => r.json())
```

**Validate if status "ok":**
- `data` is a non-empty array
- Each event has: `id` (string), `title` (string), `category` (one of: drought, dustHaze, earthquakes, floods, landslides, manmade, seaLakeIce, severeStorms, snow, tempExtremes, volcanoes, waterColor, wildfires), `status` ("open" or "closed")
- Each event has `geometries` array with at least one entry containing `coordinates: [lng, lat]` where lat is -90 to 90 and lng is -180 to 180
- At least some events have geometry timestamps within the last 30 days
- `sourceUrl` fields are well-formed URLs (start with http:// or https://)

**If status "error":** Record finding with error `code`, `source`, and `message`.

### 2.2 FIRMS Fires

Use `browser_evaluate`:
```javascript
() => fetch('/api/fires?bbox=world').then(r => r.json())
```

**Validate if status "ok":**
- Each hotspot has `lat` (-90 to 90), `lng` (-180 to 180), `confidence` (valid value), `frp` >= 0
- `acquisitionTime` is parseable as a date and within last 48 hours

**If status "error":** Record finding. FIRMS 429 (rate limited) is a known issue — flag as severity "medium" with note.

### 2.3 USGS Earthquakes

Use `browser_evaluate`:
```javascript
() => fetch('/api/earthquakes').then(r => r.json())
```

**Validate if status "ok":**
- Each quake has `magnitude` (0-10), `depth` >= 0, valid coordinates (not exactly 0,0)
- `time` is parseable and within last 7 days
- `alert` is null or one of "green", "yellow", "orange", "red"

**If status "error":** Record finding.

### 2.4 NWS Alerts

Use `browser_evaluate`:
```javascript
() => fetch('/api/alerts').then(r => r.json())
```

**Validate if status "ok":**
- Empty array is valid (no active US weather alerts)
- If non-empty: each alert has valid `severity` ("Extreme", "Severe", "Moderate", "Minor", "Unknown")
- `geometry` has valid polygon coordinates
- Not all alerts expired (at least some with `expiration` in the future)

**If status "error":** Record finding.

### 2.5 Space Weather

Use `browser_evaluate`:
```javascript
() => fetch('/api/space-weather').then(r => r.json())
```

**Validate if status "ok":**
- Structure has `solarFlares`, `coronalMassEjections`, `geomagneticStorms` arrays
- Empty arrays are valid (no active space weather)
- Solar flare `classType` matches pattern: letter (X/M/C/B) followed by number
- Timestamps parse correctly

**If status "error":** Record finding.

### 2.6 Error Severity Mapping

For any endpoint returning `status: "error"`:
- `UPSTREAM_UNAVAILABLE` → severity: high
- `RATE_LIMITED` → severity: medium
- `PARSE_FAILED` → severity: high
- `TIMEOUT` → severity: medium

Note whether cached fallback data was used (check `cached: true` in other responses from same source).

---

## Phase 3: UI Interaction Testing

Exercise all interactive components and verify behavior via DOM + store state.

### 3.1 Layer Panel

1. Take a `browser_snapshot` to find the layer panel expand/collapse button
2. Click to open the panel
3. Read all layer switches via snapshot
4. Use `browser_evaluate` to read which categories have events:
   ```javascript
   () => {
     const events = window.__TERRA__.events.getState().events;
     const counts = {};
     for (const e of events) {
       counts[e.category] = (counts[e.category] || 0) + 1;
     }
     return counts;
   }
   ```
5. Toggle 5 layers:
   - 2 event categories that have events (from the counts above)
   - 1 event category with 0 events
   - 1 enhancement layer (fireDensity or seismicDensity)
   - 1 space weather layer
6. After each toggle, verify store matches:
   ```javascript
   () => [...window.__TERRA__.layers.getState().activeLayers]
   ```
7. For categories with 0 events: toggling off/on and seeing no markers is expected, NOT a finding
8. Close the panel

### 3.2 Event Feed

1. Take snapshot to find the event feed panel
2. Click to open it (if collapsed)
3. Verify events are listed in the DOM
4. Read the first event's ID from the store:
   ```javascript
   () => window.__TERRA__.events.getState().events[0]?.id
   ```
5. Click the first event in the feed
6. Verify selection:
   ```javascript
   () => window.__TERRA__.events.getState().selectedEventId
   ```
   Should match the event ID from step 4
7. Verify fly-to was triggered:
   ```javascript
   () => window.__TERRA__.globe.getState().flyToTarget
   ```
   Should be non-null (briefly — it gets cleared after animation)
8. Verify popup appeared via `browser_snapshot` — look for popup elements in the DOM

### 3.3 Search

1. Take snapshot to find the search input in the top bar
2. Read a known event title from the store:
   ```javascript
   () => window.__TERRA__.events.getState().events[0]?.title
   ```
3. Use `browser_fill_form` or `browser_click` + `browser_type` to type a portion of that title into the search input
4. Verify the store updated:
   ```javascript
   () => window.__TERRA__.events.getState().searchQuery
   ```
5. Take snapshot — verify the event feed shows fewer items (filtered)
6. Clear the search input (select all + delete)
7. Verify feed resets: take snapshot to confirm full event list is back
8. If search dropdown shows regions: click a region, verify `flyToTarget` was set:
   ```javascript
   () => window.__TERRA__.globe.getState().flyToTarget
   ```

### 3.4 Event Popup

1. With an event selected (from 3.2), take a snapshot
2. Verify popup contains:
   - Event title text
   - Category badge (text matching one of the 13 category labels)
   - Status text ("Open" or "Closed")
   - Coordinates display
   - A link element (source URL)
   - Close button (X)
3. Click the close button
4. Verify selection cleared:
   ```javascript
   () => window.__TERRA__.events.getState().selectedEventId
   ```
   Should be null
5. Select another event from the feed (click it)
6. Use `browser_press_key` to press Escape
7. Verify `selectedEventId` is null again
8. Select another event, then click on the globe canvas (empty area)
9. Verify popup dismissed (selectedEventId null)

### 3.5 Space Weather Card

1. Check if space weather layer is active:
   ```javascript
   () => window.__TERRA__.layers.getState().activeLayers.has('spaceWeather')
   ```
2. If not active, find the space weather toggle in the layer panel and click it
3. Take snapshot — verify the space weather card element is present in the DOM
4. Read space weather data:
   ```javascript
   () => window.__TERRA__.data.getState().spaceWeather
   ```
5. Verify card content matches the store data (solar flare class, CME status if available)
6. Toggle space weather layer OFF
7. Take snapshot — verify the card is gone from the DOM

### 3.6 Bottom Bar

1. Take snapshot — find the bottom bar
2. Verify active layer pills are present
3. Click one pill's close button (the X on a layer pill)
4. Verify that layer was removed:
   ```javascript
   () => [...window.__TERRA__.layers.getState().activeLayers]
   ```
5. Verify coordinate display element exists (may show "—" if cursor not on globe)

### 3.7 Globe State

1. Verify canvas element exists via snapshot (look for `<canvas>`)
2. Verify globe loaded:
   ```javascript
   () => window.__TERRA__.globe.getState().isLoaded
   ```
3. Find the settings/performance mode toggle, click it
4. Verify:
   ```javascript
   () => window.__TERRA__.globe.getState().isPerformanceMode
   ```
   Should have flipped from its previous value
5. Count markers vs store:
   ```javascript
   () => {
     const events = window.__TERRA__.events.getState().events;
     const activeLayers = window.__TERRA__.layers.getState().activeLayers;
     const activeEvents = events.filter(e => activeLayers.has(e.category));
     const markerCount = document.querySelectorAll('.terra-marker').length;
     return { storeCount: activeEvents.length, domCount: markerCount };
   }
   ```
   Counts should approximately match (some markers may be clustered, so allow tolerance — flag if DOM count is 0 but store count > 0, or if ratio is far off)

### 3.8 Top Bar

1. Take snapshot of the top bar area
2. Verify event count badge is visible and shows a number
3. Verify solar activity indicator element is present
4. Find and click settings button
5. Verify performance mode toggle is accessible

### 3.9 Loading Screen

Implicitly covered by Phase 1 step 1.3. If the loading screen didn't clear, Phase 1 would have aborted.

---

## Phase 4: Cross-cutting Checks

Sweep for accumulated errors and state inconsistencies.

### 4.1 Console Error Audit

Use `browser_console_messages` with `level: "error"` and `all: true`.

Categorize each error:
- **React**: component stack traces, hook violations, key warnings → severity: high
- **Three.js**: WebGL context issues, shader errors, geometry problems → severity: medium
- **Network**: fetch failures, CORS, timeout errors → severity: high
- **App-level**: uncaught exceptions, type errors → severity: critical
- **Deprecation**: deprecation notices → severity: low

Also check with `level: "warning"` for non-blocking issues.

Each unique error becomes a finding.

### 4.2 Network Failure Audit

Use `browser_network_requests` with `filter: "/api/"` and `static: false`.

Flag any request with:
- Status 4xx or 5xx
- Status 0 (network error / CORS failure)
- No response (timeout)

Cross-reference with Phase 2 findings — if the same endpoint was already recorded as a data source finding, don't duplicate. Only add new network failures not already captured.

Also check for texture/asset failures with a broader filter if any Three.js errors were found in 4.1.

### 4.3 State Integrity

Read all stores via `browser_evaluate`:
```javascript
() => {
  const events = window.__TERRA__.events.getState();
  const layers = window.__TERRA__.layers.getState();
  const globe = window.__TERRA__.globe.getState();
  const activeLayers = [...layers.activeLayers];

  const markersByCategory = {};
  for (const cat of activeLayers) {
    markersByCategory[cat] = document.querySelectorAll(`[data-category="${cat}"]`).length;
  }

  const eventsByCategory = {};
  for (const e of events.events) {
    if (activeLayers.includes(e.category)) {
      eventsByCategory[e.category] = (eventsByCategory[e.category] || 0) + 1;
    }
  }

  return {
    selectedEventId: events.selectedEventId,
    hasPopup: !!document.querySelector('[class*="popup"]'),
    isLoaded: globe.isLoaded,
    activeLayers,
    markersByCategory,
    eventsByCategory,
  };
}
```

**Check:**
- If `selectedEventId` is set, popup must exist in DOM; if null, no popup should be present
- For each active category: DOM marker count should approximately match store event count (allow tolerance for clustering/back-face culling, but flag if store has events and DOM has 0 markers)
- No `selectedEventId` pointing to an event not in the events array (orphaned selection)

---

## Compiling the Report

After all 4 phases complete, compile findings into the report format:

1. Count findings by severity (critical, high, medium, low)
2. Order findings: critical first, then high, medium, low
3. Build the data source health table (5 sources × status + details)
4. Build the console summary table (error/warning counts by source)
5. Present the full report in conversation

If 0 findings across all phases: report a clean bill of health with "All checks passed" and the data source health table.

---

## After the Report

1. Wait for user to review
2. User may: approve all, dismiss specific findings, edit severities, group findings
3. Before creating issues: run `gh issue list --state open` and check for title matches
4. Flag potential duplicates for user decision
5. Create GitHub issues for approved findings using the github-issues skill
```

- [ ] **Step 2: Verify the playbook is complete**

Read through the playbook and verify:
- All 4 phases are documented with specific MCP tool calls and JavaScript snippets
- Phase 1 has clear abort conditions
- Phase 2 covers all 5 data endpoints
- Phase 3 covers all 9 UI areas
- Phase 4 covers console, network, and state integrity
- Report compilation instructions are clear

- [ ] **Step 3: Commit**

```bash
git add docs/playbooks/ux-audit.md
git commit -m "add: ux audit playbook with all 4 testing phases"
```

---

### Task 4: Report Template

**Files:**
- Create: `docs/playbooks/report-template.md`

- [ ] **Step 1: Create the report template**

Create `docs/playbooks/report-template.md`:

```markdown
# Terra UX Audit Report Template

Reference format for audit findings. Each audit report follows this structure.

---

## Header

```
# Terra UX Audit Report
Date: YYYY-MM-DD | Duration: ~Xm | Status: Complete
```

## Summary Block

```
## Summary
Found N critical, N high, N medium, N low findings
Data sources: X/5 healthy, Y degraded
Console errors: N unique errors captured
```

## Finding Format

Each finding uses this structure:

```
### [SEVERITY-N] Title describing the issue
Category: bug | data-source | ui-friction | performance | stale-data
Affected: component-name.tsx or /api/endpoint
Description: What is wrong
Evidence: API response, console log, store state snapshot
Impact: What the user experiences
Reproduction: Steps to reproduce (where applicable)
```

### Severity Levels

- **CRITICAL** — feature completely broken, data corruption, uncaught exceptions
- **HIGH** — significant functionality impaired, broken API, major UX blocker
- **MEDIUM** — noticeable issue but workaround exists, minor data staleness
- **LOW** — cosmetic issue, deprecation warning, edge case friction

### Finding Categories

- **bug** — broken functionality: clicks don't work, data doesn't display, wrong values
- **data-source** — upstream API issues: errors, rate limits, stale/corrupt data
- **ui-friction** — UX problems: confusing state, overlapping elements, unclear feedback
- **performance** — slow load, janky animations, excessive re-renders
- **stale-data** — valid shape but old beyond expected freshness thresholds

### Ordering

Findings are ordered by severity: all CRITICAL first, then HIGH, MEDIUM, LOW.
Within a severity level, order by category: bug > data-source > performance > ui-friction > stale-data.

## Data Source Health Table

```
## Data Source Health
| Source | Endpoint | Status | Details |
|--------|----------|--------|---------|
| EONET | /api/events | ok | 45 events, newest: 2h ago |
| FIRMS | /api/fires | error | 429 Rate Limited, using cached fallback |
| USGS | /api/earthquakes | ok | 12 quakes, M4.5+, last 24h |
| NWS | /api/alerts | ok | 8 active alerts |
| DONKI | /api/space-weather | ok | 2 flares, no CMEs |
```

## Console Summary Table

```
## Console Summary
| Level | Count | Sources |
|-------|-------|---------|
| error | 2 | Three.js (1), fetch (1) |
| warning | 5 | React (3), deprecation (2) |
```

## Clean Report

If no findings:

```
# Terra UX Audit Report
Date: YYYY-MM-DD | Duration: ~Xm | Status: Complete

## Summary
All checks passed. No findings.
Data sources: 5/5 healthy
Console errors: 0

## Data Source Health
(table as above, all ok)
```

## Issue Mapping

When creating GitHub issues from findings:

| Report Field | GitHub Issue Field |
|-------------|-------------------|
| `[SEVERITY-N] Title` | Issue title (without severity prefix) |
| Category | Label: `bug`, `data-source`, `ui-friction`, `performance`, `stale-data` |
| Severity | Label: `critical`, `high`, `medium`, `low` |
| Description + Evidence | Issue body |
| Reproduction | Steps to reproduce section in body |
```

- [ ] **Step 2: Commit**

```bash
git add docs/playbooks/report-template.md
git commit -m "add: ux audit report template with finding format and severity levels"
```

---

### Task 5: CLAUDE.md Trigger

**Files:**
- Modify: `CLAUDE.md` (append new section)

- [ ] **Step 1: Add the UX Audit Workflow section**

Append to the end of `CLAUDE.md`:

```markdown

## UX Audit Workflow

When the user says "run ux tests", "run ux audit", or "audit the app":

1. Read the playbook at `docs/playbooks/ux-audit.md`
2. Open the app at `http://localhost:5173` using Playwright MCP tools
3. Execute all 4 phases sequentially, capturing findings along the way
4. Present the structured report in conversation for user approval (format: `docs/playbooks/report-template.md`)
5. After approval, check for duplicate issues via `gh issue list --state open`, then create GitHub issues for approved findings

Prerequisites: frontend (`npm run dev:frontend`) and backend (`npm run dev:backend`) must be running locally. If the app is not running, Phase 1 will detect this and report clearly.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "update: add ux audit workflow trigger to claude.md"
```

---

### Task 6: Verification

- [ ] **Step 1: Run full type check**

Run: `npm run lint -w packages/frontend`
Expected: passes with no errors

- [ ] **Step 2: Run full test suite**

Run: `npm run test -w packages/frontend && npm run test -w packages/backend`
Expected: all tests pass

- [ ] **Step 3: Verify file inventory**

Check all files were created/modified:

```bash
ls docs/playbooks/ux-audit.md
ls docs/playbooks/report-template.md
ls packages/frontend/src/dev/store-bridge.ts
```

All three should exist.

Verify edits were made:

```bash
grep "initStoreBridge" packages/frontend/src/components/data-provider.tsx
grep "dataset.eventId" packages/frontend/src/globe/marker-manager.ts
grep "UX Audit Workflow" CLAUDE.md
```

All three greps should return matches.

- [ ] **Step 4: Verify store bridge works (manual spot check)**

If the dev server is running, open http://localhost:5173 in a browser, open DevTools console, and type:

```javascript
window.__TERRA__.events.getState().events.length
```

Should return a number > 0.

```javascript
window.__TERRA__.globe.getState().isLoaded
```

Should return `true`.

```javascript
[...window.__TERRA__.layers.getState().activeLayers]
```

Should return an array of 13 category IDs.
