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
