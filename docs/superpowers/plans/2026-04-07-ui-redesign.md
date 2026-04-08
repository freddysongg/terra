# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all TERRA frontend UI components to match a sci-fi/dark design language with Space Grotesk font, deep azure/magma accent colors, enhanced glass effects, accent lines, edge shimmer animations, and entrance transitions.

**Architecture:** Theme-first cascade — update CSS tokens and base shadcn components first so changes propagate automatically, then fine-tune composite components for layout-specific adjustments and animations. Styling-only changes; no component logic, store, or hook modifications.

**Tech Stack:** Tailwind CSS v4, CSS custom properties, Space Grotesk (via @fontsource-variable), class-variance-authority, Radix UI primitives

**Spec:** `docs/superpowers/specs/2026-04-07-ui-redesign-design.md`

---

### Task 1: Install Space Grotesk Font

**Files:**
- Modify: `packages/frontend/package.json`
- Modify: `packages/frontend/src/index.css`
- Modify: `packages/frontend/src/main.tsx` (or wherever CSS is imported — check if font import goes in CSS or JS entry)

- [ ] **Step 1: Install the font package**

```bash
npm install @fontsource-variable/space-grotesk -w packages/frontend
```

- [ ] **Step 2: Import the font in the CSS entry**

Add to the top of `packages/frontend/src/index.css`, before the `@import "tailwindcss"` line:

```css
@import "@fontsource-variable/space-grotesk";
```

- [ ] **Step 3: Verify the font loads**

```bash
npm run lint -w packages/frontend
```

Expected: no type errors. The font CSS is now available globally.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/package.json packages/frontend/src/index.css package-lock.json
git commit -m "add: space grotesk font via fontsource"
```

---

### Task 2: Update Design Tokens in index.css

**Files:**
- Modify: `packages/frontend/src/index.css`

This is the highest-leverage change — updating CSS variables here cascades to every component.

- [ ] **Step 1: Replace the @theme block**

Replace the entire `@theme { ... }` block in `packages/frontend/src/index.css` with:

```css
@theme {
  --font-sans: 'Space Grotesk Variable', 'Space Grotesk', sans-serif;

  --color-terra-bg: #06060f;
  --color-terra-surface: #0a0a1a;
  --color-terra-border: #1a2a44;
  --color-terra-text: rgba(225, 232, 240, 0.95);
  --color-terra-text-secondary: rgba(225, 232, 240, 0.7);
  --color-terra-text-muted: rgba(225, 232, 240, 0.4);
  --color-terra-text-faint: rgba(225, 232, 240, 0.2);
  --color-terra-azure: #3d7ab8;
  --color-terra-magma: #c44b2f;

  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}
```

- [ ] **Step 2: Update the HSL variables in the @layer base block**

Replace the `:root` CSS variables inside the first `@layer base` block:

```css
@layer base {
  :root {
    --background: 240 43% 3%;
    --foreground: 213 33% 91%;
    --card: 240 33% 5%;
    --card-foreground: 213 33% 91%;
    --popover: 240 33% 5%;
    --popover-foreground: 213 33% 91%;
    --primary: 213 50% 48%;
    --primary-foreground: 240 43% 3%;
    --secondary: 215 44% 18%;
    --secondary-foreground: 213 33% 91%;
    --muted: 215 44% 18%;
    --muted-foreground: 213 33% 51%;
    --accent: 215 44% 18%;
    --accent-foreground: 213 33% 91%;
    --destructive: 10 62% 48%;
    --destructive-foreground: 213 33% 91%;
    --border: 215 44% 18%;
    --input: 215 44% 18%;
    --ring: 213 50% 48%;
  }
}
```

- [ ] **Step 3: Add animation keyframes and utility classes**

Add the following after the existing `@layer base` blocks at the end of `index.css`:

```css
@layer base {
  body {
    font-family: 'Space Grotesk Variable', 'Space Grotesk', sans-serif;
  }
}

@layer utilities {
  @keyframes edge-glow {
    0% { left: -20%; top: -1px; width: 20%; height: 2px; }
    40% { left: 100%; top: -1px; width: 20%; height: 2px; }
    41% { left: calc(100% - 1px); top: -20%; width: 2px; height: 20%; }
    80% { left: calc(100% - 1px); top: 100%; width: 2px; height: 20%; }
    81%, 100% { left: -20%; top: -1px; width: 20%; height: 2px; opacity: 0; }
  }

  @keyframes fade-slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-slide-down {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-slide-left {
    from { opacity: 0; transform: translateX(16px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes fade-slide-right {
    from { opacity: 0; transform: translateX(-16px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes popup-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes load-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  .panel-surface {
    background: rgba(10, 10, 26, 0.88);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid #1a2a44;
  }

  .accent-line::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 140px;
    height: 1px;
    background: linear-gradient(90deg, #3d7ab8 0%, rgba(61, 122, 184, 0.3) 50%, transparent 100%);
    z-index: 1;
  }

  .accent-line-magma::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 140px;
    height: 1px;
    background: linear-gradient(90deg, #c44b2f 0%, rgba(196, 75, 47, 0.3) 50%, transparent 100%);
    z-index: 1;
  }

  .edge-shimmer::after {
    content: '';
    position: absolute;
    background: linear-gradient(90deg, transparent, rgba(61, 122, 184, 0.5), transparent);
    animation: edge-glow 8s ease-in-out infinite;
    pointer-events: none;
    z-index: 2;
  }
}
```

- [ ] **Step 4: Update references to removed tokens**

The old tokens `terra-cyan` and `terra-amber` no longer exist. The new tokens are `terra-azure` and `terra-magma`. Also `terra-text` changed from a hex to an rgba value, and `terra-text-secondary` and `terra-text-faint` are new.

Search for usages that need updating in later tasks:
```bash
cd packages/frontend && grep -rn "terra-cyan\|terra-amber" src/ --include="*.tsx" --include="*.ts"
```

Note the files — they'll be updated in Tasks 5-11.

- [ ] **Step 5: Run lint to verify token changes**

```bash
npm run lint -w packages/frontend
```

Expected: may show errors for `terra-cyan` / `terra-amber` references in component files — those will be fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/index.css
git commit -m "update: design tokens with new color palette, space grotesk font, animation keyframes, panel utilities"
```

---

### Task 3: Restyle Button Component

**Files:**
- Modify: `packages/frontend/src/components/ui/button.tsx`

- [ ] **Step 1: Replace buttonVariants**

Replace the entire `buttonVariants` definition (lines 6-35) in `button.tsx`:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-medium transition-all duration-350 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-terra-azure bg-terra-azure/15 text-terra-azure shadow-[0_0_12px_rgba(61,122,184,0.15)] hover:bg-terra-azure/25 hover:shadow-[0_0_24px_rgba(61,122,184,0.3)]",
        destructive:
          "border border-terra-magma bg-terra-magma/10 text-terra-magma shadow-[0_0_12px_rgba(196,75,47,0.1)] hover:bg-terra-magma/20 hover:shadow-[0_0_24px_rgba(196,75,47,0.2)]",
        outline:
          "border border-terra-border bg-transparent text-terra-text-secondary hover:border-terra-azure/50 hover:text-terra-text",
        secondary:
          "border border-terra-border bg-transparent text-terra-text-secondary hover:bg-white/6 hover:text-terra-text",
        ghost:
          "text-terra-text-secondary hover:bg-white/6 hover:text-terra-text",
        link: "text-terra-azure underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 px-3.5 text-[11px]",
        lg: "h-10 px-8",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

Key changes: `rounded-md` → `rounded-full` (pill shape), `transition-colors` → `transition-all duration-350`, icon size 28px (`h-7 w-7`), all colors use new terra tokens.

- [ ] **Step 2: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/components/ui/button.tsx
git commit -m "update: button component with pill shape, azure glow, new variants"
```

---

### Task 4: Restyle Badge, Input, Switch, Card, Tooltip, Popover, ScrollArea, Progress

**Files:**
- Modify: `packages/frontend/src/components/ui/badge.tsx`
- Modify: `packages/frontend/src/components/ui/input.tsx`
- Modify: `packages/frontend/src/components/ui/switch.tsx`
- Modify: `packages/frontend/src/components/ui/card.tsx`
- Modify: `packages/frontend/src/components/ui/tooltip.tsx`
- Modify: `packages/frontend/src/components/ui/popover.tsx`
- Modify: `packages/frontend/src/components/ui/scroll-area.tsx`
- Modify: `packages/frontend/src/components/ui/progress.tsx`

- [ ] **Step 1: Update badge.tsx**

Replace the `badgeVariants` definition (lines 5-23):

```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-terra-azure bg-terra-azure/12 text-terra-azure",
        secondary:
          "border-terra-border bg-white/6 text-terra-text-secondary",
        destructive:
          "border-terra-magma bg-terra-magma/12 text-terra-magma",
        outline: "border-terra-border text-terra-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
```

Key changes: `rounded-md` → `rounded-full` (pill), `text-xs font-semibold` → `text-[10px] font-medium`, all colors updated.

- [ ] **Step 2: Update input.tsx**

Replace the className string in the `<input>` element (line 12):

```typescript
"flex h-9 w-full rounded-md border border-terra-border bg-white/3 px-3 py-1 text-[13px] shadow-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-terra-text placeholder:text-terra-text-muted focus-visible:outline-none focus-visible:border-terra-azure focus-visible:shadow-[0_0_12px_rgba(61,122,184,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
```

Key changes: `bg-transparent` → `bg-white/3`, added focus glow with `shadow-[0_0_12px...]`, `transition-colors` → `transition-all duration-300`.

- [ ] **Step 3: Update switch.tsx**

Replace the Root className (line 11):

```typescript
"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-terra-azure data-[state=checked]:shadow-[0_0_10px_rgba(61,122,184,0.25)] data-[state=unchecked]:bg-white/10 data-[state=unchecked]:border-terra-border",
```

Replace the Thumb className (line 19):

```typescript
"pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-white data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-white/35",
```

Key changes: checked state uses `terra-azure` with glow, unchecked uses `white/10` with border, thumb changes opacity based on state.

- [ ] **Step 4: Update card.tsx**

Replace the Card className (line 11):

```typescript
"rounded-lg border border-terra-border panel-surface text-terra-text shadow relative overflow-hidden",
```

This uses the `panel-surface` utility class defined in Task 2 which provides the 88% opacity background and 28px blur.

- [ ] **Step 5: Update tooltip.tsx**

Replace the TooltipContent className (line 20):

```typescript
"z-50 overflow-hidden rounded-md bg-terra-surface border border-terra-border px-3 py-1.5 text-xs text-terra-text animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
```

Key change: tooltip now uses `bg-terra-surface` with border instead of primary color background (less visually aggressive).

- [ ] **Step 6: Update popover.tsx**

Replace the PopoverContent className (line 21):

```typescript
"z-50 w-72 rounded-lg border border-terra-border panel-surface p-4 text-terra-text shadow-[0_8px_32px_rgba(0,0,0,0.5)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
```

Key changes: uses `panel-surface` for glass effect, deeper shadow `0_8px_32px`.

- [ ] **Step 7: Update scroll-area.tsx**

Replace the ScrollAreaThumb className (line 40):

```typescript
"relative flex-1 rounded-full bg-terra-azure/30 hover:bg-terra-azure/50 transition-colors"
```

Also update the scrollbar width — replace `w-2.5` with `w-1` in the vertical orientation class (line 33):

```typescript
"h-full w-1 border-l border-l-transparent p-[1px]",
```

Key changes: azure-tinted thumb (30% opacity, 50% on hover), narrower 4px scrollbar.

- [ ] **Step 8: Update progress.tsx**

Replace the container className (line 22):

```typescript
"relative h-0.5 w-full overflow-hidden rounded-full bg-terra-azure/15",
```

Replace the bar className (line 27):

```typescript
"h-full w-full flex-1 bg-terra-azure/60 transition-all"
```

Key changes: thinner bar (2px via `h-0.5`), azure fill at 60% opacity on 15% opacity track.

- [ ] **Step 9: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add packages/frontend/src/components/ui/
git commit -m "update: badge, input, switch, card, tooltip, popover, scroll-area, progress with new design tokens"
```

---

### Task 5: Restyle LoadingScreen

**Files:**
- Modify: `packages/frontend/src/components/loading-screen.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire content of `loading-screen.tsx`:

```tsx
import { useGlobeStore } from "../stores/globe-store.js";

export function LoadingScreen(): React.ReactElement {
  const isLoaded = useGlobeStore((s) => s.isLoaded);
  const loadProgress = useGlobeStore((s) => s.loadProgress);

  return (
    <div
      className={`fixed inset-0 z-10 flex flex-col items-center justify-center bg-terra-bg transition-opacity duration-800 ${
        isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        className="mb-4 text-[11px] font-semibold tracking-[4px] uppercase text-terra-text-faint"
        style={{ animation: "load-pulse 2s ease-in-out infinite" }}
      >
        TERRA
      </div>
      <div className="w-[200px] h-0.5 bg-terra-azure/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-terra-azure/60 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${loadProgress}%` }}
        />
      </div>
      <div className="mt-2.5 text-[10px] text-terra-text-faint tracking-[1px] tabular-nums">
        {Math.round(loadProgress)}%
      </div>
    </div>
  );
}
```

Key changes: "Loading" → "TERRA" with pulsing animation, `terra-cyan` → `terra-azure`, added percentage display, thinner progress bar, `text-terra-text-faint` for very subtle text.

- [ ] **Step 2: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/components/loading-screen.tsx
git commit -m "update: loading screen with terra branding, pulsing text, azure progress bar"
```

---

### Task 6: Add Entrance Animations to App.tsx

**Files:**
- Modify: `packages/frontend/src/App.tsx`

- [ ] **Step 1: Add entrance animation wrapper**

The panels need staggered entrance animations when `isLoaded` becomes true. Replace the panel rendering block in `App.tsx` (lines 41-49):

```tsx
{isLoaded && (
  <>
    <div style={{ animation: "fade-slide-down 0.4s ease-out both" }}>
      <TopBar />
    </div>
    <div style={{ animation: "fade-slide-right 0.4s ease-out 0.1s both" }}>
      <EventFeed />
    </div>
    <div style={{ animation: "fade-slide-left 0.4s ease-out 0.2s both" }}>
      <LayerPanel />
    </div>
    <div style={{ animation: "fade-slide-left 0.4s ease-out 0.4s both" }}>
      <SpaceWeatherCard />
    </div>
    <EventPopup />
    <div style={{ animation: "fade-slide-up 0.4s ease-out 0.3s both" }}>
      <BottomBar />
    </div>
  </>
)}
```

The `both` fill mode keeps the element at `opacity: 1` after animation completes. The `delay` values create the staggered reveal. EventPopup has no entrance animation since it appears on user interaction.

- [ ] **Step 2: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/App.tsx
git commit -m "add: staggered entrance animations for ui panels on app load"
```

---

### Task 7: Restyle TopBar

**Files:**
- Modify: `packages/frontend/src/components/top-bar.tsx`

- [ ] **Step 1: Update all color references**

Apply the following find-and-replace operations across the entire file:

| Find | Replace |
|------|---------|
| `terra-cyan` | `terra-azure` |
| `backdrop-blur-md` | `backdrop-blur-xl` |
| `bg-terra-surface/90` | `panel-surface` |
| `bg-white/5` | `bg-white/4` |
| `bg-white/10` | `bg-white/6` |
| `text-terra-text-muted` | `text-terra-text-muted` (keep — token still exists but changed value) |
| `border-white/5` | `border-terra-border` |

- [ ] **Step 2: Update the settings icon button size**

Find the settings button (should have `h-7 w-7` or similar icon size class) and ensure it uses:

```
h-7 w-7 rounded-full
```

- [ ] **Step 3: Update the search dropdown surface**

Find the search results dropdown container and update its background classes to use `panel-surface` and `shadow-[0_8px_32px_rgba(0,0,0,0.5)]`.

- [ ] **Step 4: Update solar activity indicator colors**

The solar activity dot uses `bg-red-500`, `bg-yellow-500`, `bg-green-500`, `bg-gray-500`. Keep these as-is — they are semantic status colors that should remain distinct from the theme accents.

- [ ] **Step 5: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/components/top-bar.tsx
git commit -m "update: top bar with azure accent, enhanced blur, panel surface treatment"
```

---

### Task 8: Restyle EventFeed

**Files:**
- Modify: `packages/frontend/src/components/event-feed.tsx`

- [ ] **Step 1: Update the container panel**

Find the main container div and update its classes:
- Replace `bg-terra-surface` with `panel-surface`
- Replace `backdrop-blur-md` with nothing (panel-surface handles blur)
- Add `accent-line edge-shimmer` to the className
- Keep `rounded-lg border-terra-border`

- [ ] **Step 2: Update the header**

Update the header section:
- Title: add `tracking-[0.5px]` for subtle letter spacing
- "X active" count: use `text-terra-text-muted` and `tabular-nums`

- [ ] **Step 3: Replace selected item styling**

Find the selected item conditional classes. Replace the left border indicator:

Remove: `border-l-2 border-l-terra-cyan` (or similar left border pattern)

Replace with:
```
bg-white/4 relative
```

And add a bottom underline element inside the selected item JSX:
```tsx
{isSelected && (
  <div className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-terra-azure via-terra-azure/15 to-transparent" />
)}
```

- [ ] **Step 4: Update all color references**

| Find | Replace |
|------|---------|
| `terra-cyan` | `terra-azure` |
| `bg-white/5` | `bg-white/4` |
| `bg-white/[0.06]` | `bg-white/4` |

- [ ] **Step 5: Update the collapsed state**

For the collapsed sidebar, ensure it shows a hamburger-style icon and vertical "EVENTS" text:
```tsx
<span className="text-[10px] text-terra-text-faint tracking-[2px]" style={{ writingMode: "vertical-rl" }}>
  EVENTS
</span>
```

- [ ] **Step 6: Enhance collapse/expand animation**

The sidebar already has `transition-[width] duration-300`. Add a content opacity transition so content fades out before the width collapses:

On the content wrapper inside the panel (the div that holds header + list):
```
transition-opacity duration-200
```

When collapsed, the content should have `opacity-0`. When expanded, `opacity-100`. The width transition (`duration-300`) is longer than the opacity transition (`duration-200`), so the content fades first, then the panel shrinks — matching the spec's staggered behavior.

- [ ] **Step 7: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/frontend/src/components/event-feed.tsx
git commit -m "update: event feed with panel surface, accent line, edge shimmer, bottom underline selection"
```

---

### Task 9: Restyle LayerPanel

**Files:**
- Modify: `packages/frontend/src/components/layer-panel.tsx`

- [ ] **Step 1: Update the container panel**

Same as EventFeed — update the main container:
- Replace surface/blur classes with `panel-surface`
- Add `accent-line edge-shimmer`

- [ ] **Step 2: Update section headers**

Find the section header elements (like "EVENT CATEGORIES", "ENHANCEMENTS"). Update their classes:

```
text-[10px] font-semibold text-terra-text-faint tracking-[3px] uppercase
```

- [ ] **Step 3: Update layer toggle items**

For active items:
- Category dot: filled with category color (keep existing logic)
- Label: `text-terra-text` (95% opacity)
- Count: `text-terra-text-faint tabular-nums text-[10px]`

For inactive items:
- Category dot: `border border-terra-text-faint` (outlined, not filled)
- Label: `text-terra-text-muted` (40% opacity)
- Count: `text-terra-text-faint`

- [ ] **Step 4: Update all color references**

| Find | Replace |
|------|---------|
| `terra-cyan` | `terra-azure` |
| `bg-white/5` | `bg-white/4` |
| `border-white/5` | `border-terra-border` |

- [ ] **Step 5: Enhance collapse/expand animation**

Same as EventFeed (Task 8, Step 6): add `transition-opacity duration-200` to the content wrapper. When collapsed: `opacity-0`. When expanded: `opacity-100`. Content fades before width collapses.

- [ ] **Step 6: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/components/layer-panel.tsx
git commit -m "update: layer panel with panel surface, accent line, edge shimmer, micro-label headers"
```

---

### Task 10: Restyle BottomBar

**Files:**
- Modify: `packages/frontend/src/components/bottom-bar.tsx`

- [ ] **Step 1: Update the container**

Update the main container classes:
- Replace `bg-terra-surface/90 backdrop-blur-md` with `panel-surface`
- Keep `rounded-full`

- [ ] **Step 2: Update layer chips**

Update the chip styling:
- Background: `bg-white/6`
- Text: `text-terra-text-secondary text-[11px]`
- Remove button: `text-terra-text-faint text-[10px]`
- Hover: `hover:bg-white/10`

- [ ] **Step 3: Update coordinates display**

```
text-[11px] text-terra-text-muted tabular-nums
```

- [ ] **Step 4: Update all remaining color references**

| Find | Replace |
|------|---------|
| `terra-cyan` | `terra-azure` |
| `bg-white/5` | `bg-white/6` |
| `bg-white/10` | `bg-white/10` (keep) |

- [ ] **Step 5: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/components/bottom-bar.tsx
git commit -m "update: bottom bar with panel surface, refined chip styling"
```

---

### Task 11: Restyle SpaceWeatherCard

**Files:**
- Modify: `packages/frontend/src/components/space-weather-card.tsx`

- [ ] **Step 1: Update the container**

Update the Card/container to use the new surface treatment:
- Replace `bg-terra-surface border-terra-border` with `panel-surface`
- Add `accent-line edge-shimmer` classes
- Add `relative overflow-hidden` for the pseudo-elements

- [ ] **Step 2: Update header**

- Title: `text-sm font-medium text-terra-text tracking-[0.5px]`
- Sun icon: `text-terra-text-muted`
- Divider: `border-terra-border/50`

- [ ] **Step 3: Update content rows**

For each key-value row:
- Label (left): `text-terra-text-muted text-[13px]`
- Value (right): `text-terra-text text-[13px]`
- Azure-colored values (like "None detected"): `text-terra-azure`

- [ ] **Step 4: Update flare badges**

Replace any `border-red-500 text-red-400`, `border-yellow-500 text-yellow-400`, `border-green-500 text-green-400` patterns. Keep the semantic coloring for flare severity but use outline badge styling:

```
border border-terra-border rounded-full px-2 py-0.5 text-[10px] text-terra-text-secondary
```

- [ ] **Step 5: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/components/space-weather-card.tsx
git commit -m "update: space weather card with panel surface, accent line, edge shimmer"
```

---

### Task 12: Restyle EventPopup

**Files:**
- Modify: `packages/frontend/src/components/event-popup.tsx`

- [ ] **Step 1: Update the popup container**

Find the main popup div and update:
- Replace `bg-terra-surface border-terra-border` with `panel-surface`
- Add `relative overflow-hidden`
- Add popup entrance animation: `style={{ animation: "popup-in 0.2s ease-out both" }}`

- [ ] **Step 2: Add category-colored accent line**

Add a dynamic accent line that uses the event's category color. Inside the popup container, before the content:

```tsx
<div
  className="absolute top-0 left-0 w-[140px] h-px z-1"
  style={{
    background: `linear-gradient(90deg, ${categoryMeta.color} 0%, ${categoryMeta.color}4D 50%, transparent 100%)`,
  }}
/>
```

The `4D` suffix is hex for 30% opacity. This uses the existing `categoryMeta.color` that's already available in the component.

- [ ] **Step 3: Update close button**

```
h-7 w-7 rounded-full
```

Use the ghost button variant.

- [ ] **Step 4: Update badges**

Category badge:
```tsx
<Badge variant="outline" className="border-current" style={{ color: categoryMeta.color }}>
```

Status badge:
```tsx
<Badge variant="outline" className="text-terra-azure border-terra-border">
```

- [ ] **Step 5: Update text colors**

| Element | Classes |
|---------|---------|
| Title | `text-sm font-medium text-terra-text` |
| Coordinates | `text-[13px] text-terra-text-secondary` |
| Magnitude/depth | `text-[13px] text-terra-text-secondary` |
| Date + source | `text-[11px] text-terra-text-muted` |
| Action links | `text-[13px] text-terra-azure hover:underline` |

- [ ] **Step 6: Update connector line SVG**

Replace `terra-cyan` references in the SVG stroke with `categoryMeta.color` (it may already use the category color — verify and keep that pattern).

- [ ] **Step 7: Run lint**

```bash
npm run lint -w packages/frontend
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/frontend/src/components/event-popup.tsx
git commit -m "update: event popup with panel surface, category accent line, entrance animation"
```

---

### Task 13: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full lint**

```bash
npm run lint -w packages/shared
npm run lint -w packages/frontend
npm run lint -w packages/backend
```

Expected: all PASS

- [ ] **Step 2: Run all tests**

```bash
npm run test -w packages/frontend
npm run test -w packages/backend
```

Expected: all PASS. Since we only changed styling (CSS classes, no logic), tests should not be affected.

- [ ] **Step 3: Search for any remaining old token references**

```bash
cd packages/frontend && grep -rn "terra-cyan\|terra-amber\|#4ecdc4\|#ffcb6b\|#040a16\|#0a1628" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Expected: zero matches. If any remain, update them to the new tokens.

- [ ] **Step 4: Verify no inline style colors conflict with the new palette**

```bash
cd packages/frontend && grep -rn "color:.*#\|background:.*#" src/components/ --include="*.tsx"
```

Review any matches — inline hex colors should either be dynamic category colors (acceptable) or hardcoded old palette values (fix them).

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: clean up remaining old token references"
```
