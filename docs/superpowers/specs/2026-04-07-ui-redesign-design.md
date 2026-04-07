# TERRA UI Redesign — Design Spec

Reference: Web3/sci-fi dark UI landing page (ARC). Porting design language (not layout) to TERRA's globe app overlay panels.

## Approach

Theme-first cascade: design tokens → base shadcn components → composite components → animations. Changes at the token level cascade automatically; composite components only need fine-tuning for layout, accent lines, and animations.

---

## 1. Color Palette

| Token | Current | New | Notes |
|-------|---------|-----|-------|
| Background | `#040a16` (navy) | `#06060f` (purple-black) | Deeper, cooler |
| Surface | `#0a1628` (blue) | `#0a0a1a` (near-black) | Less blue saturation |
| Border | `#1a2a44` | `#1a2a44` | Kept as-is |
| Primary accent | `#4ecdc4` (cyan) | `#3d7ab8` (deep azure) | Same hue family as border, lighter |
| Secondary accent | `#ffcb6b` (amber) | `#c44b2f` (deep magma) | Volcanic/lava tone |
| Hover glow | `white/5` | `rgba(61,122,184,0.15)` | Azure-tinted |
| Hover surface | `white/5` | `rgba(255,255,255,0.04)` | Slightly reduced |

### Text Opacity Tiers

Replace `terra-text` and `terra-text-muted` with a single white base at varying opacity:

| Tier | Opacity | Usage |
|------|---------|-------|
| Primary | 95% `rgba(225,232,240,0.95)` | Panel headers, titles, active values |
| Secondary | 70% `rgba(225,232,240,0.7)` | Body content, data values |
| Muted | 40% `rgba(225,232,240,0.4)` | Timestamps, labels, sources |
| Faint | 20% `rgba(225,232,240,0.2)` | Watermarks, disabled text |

---

## 2. Typography

### Font

**Space Grotesk** (variable, Google Fonts). Geometric sans-serif with clean, slightly futuristic letterforms.

Import via `@fontsource-variable/space-grotesk` (self-hosted, no external CDN dependency). Apply as the primary font family across the entire app by importing in `index.css`.

### Scale

| Level | Size | Weight | Tracking | Transform | Usage |
|-------|------|--------|----------|-----------|-------|
| Micro label | 10px | 600 | 3px | uppercase | Section headers ("EVENT CATEGORIES") |
| Caption | 11px | 400 | normal | none | Coordinates, timestamps, counts |
| Body | 13px | 400 | normal | none | Default UI text, descriptions |
| Panel title | 14px | 500 | 0.5px | none | Panel headers ("Events", "Layers") |

---

## 3. Surface Treatment

### Glass Effect

- `backdrop-filter: blur(28px)` (up from 12px)
- Surface opacity: 88% `rgba(10,10,26,0.88)` — text stays crisp, blur still visible behind panels
- No dot grid texture (removed — too noisy at any opacity)

### Accent Line

Top-left gradient fade on panels and cards:
- Width: 140px
- Gradient: `linear-gradient(90deg, #3d7ab8 0%, rgba(61,122,184,0.3) 50%, transparent 100%)`
- Applied via `::before` pseudo-element, positioned `top:0; left:0`
- Event popup accent lines use category color (e.g., magma for earthquakes, azure for storms)

### Edge Shimmer Animation

A glow traces along the panel border (top edge → right edge). CSS-only, applied to sidebars and the space weather card.

```css
@keyframes edgeglow {
  0% { left: -20%; top: -1px; width: 20%; height: 2px; }
  40% { left: 100%; top: -1px; width: 20%; height: 2px; }
  41% { left: calc(100% - 1px); top: -20%; width: 2px; height: 20%; }
  80% { left: calc(100% - 1px); top: 100%; width: 2px; height: 20%; }
  81%, 100% { left: -20%; top: -1px; width: 20%; height: 2px; opacity: 0; }
}
```

Applied via `::after` pseudo-element. 8-second cycle, `ease-in-out`. Panels that use it: EventFeed, LayerPanel, SpaceWeatherCard.

---

## 4. Base Components

All shadcn/ui components restyled. Changes apply globally through variant definitions.

### Button

| Variant | Border | Background | Text | Glow |
|---------|--------|------------|------|------|
| Primary | `#3d7ab8` | `rgba(61,122,184,0.15)` | `#3d7ab8` | `0 0 12px rgba(61,122,184,0.15)` |
| Primary hover | `#3d7ab8` | `rgba(61,122,184,0.25)` | `#3d7ab8` | `0 0 24px rgba(61,122,184,0.3)` |
| Ghost | transparent | transparent | 70% opacity | none |
| Ghost hover | transparent | `rgba(255,255,255,0.06)` | 95% opacity | none |
| Outline | `#1a2a44` | transparent | 70% opacity | none |
| Outline hover | `rgba(61,122,184,0.5)` | transparent | 95% opacity | none |
| Destructive | `#c44b2f` | `rgba(196,75,47,0.1)` | `#c44b2f` | `0 0 12px rgba(196,75,47,0.1)` |
| Link | none | none | `#3d7ab8` | underline on hover |

All buttons are pill-shaped (`border-radius: 999px`). Icon buttons: 28px × 28px.

### Input

- Border: `#1a2a44`, background: `rgba(255,255,255,0.03)`
- Focus: border shifts to `#3d7ab8`, box-shadow `0 0 12px rgba(61,122,184,0.15)`
- Search variant: pill-shaped with search icon, used in top bar
- Standard variant: 6px border-radius

### Badge

| Variant | Style |
|---------|-------|
| Outline | 1px border in accent color, text in accent color, pill-shaped |
| Filled | `rgba(accent,0.12)` background, text in accent color |
| Muted | `#1a2a44` border, 70% opacity text |

### Switch

- On: `#3d7ab8` track, white thumb, `0 0 10px rgba(61,122,184,0.25)` glow
- Off: `rgba(255,255,255,0.1)` track with `#1a2a44` border, 35% opacity thumb
- Scaled to 75% in layer panel context

### Dropdown Menu

- Surface: `rgba(10,10,26,0.95)` with `blur(28px)`
- Border: `#1a2a44`
- Item hover: `rgba(255,255,255,0.06)` background, text brightens to 95%
- Dividers: `#1a2a44`
- Shadow: `0 8px 32px rgba(0,0,0,0.5)`

### ScrollArea

- Thumb: 4px wide, `rgba(61,122,184,0.3)`, hover to `rgba(61,122,184,0.5)`
- Track: transparent
- Azure-tinted to match the accent color

### Card

- Base panel styles (88% opacity surface, 28px blur, `#1a2a44` border)
- Top-left accent line (gradient fade, 140px)
- Edge shimmer on cards that represent persistent panels

---

## 5. Composite Components

### TopBar

- Position: fixed top-center, pill-shaped (`border-radius: 999px`)
- Content: search input → divider → event count (azure dot + number) → divider → solar status (colored dot + label) → divider → settings (28px ghost icon button)
- Entrance animation: slides down, 400ms ease-out, delay 0ms

### EventFeed (Left Sidebar)

- Position: fixed left, 280px expanded / 40px collapsed
- Header: panel title + "X active" count + collapse button
- List items: 13px title, 11px category (colored) + timestamp
- Selection: subtle `rgba(255,255,255,0.04)` background + bottom gradient underline (`#3d7ab8` fading to transparent)
- Collapsed state: hamburger icon + vertical "EVENTS" text (10px, 2px letter-spacing)
- Edge shimmer: yes
- Accent line: yes (top-left)
- Entrance animation: slides from left, 400ms ease-out, delay 100ms

### LayerPanel (Right Sidebar)

- Position: fixed right, 240px expanded / 40px collapsed
- Section headers: micro label style (10px, 600 weight, 3px tracking, uppercase)
- Layer items: category dot (filled when on, outlined when off) + label + count + switch (75% scale)
- Edge shimmer: yes
- Accent line: yes (top-left)
- Entrance animation: slides from right, 400ms ease-out, delay 200ms

### BottomBar

- Position: fixed bottom-center, pill-shaped
- Content: layer chips (filled badges with X to remove) → divider → coordinates (tabular-nums, muted)
- Entrance animation: slides up, 400ms ease-out, delay 300ms

### SpaceWeatherCard

- Position: fixed bottom-right, 260px width
- Header: sun icon + "Space Weather" title, border-bottom divider
- Content: key-value rows (muted label left, value right)
- Flare class in muted outline badge
- Edge shimmer: yes
- Accent line: yes (top-left)
- Entrance animation: slides from right, 400ms ease-out, delay 400ms

### EventPopup

- Position: calculated from screen coordinates, 280px width
- Accent line color matches event category (magma for earthquakes, azure for storms, etc.)
- Header: title + close button (28px ghost)
- Badges: category (outline, category color) + status (outline, azure)
- Info: coordinates, depth/magnitude, date + source
- Action links: "View source →", "Satellite imagery →" in azure
- Connector line: SVG, category color at 40% opacity
- Entrance animation: `scale(0.95) → scale(1)` + fade, 200ms ease-out

### LoadingScreen

- Full viewport overlay, z-index 10
- "TERRA" text: 11px, 600 weight, 4px tracking, uppercase, pulsing opacity (0.3 → 0.7, 2s cycle)
- Progress bar: 200px × 2px, azure fill at 60% opacity on `rgba(61,122,184,0.15)` track
- Percentage: 10px, 20% opacity, 1px tracking
- Exit: 800ms opacity fade-out

---

## 6. Animations

### Entrance (app load)

Staggered panel reveal after loading screen fades:

| Panel | Direction | Duration | Easing | Delay |
|-------|-----------|----------|--------|-------|
| TopBar | slide down | 400ms | ease-out | 0ms |
| EventFeed | slide from left | 400ms | ease-out | 100ms |
| LayerPanel | slide from right | 400ms | ease-out | 200ms |
| BottomBar | slide up | 400ms | ease-out | 300ms |
| SpaceWeatherCard | slide from right | 400ms | ease-out | 400ms |

Each animation is `opacity: 0 → 1` combined with a 12-16px translate from the panel's edge.

### Hover Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Buttons | background, box-shadow | 350ms | ease |
| List items | background | 250ms | ease |
| Inputs | border-color, box-shadow | 300ms | ease |
| Links | text-decoration | instant | — |
| Badge chips | background | 250ms | ease |

### Sidebar Collapse/Expand

- Content fades out: 200ms opacity transition
- Width collapses: 300ms width transition (starts 150ms after content fade begins)
- Expand reverses: width first (300ms), content fades in after 200ms delay

### Popup

- Enter: `scale(0.95) → scale(1)` + `opacity: 0 → 1`, 200ms ease-out
- Exit: `opacity: 1 → 0`, 150ms ease-in

### Continuous

- Edge shimmer: 8s cycle on sidebars and space weather card
- Loading pulse: 2s cycle on "TERRA" text during load

---

## 7. CSS Variable Mapping

Updated `index.css` theme variables:

```
--color-terra-bg: #06060f
--color-terra-surface: #0a0a1a
--color-terra-border: #1a2a44
--color-terra-text: rgba(225,232,240,0.95)
--color-terra-text-secondary: rgba(225,232,240,0.7)
--color-terra-text-muted: rgba(225,232,240,0.4)
--color-terra-text-faint: rgba(225,232,240,0.2)
--color-terra-azure: #3d7ab8
--color-terra-magma: #c44b2f
```

Font family: `'Space Grotesk Variable', 'Space Grotesk', sans-serif`

HSL tokens for shadcn compatibility:
- Primary: `213 50% 48%` (#3d7ab8)
- Destructive: `10 62% 48%` (#c44b2f)
- Background: `240 43% 3%` (#06060f)
- Card/Popover: `240 33% 5%` (#0a0a1a)
- Border/Input: `215 44% 18%` (#1a2a44)
- Foreground: `213 33% 91%` (rgba(225,232,240,0.95))
- Muted-foreground: `213 33% 91% / 0.4`

---

## 8. Files Affected

### Token Layer
- `packages/frontend/src/index.css` — color variables, font import, new utility classes for accent lines and edge shimmer

### Base Components
- `packages/frontend/src/components/ui/button.tsx` — pill shape, glow variants
- `packages/frontend/src/components/ui/badge.tsx` — outline/filled variants with accent colors
- `packages/frontend/src/components/ui/input.tsx` — focus glow
- `packages/frontend/src/components/ui/switch.tsx` — azure on-state with glow
- `packages/frontend/src/components/ui/card.tsx` — accent line, surface treatment
- `packages/frontend/src/components/ui/popover.tsx` — updated surface/shadow
- `packages/frontend/src/components/ui/tooltip.tsx` — updated colors
- `packages/frontend/src/components/ui/scroll-area.tsx` — azure-tinted thumb
- `packages/frontend/src/components/ui/progress.tsx` — azure fill

### Composite Components
- `packages/frontend/src/components/top-bar.tsx`
- `packages/frontend/src/components/event-feed.tsx`
- `packages/frontend/src/components/layer-panel.tsx`
- `packages/frontend/src/components/bottom-bar.tsx`
- `packages/frontend/src/components/space-weather-card.tsx`
- `packages/frontend/src/components/event-popup.tsx`
- `packages/frontend/src/components/loading-screen.tsx`

### Dependencies
- `@fontsource-variable/space-grotesk` — npm package for self-hosted font

---

## 9. What Does NOT Change

- Component logic, props, store connections, hooks — only styling
- Three.js globe code — untouched
- Backend — untouched
- Shared package types/constants — untouched
- File structure — no new files except possible CSS utility additions to index.css
- Vignette component — kept as-is (radial gradient overlay)
