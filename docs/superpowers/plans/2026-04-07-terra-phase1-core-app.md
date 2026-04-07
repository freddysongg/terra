# TERRA Phase 1: Core App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, interactive TERRA app with EONET event markers on a 3D globe, full UI panels (TopBar, LayerPanel, EventFeed, EventPopup, BottomBar), and live data polling.

**Architecture:** npm workspaces monorepo with React UI shell + imperative Three.js globe. Zustand stores bridge React ↔ Three.js. MarkerManager lives in globe/, owned by GlobeScene. CSS2DRenderer for EONET markers. Custom polling hook for data fetching. shadcn/ui + Tailwind for all UI components.

**Tech Stack:** npm workspaces, Vite, React 19, TypeScript, Three.js, Zustand, Tailwind CSS 4, shadcn/ui, Fastify, Vitest

---

## File Map

### `packages/shared/`

| File | Action | Responsibility |
|---|---|---|
| `src/types/events.ts` | Modify | Add `NwsAlert` interface |
| `src/types/layers.ts` | Modify | Add `weatherAlerts` to `EnhancementLayerId` |
| `src/constants/layers.ts` | Modify | Add `weatherAlerts` entry to `LAYER_REGISTRY` |
| `src/constants/categories.ts` | Modify | Update colors to match APP-BREAKDOWN spec |
| `src/index.ts` | Modify | Add `NwsAlert` re-export |

### `packages/frontend/`

| File | Action | Responsibility |
|---|---|---|
| `src/index.css` | Modify | Merge shadcn/ui CSS variables with existing `@theme` |
| `src/stores/event-store.ts` | Modify | Add `searchQuery` field and `setSearchQuery` action |
| `src/stores/globe-store.ts` | Modify | Add `performanceMode` field and `togglePerformanceMode` action |
| `src/stores/data-store.ts` | Create | Zustand store for enhancement/space weather data |
| `src/stores/__tests__/data-store.test.ts` | Create | Tests for data-store |
| `src/stores/__tests__/event-store.test.ts` | Modify | Add test for `searchQuery` |
| `src/stores/__tests__/globe-store.test.ts` | Modify | Add test for `performanceMode` |
| `src/hooks/use-eonet-polling.ts` | Create | Polling hook: fetches /api/events, 10min interval, retry with backoff |
| `src/hooks/__tests__/use-eonet-polling.test.ts` | Create | Tests for polling hook |
| `src/globe/globe-scene.ts` | Modify | Remove auto-rotate resume timer, create/own MarkerManager, expose camera/scene/renderer/controls |
| `src/globe/marker-manager.ts` | Create | CSS2DRenderer EONET markers, back-face culling, click handling |
| `src/components/globe-canvas.tsx` | Modify | Pass canvas click handler for clearing selection |
| `src/components/event-popup.tsx` | Create | Selected event detail card, positioned via CSS transform |
| `src/components/top-bar.tsx` | Create | Search input, event count badge, solar indicator stub, settings gear |
| `src/components/layer-panel.tsx` | Create | Right sidebar with category/enhancement/space weather toggles |
| `src/components/event-feed.tsx` | Create | Left sidebar with metrics, scrollable event list, click-to-fly |
| `src/components/bottom-bar.tsx` | Create | Active layer pills, coordinate readout stub |
| `src/components/data-provider.tsx` | Create | Mounts polling hooks, renders children |
| `src/app.tsx` | Modify | Compose all new components, wire Escape key |
| `components.json` | Create | shadcn/ui configuration |
| `src/lib/utils.ts` | Create | shadcn/ui `cn` utility |
| `src/components/ui/button.tsx` | Create | shadcn/ui Button component |
| `src/components/ui/input.tsx` | Create | shadcn/ui Input component |
| `src/components/ui/badge.tsx` | Create | shadcn/ui Badge component |
| `src/components/ui/scroll-area.tsx` | Create | shadcn/ui ScrollArea component |
| `src/components/ui/switch.tsx` | Create | shadcn/ui Switch component |
| `src/components/ui/tooltip.tsx` | Create | shadcn/ui Tooltip component |

---

## Task 1: shadcn/ui Setup

**Files:**
- Modify: `packages/frontend/package.json`
- Create: `packages/frontend/components.json`
- Create: `packages/frontend/src/lib/utils.ts`
- Modify: `packages/frontend/src/index.css`
- Create: `packages/frontend/src/components/ui/button.tsx`
- Create: `packages/frontend/src/components/ui/input.tsx`
- Create: `packages/frontend/src/components/ui/badge.tsx`
- Create: `packages/frontend/src/components/ui/scroll-area.tsx`
- Create: `packages/frontend/src/components/ui/switch.tsx`
- Create: `packages/frontend/src/components/ui/tooltip.tsx`

- [ ] **Step 1: Install shadcn/ui dependencies**

Run from the monorepo root:

```bash
cd /Users/freddy/Documents/mr-worldwide && npm install -w packages/frontend class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot @radix-ui/react-scroll-area @radix-ui/react-switch @radix-ui/react-tooltip && npm install -D -w packages/frontend @testing-library/react @testing-library/jest-dom
```

Expected: packages install successfully, `node_modules` updated.

- [ ] **Step 2: Create shadcn/ui config file**

Create `packages/frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 3: Create the `cn` utility**

Create `packages/frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Add path alias to Vite and TypeScript configs**

Replace `packages/frontend/vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import path from "path";

export default defineConfig({
  plugins: [react(), glsl()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/health": "http://localhost:3001",
    },
  },
});
```

Replace `packages/frontend/tsconfig.app.json` with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vite/client"],
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Update index.css with shadcn/ui CSS variables merged with existing theme**

Replace `packages/frontend/src/index.css` with:

```css
@import "tailwindcss";

@theme {
  --color-terra-bg: #040a16;
  --color-terra-surface: #0a1628;
  --color-terra-border: #1a2a44;
  --color-terra-text: #c8d6e5;
  --color-terra-text-muted: #637777;
  --color-terra-cyan: #4ecdc4;
  --color-terra-amber: #ffcb6b;

  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}

@layer base {
  :root {
    --background: 222 50% 4%;
    --foreground: 210 25% 84%;
    --card: 217 43% 10%;
    --card-foreground: 210 25% 84%;
    --popover: 217 43% 10%;
    --popover-foreground: 210 25% 84%;
    --primary: 174 56% 55%;
    --primary-foreground: 222 50% 4%;
    --secondary: 217 43% 14%;
    --secondary-foreground: 210 25% 84%;
    --muted: 217 43% 14%;
    --muted-foreground: 180 10% 43%;
    --accent: 217 43% 14%;
    --accent-foreground: 210 25% 84%;
    --destructive: 0 62% 52%;
    --destructive-foreground: 210 25% 84%;
    --border: 215 40% 18%;
    --input: 215 40% 18%;
    --ring: 174 56% 55%;
  }
}

@layer base {
  * {
    @apply border-[hsl(var(--border))];
  }
}
```

- [ ] **Step 6: Create shadcn/ui Button component**

Create `packages/frontend/src/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow hover:bg-[hsl(var(--primary))]/90",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] shadow-sm hover:bg-[hsl(var(--destructive))]/90",
        outline:
          "border border-[hsl(var(--input))] bg-transparent shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm hover:bg-[hsl(var(--secondary))]/80",
        ghost:
          "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
```

- [ ] **Step 7: Create shadcn/ui Input component**

Create `packages/frontend/src/components/ui/input.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils.js";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
```

- [ ] **Step 8: Create shadcn/ui Badge component**

Create `packages/frontend/src/components/ui/badge.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow",
        secondary:
          "border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
        destructive:
          "border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] shadow",
        outline: "text-[hsl(var(--foreground))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.ReactElement {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
export type { BadgeProps };
```

- [ ] **Step 9: Create shadcn/ui ScrollArea component**

Create `packages/frontend/src/components/ui/scroll-area.tsx`:

```tsx
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils.js";

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-[hsl(var(--border))]" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
```

- [ ] **Step 10: Create shadcn/ui Switch component**

Create `packages/frontend/src/components/ui/switch.tsx`:

```tsx
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils.js";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[hsl(var(--primary))] data-[state=unchecked]:bg-[hsl(var(--input))]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-[hsl(var(--foreground))] shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
```

- [ ] **Step 11: Create shadcn/ui Tooltip component**

Create `packages/frontend/src/components/ui/tooltip.tsx`:

```tsx
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils.js";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs text-[hsl(var(--primary-foreground))] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

- [ ] **Step 12: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 13: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/components.json packages/frontend/src/lib/utils.ts packages/frontend/src/components/ui/ packages/frontend/src/index.css packages/frontend/vite.config.ts packages/frontend/tsconfig.app.json packages/frontend/package.json package-lock.json && git commit -m "set up shadcn/ui with dark theme, add button, input, badge, scroll-area, switch, tooltip components"
```

---

## Task 2: Update Shared Types and Constants

**Files:**
- Modify: `packages/shared/src/types/layers.ts`
- Modify: `packages/shared/src/types/events.ts`
- Modify: `packages/shared/src/constants/layers.ts`
- Modify: `packages/shared/src/constants/categories.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add `weatherAlerts` to EnhancementLayerId**

In `packages/shared/src/types/layers.ts`, replace the full file with:

```typescript
import type { EventCategoryId } from "./events.js";

export type EnhancementLayerId = "fireDensity" | "seismicDensity" | "weatherAlerts";

export type SpaceWeatherLayerId = "spaceWeather";

export type LayerId = EventCategoryId | EnhancementLayerId | SpaceWeatherLayerId;

interface LayerMetadata {
  id: LayerId;
  label: string;
  group: "category" | "enhancement" | "spaceWeather";
}

export type { LayerMetadata };
```

- [ ] **Step 2: Add NwsAlert type**

In `packages/shared/src/types/events.ts`, add the `NwsAlert` interface at the end of the file, after the `EventCategory` interface:

```typescript
export interface NwsAlert {
  id: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  event: string;
  areaDesc: string;
  onset: string;
  expires: string;
  senderName: string;
}
```

The full file should be:

```typescript
export type EventCategoryId =
  | "drought"
  | "dustHaze"
  | "earthquakes"
  | "floods"
  | "landslides"
  | "manmade"
  | "seaLakeIce"
  | "severeStorms"
  | "snow"
  | "tempExtremes"
  | "volcanoes"
  | "waterColor"
  | "wildfires";

export type EventStatus = "open" | "closed";

interface EventGeometry {
  type: "Point" | "Polygon";
  coordinates: [longitude: number, latitude: number];
  timestamp: string;
}

interface EventMagnitude {
  id: string;
  value: number;
  unit: string;
}

export interface NaturalEvent {
  id: string;
  title: string;
  category: EventCategoryId;
  status: EventStatus;
  geometries: readonly EventGeometry[];
  magnitude: EventMagnitude | null;
  sourceUrl: string;
  sourceAgency: string;
  closedDate: string | null;
}

export interface EventCategory {
  id: EventCategoryId;
  title: string;
}

export interface NwsAlert {
  id: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  event: string;
  areaDesc: string;
  onset: string;
  expires: string;
  senderName: string;
}
```

- [ ] **Step 3: Add `weatherAlerts` entry to LAYER_REGISTRY**

In `packages/shared/src/constants/layers.ts`, add the following entry after `seismicDensity`:

```typescript
  weatherAlerts: { id: "weatherAlerts", label: "Weather Alerts (NWS)", group: "enhancement" },
```

The full file should be:

```typescript
import type { LayerMetadata, LayerId } from "../types/layers.js";

export const LAYER_REGISTRY: Record<LayerId, LayerMetadata> = {
  drought: { id: "drought", label: "Drought", group: "category" },
  dustHaze: { id: "dustHaze", label: "Dust & Haze", group: "category" },
  earthquakes: { id: "earthquakes", label: "Earthquakes", group: "category" },
  floods: { id: "floods", label: "Floods", group: "category" },
  landslides: { id: "landslides", label: "Landslides", group: "category" },
  manmade: { id: "manmade", label: "Manmade", group: "category" },
  seaLakeIce: { id: "seaLakeIce", label: "Sea & Lake Ice", group: "category" },
  severeStorms: { id: "severeStorms", label: "Severe Storms", group: "category" },
  snow: { id: "snow", label: "Snow", group: "category" },
  tempExtremes: { id: "tempExtremes", label: "Temperature Extremes", group: "category" },
  volcanoes: { id: "volcanoes", label: "Volcanoes", group: "category" },
  waterColor: { id: "waterColor", label: "Water Color", group: "category" },
  wildfires: { id: "wildfires", label: "Wildfires", group: "category" },
  fireDensity: { id: "fireDensity", label: "Fire Density (FIRMS)", group: "enhancement" },
  seismicDensity: { id: "seismicDensity", label: "Seismic Density (USGS)", group: "enhancement" },
  weatherAlerts: { id: "weatherAlerts", label: "Weather Alerts (NWS)", group: "enhancement" },
  spaceWeather: { id: "spaceWeather", label: "Space Weather", group: "spaceWeather" },
};
```

- [ ] **Step 4: Update CATEGORY_META colors to match APP-BREAKDOWN spec**

Replace `packages/shared/src/constants/categories.ts` with:

```typescript
import type { EventCategoryId } from "../types/events.js";

interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_META: Record<EventCategoryId, CategoryMeta> = {
  drought: { label: "Drought", color: "#c4956a" },
  dustHaze: { label: "Dust & Haze", color: "#a89882" },
  earthquakes: { label: "Earthquakes", color: "#f5a623" },
  floods: { label: "Floods", color: "#00bcd4" },
  landslides: { label: "Landslides", color: "#8b6914" },
  manmade: { label: "Manmade", color: "#9c7cb5" },
  seaLakeIce: { label: "Sea & Lake Ice", color: "#b3e5fc" },
  severeStorms: { label: "Severe Storms", color: "#4e9eff" },
  snow: { label: "Snow", color: "#e0f0ff" },
  tempExtremes: { label: "Temperature Extremes", color: "#ff4081" },
  volcanoes: { label: "Volcanoes", color: "#e8403f" },
  waterColor: { label: "Water Color", color: "#26a69a" },
  wildfires: { label: "Wildfires", color: "#ff6b35" },
};
```

- [ ] **Step 5: Update shared index.ts re-exports**

Replace `packages/shared/src/index.ts` with:

```typescript
export type {
  EventCategoryId, EventStatus, NaturalEvent, EventCategory, NwsAlert,
} from "./types/events.js";
export type {
  ApiSource, ApiErrorCode, ApiSuccessResponse, ApiErrorResponse, ApiResponse,
} from "./types/api.js";
export type {
  LayerId, EnhancementLayerId, SpaceWeatherLayerId, LayerMetadata,
} from "./types/layers.js";
export type { FireHotspot } from "./types/fires.js";
export type { Earthquake } from "./types/earthquakes.js";
export type {
  SolarFlare, GeomagneticStorm, SpaceWeatherSummary,
} from "./types/space-weather.js";
export { CATEGORY_META } from "./constants/categories.js";
export { LAYER_REGISTRY } from "./constants/layers.js";
```

- [ ] **Step 6: Type-check shared package**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/shared
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/shared/src/ && git commit -m "add weatherAlerts enhancement layer, NwsAlert type, update category colors to match spec"
```

---

## Task 3: Add data-store

**Files:**
- Create: `packages/frontend/src/stores/data-store.ts`
- Create: `packages/frontend/src/stores/__tests__/data-store.test.ts`

- [ ] **Step 1: Create data-store**

Create `packages/frontend/src/stores/data-store.ts`:

```typescript
import { create } from "zustand";
import type { FireHotspot, Earthquake, SpaceWeatherSummary, NwsAlert } from "@terra/shared";

interface DataState {
  fireHotspots: readonly FireHotspot[];
  earthquakes: readonly Earthquake[];
  spaceWeather: SpaceWeatherSummary | null;
  weatherAlerts: readonly NwsAlert[];
  isLoadingFires: boolean;
  isLoadingEarthquakes: boolean;
  isLoadingSpaceWeather: boolean;
  isLoadingWeatherAlerts: boolean;
  setFireHotspots: (hotspots: readonly FireHotspot[]) => void;
  setEarthquakes: (quakes: readonly Earthquake[]) => void;
  setSpaceWeather: (summary: SpaceWeatherSummary) => void;
  setWeatherAlerts: (alerts: readonly NwsAlert[]) => void;
  setLoadingFires: (loading: boolean) => void;
  setLoadingEarthquakes: (loading: boolean) => void;
  setLoadingSpaceWeather: (loading: boolean) => void;
  setLoadingWeatherAlerts: (loading: boolean) => void;
}

export const useDataStore = create<DataState>()((set) => ({
  fireHotspots: [],
  earthquakes: [],
  spaceWeather: null,
  weatherAlerts: [],
  isLoadingFires: false,
  isLoadingEarthquakes: false,
  isLoadingSpaceWeather: false,
  isLoadingWeatherAlerts: false,
  setFireHotspots: (fireHotspots) => set({ fireHotspots }),
  setEarthquakes: (earthquakes) => set({ earthquakes }),
  setSpaceWeather: (spaceWeather) => set({ spaceWeather }),
  setWeatherAlerts: (weatherAlerts) => set({ weatherAlerts }),
  setLoadingFires: (isLoadingFires) => set({ isLoadingFires }),
  setLoadingEarthquakes: (isLoadingEarthquakes) => set({ isLoadingEarthquakes }),
  setLoadingSpaceWeather: (isLoadingSpaceWeather) => set({ isLoadingSpaceWeather }),
  setLoadingWeatherAlerts: (isLoadingWeatherAlerts) => set({ isLoadingWeatherAlerts }),
}));
```

- [ ] **Step 2: Create data-store tests**

Create `packages/frontend/src/stores/__tests__/data-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useDataStore } from "../data-store.js";
import type { FireHotspot, Earthquake, SpaceWeatherSummary, NwsAlert } from "@terra/shared";

const MOCK_HOTSPOT: FireHotspot = {
  latitude: 44.0,
  longitude: -121.5,
  brightness: 350,
  confidence: "high",
  acquisitionTimestamp: "2026-04-01T00:00:00Z",
};

const MOCK_EARTHQUAKE: Earthquake = {
  id: "us7000abc",
  title: "M 5.2 - Central California",
  magnitude: 5.2,
  latitude: 36.5,
  longitude: -120.1,
  depth: 10.5,
  timestamp: "2026-04-01T12:00:00Z",
  detailUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc",
};

const MOCK_SPACE_WEATHER: SpaceWeatherSummary = {
  solarFlares: [
    {
      id: "2026-04-01-001",
      classType: "M1.2",
      beginTime: "2026-04-01T08:00:00Z",
      peakTime: "2026-04-01T08:30:00Z",
      endTime: "2026-04-01T09:00:00Z",
      sourceLocation: "N20W30",
    },
  ],
  geomagneticStorms: [],
};

const MOCK_ALERT: NwsAlert = {
  id: "urn:oid:2.49.0.1.840.0.abc",
  headline: "Tornado Warning",
  severity: "Extreme",
  event: "Tornado Warning",
  areaDesc: "Central Oklahoma",
  onset: "2026-04-01T18:00:00Z",
  expires: "2026-04-01T19:00:00Z",
  senderName: "NWS Norman OK",
};

describe("data-store", () => {
  beforeEach(() => {
    useDataStore.setState(useDataStore.getInitialState());
  });

  it("starts with empty data and no loading flags", () => {
    const state = useDataStore.getState();
    expect(state.fireHotspots).toEqual([]);
    expect(state.earthquakes).toEqual([]);
    expect(state.spaceWeather).toBeNull();
    expect(state.weatherAlerts).toEqual([]);
    expect(state.isLoadingFires).toBe(false);
    expect(state.isLoadingEarthquakes).toBe(false);
    expect(state.isLoadingSpaceWeather).toBe(false);
    expect(state.isLoadingWeatherAlerts).toBe(false);
  });

  it("sets fire hotspots", () => {
    useDataStore.getState().setFireHotspots([MOCK_HOTSPOT]);
    expect(useDataStore.getState().fireHotspots).toHaveLength(1);
    expect(useDataStore.getState().fireHotspots[0]!.brightness).toBe(350);
  });

  it("sets earthquakes", () => {
    useDataStore.getState().setEarthquakes([MOCK_EARTHQUAKE]);
    expect(useDataStore.getState().earthquakes).toHaveLength(1);
    expect(useDataStore.getState().earthquakes[0]!.magnitude).toBe(5.2);
  });

  it("sets space weather summary", () => {
    useDataStore.getState().setSpaceWeather(MOCK_SPACE_WEATHER);
    const sw = useDataStore.getState().spaceWeather;
    expect(sw).not.toBeNull();
    expect(sw!.solarFlares).toHaveLength(1);
  });

  it("sets weather alerts", () => {
    useDataStore.getState().setWeatherAlerts([MOCK_ALERT]);
    expect(useDataStore.getState().weatherAlerts).toHaveLength(1);
    expect(useDataStore.getState().weatherAlerts[0]!.severity).toBe("Extreme");
  });

  it("tracks loading states independently", () => {
    useDataStore.getState().setLoadingFires(true);
    useDataStore.getState().setLoadingEarthquakes(true);
    expect(useDataStore.getState().isLoadingFires).toBe(true);
    expect(useDataStore.getState().isLoadingEarthquakes).toBe(true);
    expect(useDataStore.getState().isLoadingSpaceWeather).toBe(false);

    useDataStore.getState().setLoadingFires(false);
    expect(useDataStore.getState().isLoadingFires).toBe(false);
    expect(useDataStore.getState().isLoadingEarthquakes).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm test -w packages/frontend
```

Expected: all tests pass, including the new data-store tests.

- [ ] **Step 4: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/stores/data-store.ts packages/frontend/src/stores/__tests__/data-store.test.ts && git commit -m "add data-store for enhancement and space weather data"
```

---

## Task 4: Update event-store

**Files:**
- Modify: `packages/frontend/src/stores/event-store.ts`
- Modify: `packages/frontend/src/stores/__tests__/event-store.test.ts`

- [ ] **Step 1: Add searchQuery field and setSearchQuery action**

Replace `packages/frontend/src/stores/event-store.ts` with:

```typescript
import { create } from "zustand";
import type { NaturalEvent } from "@terra/shared";

interface ScreenPosition {
  x: number;
  y: number;
}

interface EventState {
  events: readonly NaturalEvent[];
  selectedEventId: string | null;
  selectedEventScreenPosition: ScreenPosition | null;
  hoveredEventId: string | null;
  searchQuery: string;
  setEvents: (events: readonly NaturalEvent[]) => void;
  selectEvent: (id: string) => void;
  clearSelection: () => void;
  setSelectedScreenPosition: (pos: ScreenPosition | null) => void;
  setHoveredEvent: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],
  selectedEventId: null,
  selectedEventScreenPosition: null,
  hoveredEventId: null,
  searchQuery: "",
  setEvents: (events) => set({ events }),
  selectEvent: (selectedEventId) => set({ selectedEventId }),
  clearSelection: () => set({ selectedEventId: null, selectedEventScreenPosition: null }),
  setSelectedScreenPosition: (selectedEventScreenPosition) => set({ selectedEventScreenPosition }),
  setHoveredEvent: (hoveredEventId) => set({ hoveredEventId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
```

- [ ] **Step 2: Add searchQuery tests**

In `packages/frontend/src/stores/__tests__/event-store.test.ts`, add the following two tests inside the `describe("event-store", ...)` block, after the existing tests:

```typescript
  it("starts with empty search query", () => {
    expect(useEventStore.getState().searchQuery).toBe("");
  });

  it("sets search query", () => {
    useEventStore.getState().setSearchQuery("wildfire");
    expect(useEventStore.getState().searchQuery).toBe("wildfire");
    useEventStore.getState().setSearchQuery("");
    expect(useEventStore.getState().searchQuery).toBe("");
  });
```

The full test file should be:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useEventStore } from "../event-store.js";
import type { NaturalEvent } from "@terra/shared";

const MOCK_EVENT: NaturalEvent = {
  id: "EONET_1234",
  title: "Wildfire in Oregon",
  category: "wildfires",
  status: "open",
  geometries: [
    { type: "Point", coordinates: [-121.5, 44.0], timestamp: "2026-04-01T00:00:00Z" },
  ],
  magnitude: { id: "mag_acres", value: 5000, unit: "acres" },
  sourceUrl: "https://example.com",
  sourceAgency: "InciWeb",
  closedDate: null,
};

describe("event-store", () => {
  beforeEach(() => {
    useEventStore.setState(useEventStore.getInitialState());
  });

  it("starts with empty events and no selection", () => {
    const state = useEventStore.getState();
    expect(state.events).toEqual([]);
    expect(state.selectedEventId).toBeNull();
    expect(state.hoveredEventId).toBeNull();
  });

  it("sets events", () => {
    useEventStore.getState().setEvents([MOCK_EVENT]);
    expect(useEventStore.getState().events).toHaveLength(1);
    expect(useEventStore.getState().events[0]!.id).toBe("EONET_1234");
  });

  it("selects an event", () => {
    useEventStore.getState().selectEvent("EONET_1234");
    expect(useEventStore.getState().selectedEventId).toBe("EONET_1234");
  });

  it("clears selection", () => {
    useEventStore.getState().selectEvent("EONET_1234");
    useEventStore.getState().clearSelection();
    const state = useEventStore.getState();
    expect(state.selectedEventId).toBeNull();
    expect(state.selectedEventScreenPosition).toBeNull();
  });

  it("updates screen position for selected event", () => {
    useEventStore.getState().setSelectedScreenPosition({ x: 100, y: 200 });
    const pos = useEventStore.getState().selectedEventScreenPosition;
    expect(pos).toEqual({ x: 100, y: 200 });
  });

  it("sets hover state", () => {
    useEventStore.getState().setHoveredEvent("EONET_1234");
    expect(useEventStore.getState().hoveredEventId).toBe("EONET_1234");
    useEventStore.getState().setHoveredEvent(null);
    expect(useEventStore.getState().hoveredEventId).toBeNull();
  });

  it("starts with empty search query", () => {
    expect(useEventStore.getState().searchQuery).toBe("");
  });

  it("sets search query", () => {
    useEventStore.getState().setSearchQuery("wildfire");
    expect(useEventStore.getState().searchQuery).toBe("wildfire");
    useEventStore.getState().setSearchQuery("");
    expect(useEventStore.getState().searchQuery).toBe("");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm test -w packages/frontend
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/stores/event-store.ts packages/frontend/src/stores/__tests__/event-store.test.ts && git commit -m "add searchQuery field to event-store"
```

---

## Task 5: Update globe-store

**Files:**
- Modify: `packages/frontend/src/stores/globe-store.ts`
- Modify: `packages/frontend/src/stores/__tests__/globe-store.test.ts`

- [ ] **Step 1: Add performanceMode field and togglePerformanceMode action**

Replace `packages/frontend/src/stores/globe-store.ts` with:

```typescript
import { create } from "zustand";

interface GlobeState {
  loadProgress: number;
  isLoaded: boolean;
  isUserInteracting: boolean;
  isPerformanceMode: boolean;
  setLoadProgress: (progress: number) => void;
  setLoaded: () => void;
  setUserInteracting: (interacting: boolean) => void;
  togglePerformanceMode: () => void;
}

export const useGlobeStore = create<GlobeState>()((set) => ({
  loadProgress: 0,
  isLoaded: false,
  isUserInteracting: false,
  isPerformanceMode: false,
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setLoaded: () => set({ isLoaded: true, loadProgress: 100 }),
  setUserInteracting: (isUserInteracting) => set({ isUserInteracting }),
  togglePerformanceMode: () => set((state) => ({ isPerformanceMode: !state.isPerformanceMode })),
}));
```

- [ ] **Step 2: Add performanceMode tests**

Replace `packages/frontend/src/stores/__tests__/globe-store.test.ts` with:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useGlobeStore } from "../globe-store.js";

describe("globe-store", () => {
  beforeEach(() => {
    useGlobeStore.setState(useGlobeStore.getInitialState());
  });

  it("starts with zero progress and not loaded", () => {
    const state = useGlobeStore.getState();
    expect(state.loadProgress).toBe(0);
    expect(state.isLoaded).toBe(false);
    expect(state.isUserInteracting).toBe(false);
  });

  it("updates load progress", () => {
    useGlobeStore.getState().setLoadProgress(50);
    expect(useGlobeStore.getState().loadProgress).toBe(50);
  });

  it("marks as loaded", () => {
    useGlobeStore.getState().setLoaded();
    const state = useGlobeStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.loadProgress).toBe(100);
  });

  it("tracks user interaction", () => {
    useGlobeStore.getState().setUserInteracting(true);
    expect(useGlobeStore.getState().isUserInteracting).toBe(true);
    useGlobeStore.getState().setUserInteracting(false);
    expect(useGlobeStore.getState().isUserInteracting).toBe(false);
  });

  it("starts with performance mode off", () => {
    expect(useGlobeStore.getState().isPerformanceMode).toBe(false);
  });

  it("toggles performance mode", () => {
    useGlobeStore.getState().togglePerformanceMode();
    expect(useGlobeStore.getState().isPerformanceMode).toBe(true);
    useGlobeStore.getState().togglePerformanceMode();
    expect(useGlobeStore.getState().isPerformanceMode).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm test -w packages/frontend
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/stores/globe-store.ts packages/frontend/src/stores/__tests__/globe-store.test.ts && git commit -m "add performanceMode toggle to globe-store"
```

---

## Task 6: Fix Auto-Rotation

**Files:**
- Modify: `packages/frontend/src/globe/globe-scene.ts`

- [ ] **Step 1: Remove resume timer, stop auto-rotation permanently on first interaction**

In `packages/frontend/src/globe/globe-scene.ts`, make the following changes:

1. Remove the `AUTO_ROTATE_RESUME_DELAY` constant (line 15).
2. Remove the `autoRotateTimer` field (line 31).
3. Replace the `createControls` method with a version that stops rotation permanently.
4. Remove the `autoRotateTimer` cleanup from `dispose()`.

The updated constant block at the top (lines 13-16) should be:

```typescript
const BACKGROUND_COLOR = 0x040a16;
const AUTO_ROTATE_SPEED = 0.25;
const GLOBE_TILT_DEG = 12;
```

Remove the field declaration. The class fields should not include `autoRotateTimer`:

```typescript
  private atmosphere: ReturnType<typeof createAtmosphere> | null = null;
  private postProcessing: ReturnType<typeof createPostProcessing> | null = null;
  private globe: THREE.Mesh | null = null;
  private globeMaterial: THREE.ShaderMaterial | null = null;
  private contourMesh: THREE.Mesh | null = null;
  private starField: THREE.Points | null = null;
  private globeGeometry: THREE.SphereGeometry | null = null;
  private contourGeometry: THREE.SphereGeometry | null = null;
  private contourMaterial: THREE.MeshBasicMaterial | null = null;
  private oceanColorMap: THREE.CanvasTexture | null = null;
```

Replace the `createControls` method with:

```typescript
  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.config.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 6.0;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;

    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });

    return controls;
  }
```

In the `dispose()` method, remove the line `if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer);`. The dispose method should be:

```typescript
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver.disconnect();
    this.controls.dispose();

    this.starField?.geometry.dispose();
    (this.starField?.material as THREE.PointsMaterial | undefined)?.dispose();
    this.globeGeometry?.dispose();
    this.globeMaterial?.dispose();
    this.contourGeometry?.dispose();
    this.contourMaterial?.map?.dispose();
    this.contourMaterial?.dispose();
    this.oceanColorMap?.dispose();

    this.atmosphere?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
```

The full updated `packages/frontend/src/globe/globe-scene.ts`:

```typescript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStarField } from "./stars.js";
import { createAtmosphere } from "./atmosphere.js";
import { createPostProcessing } from "./post-processing.js";
import { createOceanColorMap } from "./textures/ocean-color.js";
import { createContourTexture } from "./textures/contour-lines.js";
import { createFallbackNightTexture } from "./textures/fallback-night.js";
import { loadGlobeTextures, applyTextureSettings } from "./textures/texture-loader.js";
import globeSurfaceVert from "./shaders/globe-surface.vert";
import globeSurfaceFrag from "./shaders/globe-surface.frag";

const BACKGROUND_COLOR = 0x040a16;
const AUTO_ROTATE_SPEED = 0.25;
const GLOBE_TILT_DEG = 12;

interface GlobeSceneConfig {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number) => void;
  onReady?: () => void;
}

export class GlobeScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;

  private atmosphere: ReturnType<typeof createAtmosphere> | null = null;
  private postProcessing: ReturnType<typeof createPostProcessing> | null = null;
  private globe: THREE.Mesh | null = null;
  private globeMaterial: THREE.ShaderMaterial | null = null;
  private contourMesh: THREE.Mesh | null = null;
  private starField: THREE.Points | null = null;
  private globeGeometry: THREE.SphereGeometry | null = null;
  private contourGeometry: THREE.SphereGeometry | null = null;
  private contourMaterial: THREE.MeshBasicMaterial | null = null;
  private oceanColorMap: THREE.CanvasTexture | null = null;

  constructor(private config: GlobeSceneConfig) {
    const { canvas } = config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 0.4, 3.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = this.createControls();

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.starField = createStarField();
    this.scene.add(this.starField);

    this.init().catch((err) => {
      console.error("globe scene initialization failed:", err);
    });
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.config.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 6.0;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;

    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });

    return controls;
  }

  private async init(): Promise<void> {
    const { onProgress, onReady } = this.config;

    const { night, topo } = await loadGlobeTextures(onProgress);
    onProgress?.(60);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    if (night) applyTextureSettings(night, maxAniso, THREE.SRGBColorSpace);
    if (topo) applyTextureSettings(topo, maxAniso, THREE.LinearSRGBColorSpace);

    const finalNight = night ?? createFallbackNightTexture();
    onProgress?.(75);

    this.oceanColorMap = createOceanColorMap();
    this.globeMaterial = new THREE.ShaderMaterial({
      vertexShader: globeSurfaceVert,
      fragmentShader: globeSurfaceFrag,
      uniforms: {
        uNightMap: { value: finalNight },
        uTopoMap: { value: topo ?? this.createFlatTexture() },
        uOceanMap: { value: this.oceanColorMap },
      },
    });

    this.globeGeometry = new THREE.SphereGeometry(1, 200, 200);
    this.globe = new THREE.Mesh(this.globeGeometry, this.globeMaterial);
    this.globe.rotation.y = -Math.PI / 2;
    this.globe.rotation.x = THREE.MathUtils.degToRad(GLOBE_TILT_DEG);
    this.scene.add(this.globe);

    this.contourGeometry = new THREE.SphereGeometry(1.003, 200, 200);
    this.contourMaterial = new THREE.MeshBasicMaterial({
      map: createContourTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.contourMesh = new THREE.Mesh(this.contourGeometry, this.contourMaterial);
    this.globe.add(this.contourMesh);

    onProgress?.(85);

    this.atmosphere = createAtmosphere(this.camera);
    this.postProcessing = createPostProcessing(this.renderer, this.scene, this.camera);

    onProgress?.(100);
    onReady?.();

    this.animate();
  }

  private createFlatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    canvas.getContext("2d")!.fillRect(0, 0, 4, 4);
    return new THREE.CanvasTexture(canvas);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();

    if (this.postProcessing && this.atmosphere) {
      this.postProcessing.composer.render();
      this.renderer.autoClear = false;
      this.renderer.render(this.atmosphere.scene, this.camera);
      this.renderer.autoClear = true;
    }
  };

  private handleResize = (): void => {
    const parent = this.config.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing?.resize(width, height);
  };

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver.disconnect();
    this.controls.dispose();

    this.starField?.geometry.dispose();
    (this.starField?.material as THREE.PointsMaterial | undefined)?.dispose();
    this.globeGeometry?.dispose();
    this.globeMaterial?.dispose();
    this.contourGeometry?.dispose();
    this.contourMaterial?.map?.dispose();
    this.contourMaterial?.dispose();
    this.oceanColorMap?.dispose();

    this.atmosphere?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/globe/globe-scene.ts && git commit -m "fix auto-rotation to stop permanently on first user interaction"
```

---

## Task 7: useEonetPolling Hook

**Files:**
- Create: `packages/frontend/src/hooks/use-eonet-polling.ts`
- Create: `packages/frontend/src/hooks/__tests__/use-eonet-polling.test.ts`

- [ ] **Step 1: Create the polling hook**

Create `packages/frontend/src/hooks/use-eonet-polling.ts`:

```typescript
import { useEffect, useRef } from "react";
import { useEventStore } from "../stores/event-store.js";
import type { ApiResponse, NaturalEvent } from "@terra/shared";

const POLL_INTERVAL_MS = 10 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

async function fetchEvents(signal: AbortSignal): Promise<readonly NaturalEvent[]> {
  const response = await fetch("/api/events", { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<readonly NaturalEvent[]>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

async function fetchWithRetry(signal: AbortSignal): Promise<readonly NaturalEvent[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchEvents(signal);
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("fetch events failed after retries");
}

export function useEonetPolling(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function poll(): Promise<void> {
      try {
        const events = await fetchWithRetry(abortController.signal);
        if (!abortController.signal.aborted) {
          useEventStore.getState().setEvents(events);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("eonet polling failed:", err);
        }
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      abortController.abort();
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
```

- [ ] **Step 2: Create polling hook tests**

Create `packages/frontend/src/hooks/__tests__/use-eonet-polling.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEonetPolling } from "../use-eonet-polling.js";
import { useEventStore } from "../../stores/event-store.js";
import type { NaturalEvent } from "@terra/shared";

const MOCK_EVENT: NaturalEvent = {
  id: "EONET_5678",
  title: "Wildfire in California",
  category: "wildfires",
  status: "open",
  geometries: [
    { type: "Point", coordinates: [-119.5, 37.0], timestamp: "2026-04-01T00:00:00Z" },
  ],
  magnitude: null,
  sourceUrl: "https://example.com",
  sourceAgency: "InciWeb",
  closedDate: null,
};

describe("useEonetPolling", () => {
  beforeEach(() => {
    useEventStore.setState(useEventStore.getInitialState());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches events on mount and writes to store", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_EVENT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useEonetPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/events", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(useEventStore.getState().events).toHaveLength(1);
    expect(useEventStore.getState().events[0]!.id).toBe("EONET_5678");
  });

  it("retries on failure with exponential backoff", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error("network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", data: [MOCK_EVENT], cached: false }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useEonetPolling());

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useEventStore.getState().events).toHaveLength(1);
  });

  it("cleans up interval and aborts on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { unmount } = renderHook(() => useEonetPolling());
    await vi.advanceTimersByTimeAsync(0);

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Install @testing-library/react**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm install -w packages/frontend -D @testing-library/react
```

Expected: package installs successfully.

- [ ] **Step 4: Update vitest config to include .tsx test files**

Replace `packages/frontend/vitest.config.ts` with:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm test -w packages/frontend
```

Expected: all tests pass, including the new polling hook tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/hooks/use-eonet-polling.ts packages/frontend/src/hooks/__tests__/use-eonet-polling.test.ts packages/frontend/vitest.config.ts packages/frontend/package.json package-lock.json && git commit -m "add useEonetPolling hook with 10min interval and exponential backoff retry"
```

---

## Task 8: MarkerManager

**Files:**
- Create: `packages/frontend/src/globe/marker-manager.ts`
- Modify: `packages/frontend/src/globe/globe-scene.ts`

- [ ] **Step 1: Create MarkerManager**

Create `packages/frontend/src/globe/marker-manager.ts`:

```typescript
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";

const MARKER_RADIUS = 1.01;
const BACK_FACE_THRESHOLD = 0;

interface MarkerEntry {
  object: CSS2DObject;
  element: HTMLDivElement;
  eventId: string;
  category: EventCategoryId;
  position: THREE.Vector3;
}

function latLngToVector3(latitude: number, longitude: number): THREE.Vector3 {
  const latRad = (latitude * Math.PI) / 180;
  const lngRad = (longitude * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.cos(latRad) * Math.cos(lngRad) * MARKER_RADIUS,
    Math.sin(latRad) * MARKER_RADIUS,
    Math.cos(latRad) * Math.sin(lngRad) * MARKER_RADIUS,
  );
}

function projectToScreen(
  worldPosition: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): { x: number; y: number } {
  const projected = worldPosition.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
  };
}

function createMarkerElement(event: NaturalEvent): HTMLDivElement {
  const color = CATEGORY_META[event.category]?.color ?? "#ffffff";

  const container = document.createElement("div");
  container.className = "terra-marker";
  container.style.cssText = `
    pointer-events: auto;
    cursor: pointer;
    width: 12px;
    height: 12px;
    position: relative;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${color};
    border: 1.5px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 6px ${color}80;
    transition: transform 0.15s ease;
  `;

  container.appendChild(dot);

  container.addEventListener("mouseenter", () => {
    dot.style.transform = "scale(1.4)";
    useEventStore.getState().setHoveredEvent(event.id);
  });

  container.addEventListener("mouseleave", () => {
    dot.style.transform = "scale(1)";
    useEventStore.getState().setHoveredEvent(null);
  });

  return container;
}

export class MarkerManager {
  private css2dRenderer: CSS2DRenderer;
  private markers: Map<string, MarkerEntry> = new Map();
  private unsubscribeEvents: () => void;
  private unsubscribeLayers: () => void;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLCanvasElement,
    private globe: THREE.Mesh,
  ) {
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.css2dRenderer.domElement.style.position = "absolute";
    this.css2dRenderer.domElement.style.top = "0";
    this.css2dRenderer.domElement.style.left = "0";
    this.css2dRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement?.appendChild(this.css2dRenderer.domElement);

    this.unsubscribeEvents = useEventStore.subscribe(
      (state, prevState) => {
        if (state.events !== prevState.events) {
          this.syncMarkers();
        }
      },
    );

    this.unsubscribeLayers = useLayerStore.subscribe(
      (state, prevState) => {
        if (state.activeLayers !== prevState.activeLayers) {
          this.updateVisibility();
        }
      },
    );

    canvas.addEventListener("click", this.handleCanvasClick);
  }

  private handleCanvasClick = (): void => {
    useEventStore.getState().clearSelection();
  };

  private syncMarkers(): void {
    const events = useEventStore.getState().events;
    const currentIds = new Set(events.map((e) => e.id));

    for (const [eventId, entry] of this.markers) {
      if (!currentIds.has(eventId)) {
        this.globe.remove(entry.object);
        this.markers.delete(eventId);
      }
    }

    for (const event of events) {
      if (this.markers.has(event.id)) continue;

      const lastGeometry = event.geometries[event.geometries.length - 1];
      if (!lastGeometry || lastGeometry.type !== "Point") continue;

      const [longitude, latitude] = lastGeometry.coordinates;
      const position = latLngToVector3(latitude!, longitude!);

      const element = createMarkerElement(event);
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleMarkerClick(event.id, position);
      });

      const cssObject = new CSS2DObject(element);
      cssObject.position.copy(position);

      this.globe.add(cssObject);

      this.markers.set(event.id, {
        object: cssObject,
        element,
        eventId: event.id,
        category: event.category,
        position,
      });
    }

    this.updateVisibility();
  }

  private handleMarkerClick(eventId: string, markerLocalPosition: THREE.Vector3): void {
    const worldPosition = new THREE.Vector3();
    this.globe.localToWorld(worldPosition.copy(markerLocalPosition));

    const parent = this.canvas.parentElement;
    const width = parent?.clientWidth ?? this.canvas.clientWidth;
    const height = parent?.clientHeight ?? this.canvas.clientHeight;

    const screenPos = projectToScreen(worldPosition, this.camera, width, height);

    const store = useEventStore.getState();
    store.selectEvent(eventId);
    store.setSelectedScreenPosition(screenPos);
  }

  private updateVisibility(): void {
    const activeLayers = useLayerStore.getState().activeLayers;

    for (const [, entry] of this.markers) {
      const isLayerActive = activeLayers.has(entry.category);
      entry.object.visible = isLayerActive;
    }
  }

  update(): void {
    const cameraDirection = this.camera.position.clone().normalize().negate();

    for (const [, entry] of this.markers) {
      if (!entry.object.visible) continue;

      const worldPos = new THREE.Vector3();
      this.globe.localToWorld(worldPos.copy(entry.position));
      const markerNormal = worldPos.clone().normalize();

      const dotProduct = markerNormal.dot(cameraDirection);
      entry.element.style.opacity = dotProduct < BACK_FACE_THRESHOLD ? "0" : "1";
      entry.element.style.pointerEvents = dotProduct < BACK_FACE_THRESHOLD ? "none" : "auto";
    }

    this.css2dRenderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.css2dRenderer.setSize(width, height);
  }

  dispose(): void {
    this.unsubscribeEvents();
    this.unsubscribeLayers();
    this.canvas.removeEventListener("click", this.handleCanvasClick);

    for (const [, entry] of this.markers) {
      this.globe.remove(entry.object);
    }
    this.markers.clear();

    this.css2dRenderer.domElement.remove();
  }
}
```

- [ ] **Step 2: Update GlobeScene to create and own MarkerManager**

Replace `packages/frontend/src/globe/globe-scene.ts` with the full updated version that includes MarkerManager integration:

```typescript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStarField } from "./stars.js";
import { createAtmosphere } from "./atmosphere.js";
import { createPostProcessing } from "./post-processing.js";
import { createOceanColorMap } from "./textures/ocean-color.js";
import { createContourTexture } from "./textures/contour-lines.js";
import { createFallbackNightTexture } from "./textures/fallback-night.js";
import { loadGlobeTextures, applyTextureSettings } from "./textures/texture-loader.js";
import { MarkerManager } from "./marker-manager.js";
import { useEventStore } from "../stores/event-store.js";
import globeSurfaceVert from "./shaders/globe-surface.vert";
import globeSurfaceFrag from "./shaders/globe-surface.frag";

const BACKGROUND_COLOR = 0x040a16;
const AUTO_ROTATE_SPEED = 0.25;
const GLOBE_TILT_DEG = 12;

interface GlobeSceneConfig {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number) => void;
  onReady?: () => void;
}

export class GlobeScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;
  private markerManager: MarkerManager | null = null;

  private atmosphere: ReturnType<typeof createAtmosphere> | null = null;
  private postProcessing: ReturnType<typeof createPostProcessing> | null = null;
  private globe: THREE.Mesh | null = null;
  private globeMaterial: THREE.ShaderMaterial | null = null;
  private contourMesh: THREE.Mesh | null = null;
  private starField: THREE.Points | null = null;
  private globeGeometry: THREE.SphereGeometry | null = null;
  private contourGeometry: THREE.SphereGeometry | null = null;
  private contourMaterial: THREE.MeshBasicMaterial | null = null;
  private oceanColorMap: THREE.CanvasTexture | null = null;

  constructor(private config: GlobeSceneConfig) {
    const { canvas } = config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 0.4, 3.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = this.createControls();

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.starField = createStarField();
    this.scene.add(this.starField);

    this.init().catch((err) => {
      console.error("globe scene initialization failed:", err);
    });
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.config.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 6.0;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;

    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      useEventStore.getState().clearSelection();
    });

    return controls;
  }

  private async init(): Promise<void> {
    const { onProgress, onReady } = this.config;

    const { night, topo } = await loadGlobeTextures(onProgress);
    onProgress?.(60);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    if (night) applyTextureSettings(night, maxAniso, THREE.SRGBColorSpace);
    if (topo) applyTextureSettings(topo, maxAniso, THREE.LinearSRGBColorSpace);

    const finalNight = night ?? createFallbackNightTexture();
    onProgress?.(75);

    this.oceanColorMap = createOceanColorMap();
    this.globeMaterial = new THREE.ShaderMaterial({
      vertexShader: globeSurfaceVert,
      fragmentShader: globeSurfaceFrag,
      uniforms: {
        uNightMap: { value: finalNight },
        uTopoMap: { value: topo ?? this.createFlatTexture() },
        uOceanMap: { value: this.oceanColorMap },
      },
    });

    this.globeGeometry = new THREE.SphereGeometry(1, 200, 200);
    this.globe = new THREE.Mesh(this.globeGeometry, this.globeMaterial);
    this.globe.rotation.y = -Math.PI / 2;
    this.globe.rotation.x = THREE.MathUtils.degToRad(GLOBE_TILT_DEG);
    this.scene.add(this.globe);

    this.contourGeometry = new THREE.SphereGeometry(1.003, 200, 200);
    this.contourMaterial = new THREE.MeshBasicMaterial({
      map: createContourTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.contourMesh = new THREE.Mesh(this.contourGeometry, this.contourMaterial);
    this.globe.add(this.contourMesh);

    onProgress?.(85);

    this.atmosphere = createAtmosphere(this.camera);
    this.postProcessing = createPostProcessing(this.renderer, this.scene, this.camera);

    this.markerManager = new MarkerManager(
      this.scene,
      this.camera,
      this.config.canvas,
      this.globe,
    );

    onProgress?.(100);
    onReady?.();

    this.animate();
  }

  private createFlatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    canvas.getContext("2d")!.fillRect(0, 0, 4, 4);
    return new THREE.CanvasTexture(canvas);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();

    if (this.postProcessing && this.atmosphere) {
      this.postProcessing.composer.render();
      this.renderer.autoClear = false;
      this.renderer.render(this.atmosphere.scene, this.camera);
      this.renderer.autoClear = true;
    }

    this.markerManager?.update();
  };

  private handleResize = (): void => {
    const parent = this.config.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing?.resize(width, height);
    this.markerManager?.resize(width, height);
  };

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.markerManager?.dispose();

    this.starField?.geometry.dispose();
    (this.starField?.material as THREE.PointsMaterial | undefined)?.dispose();
    this.globeGeometry?.dispose();
    this.globeMaterial?.dispose();
    this.contourGeometry?.dispose();
    this.contourMaterial?.map?.dispose();
    this.contourMaterial?.dispose();
    this.oceanColorMap?.dispose();

    this.atmosphere?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/globe/marker-manager.ts packages/frontend/src/globe/globe-scene.ts && git commit -m "add MarkerManager with CSS2DRenderer, back-face culling, click-to-select"
```

---

## Task 9: EventPopup Card

**Files:**
- Create: `packages/frontend/src/components/event-popup.tsx`

- [ ] **Step 1: Create EventPopup component**

Create `packages/frontend/src/components/event-popup.tsx`:

```tsx
import { useEventStore } from "../stores/event-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent } from "@terra/shared";
import { X } from "lucide-react";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMagnitude(event: NaturalEvent): string | null {
  if (!event.magnitude) return null;
  return `${event.magnitude.value} ${event.magnitude.unit}`;
}

export function EventPopup(): React.ReactElement | null {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const screenPosition = useEventStore((s) => s.selectedEventScreenPosition);
  const events = useEventStore((s) => s.events);
  const clearSelection = useEventStore((s) => s.clearSelection);

  if (!selectedEventId || !screenPosition) return null;

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  if (!selectedEvent) return null;

  const categoryMeta = CATEGORY_META[selectedEvent.category];
  const lastGeometry = selectedEvent.geometries[selectedEvent.geometries.length - 1];
  const magnitudeText = formatMagnitude(selectedEvent);

  return (
    <div
      className="fixed z-30 pointer-events-auto"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: "translate(-50%, -100%) translateY(-16px)",
      }}
    >
      <div className="w-[260px] rounded-lg border border-terra-border bg-terra-surface/90 backdrop-blur-md shadow-xl p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-terra-text leading-tight">
            {selectedEvent.title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={clearSelection}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0"
            style={{ borderColor: categoryMeta.color, color: categoryMeta.color }}
          >
            {categoryMeta.label}
          </Badge>
          <Badge
            variant={selectedEvent.status === "open" ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {selectedEvent.status === "open" ? "Active" : "Closed"}
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-terra-text-muted">
          {lastGeometry && (
            <p>
              {lastGeometry.coordinates[1]!.toFixed(2)}, {lastGeometry.coordinates[0]!.toFixed(2)}
            </p>
          )}
          {magnitudeText && <p>{magnitudeText}</p>}
          {lastGeometry && <p>{formatDate(lastGeometry.timestamp)}</p>}
          <p className="text-[10px]">Source: {selectedEvent.sourceAgency}</p>
        </div>

        {selectedEvent.sourceUrl && (
          <a
            href={selectedEvent.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-[10px] text-terra-cyan hover:underline"
          >
            View source
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/components/event-popup.tsx && git commit -m "add EventPopup card with frosted glass positioned at marker screen coordinates"
```

---

## Task 10: TopBar

**Files:**
- Create: `packages/frontend/src/components/top-bar.tsx`

- [ ] **Step 1: Create TopBar component**

Create `packages/frontend/src/components/top-bar.tsx`:

```tsx
import { Search, Settings, Sun } from "lucide-react";
import { useState } from "react";
import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { Input } from "./ui/input.js";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";
import { Switch } from "./ui/switch.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip.js";

export function TopBar(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const searchQuery = useEventStore((s) => s.searchQuery);
  const setSearchQuery = useEventStore((s) => s.setSearchQuery);
  const isPerformanceMode = useGlobeStore((s) => s.isPerformanceMode);
  const togglePerformanceMode = useGlobeStore((s) => s.togglePerformanceMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeEventCount = events.filter((e) => e.status === "open").length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 rounded-full border border-terra-border bg-terra-surface/80 backdrop-blur-md px-3 py-1.5 shadow-lg">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-terra-text-muted" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-[180px] rounded-full border-none bg-transparent pl-8 pr-3 text-xs text-terra-text placeholder:text-terra-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="h-4 w-px bg-terra-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2">
                <div className="h-2 w-2 rounded-full bg-terra-cyan animate-pulse" />
                <span className="text-xs text-terra-text-muted tabular-nums">
                  {activeEventCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{activeEventCount} active events</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-terra-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center px-1">
                <Sun className="h-3.5 w-3.5 text-terra-text-muted/40" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Solar activity (coming soon)</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-terra-border" />

          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                  <Settings className="h-3.5 w-3.5 text-terra-text-muted" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-[200px] rounded-lg border border-terra-border bg-terra-surface/90 backdrop-blur-md shadow-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-terra-text">Performance mode</span>
                  <Switch
                    checked={isPerformanceMode}
                    onCheckedChange={togglePerformanceMode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/components/top-bar.tsx && git commit -m "add TopBar with search input, event count badge, solar indicator stub, settings gear"
```

---

## Task 11: LayerPanel

**Files:**
- Create: `packages/frontend/src/components/layer-panel.tsx`

- [ ] **Step 1: Create LayerPanel component**

Create `packages/frontend/src/components/layer-panel.tsx`:

```tsx
import { useState } from "react";
import { ChevronRight, Layers } from "lucide-react";
import { useLayerStore } from "../stores/layer-store.js";
import { useEventStore } from "../stores/event-store.js";
import { LAYER_REGISTRY, CATEGORY_META } from "@terra/shared";
import type { LayerId, LayerMetadata, EventCategoryId } from "@terra/shared";
import { Switch } from "./ui/switch.js";
import { Button } from "./ui/button.js";
import { ScrollArea } from "./ui/scroll-area.js";
import { cn } from "@/lib/utils.js";

interface LayerGroupProps {
  title: string;
  layers: readonly LayerMetadata[];
  eventCountsByCategory: Map<EventCategoryId, number>;
}

function LayerGroup({ title, layers, eventCountsByCategory }: LayerGroupProps): React.ReactElement {
  const activeLayers = useLayerStore((s) => s.activeLayers);
  const toggleLayer = useLayerStore((s) => s.toggleLayer);

  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-terra-text-muted mb-2 px-1">
        {title}
      </h3>
      <div className="space-y-0.5">
        {layers.map((layer) => {
          const isActive = activeLayers.has(layer.id);
          const categoryColor = layer.group === "category"
            ? CATEGORY_META[layer.id as EventCategoryId]?.color
            : undefined;
          const eventCount = layer.group === "category"
            ? eventCountsByCategory.get(layer.id as EventCategoryId) ?? 0
            : undefined;

          return (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-white/5",
                isActive ? "text-terra-text" : "text-terra-text-muted",
              )}
            >
              <div className="flex items-center gap-2">
                {categoryColor && (
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive ? categoryColor : "transparent",
                      border: `1.5px solid ${categoryColor}`,
                    }}
                  />
                )}
                <span>{layer.label}</span>
                {eventCount !== undefined && eventCount > 0 && (
                  <span className="text-[10px] text-terra-text-muted tabular-nums">
                    {eventCount}
                  </span>
                )}
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={() => toggleLayer(layer.id)}
                className="scale-75 origin-right"
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getLayersByGroup(): {
  categoryLayers: LayerMetadata[];
  enhancementLayers: LayerMetadata[];
  spaceWeatherLayers: LayerMetadata[];
} {
  const categoryLayers: LayerMetadata[] = [];
  const enhancementLayers: LayerMetadata[] = [];
  const spaceWeatherLayers: LayerMetadata[] = [];

  for (const layer of Object.values(LAYER_REGISTRY)) {
    switch (layer.group) {
      case "category":
        categoryLayers.push(layer);
        break;
      case "enhancement":
        enhancementLayers.push(layer);
        break;
      case "spaceWeather":
        spaceWeatherLayers.push(layer);
        break;
    }
  }

  return { categoryLayers, enhancementLayers, spaceWeatherLayers };
}

export function LayerPanel(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const events = useEventStore((s) => s.events);

  const eventCountsByCategory = new Map<EventCategoryId, number>();
  for (const event of events) {
    const current = eventCountsByCategory.get(event.category) ?? 0;
    eventCountsByCategory.set(event.category, current + 1);
  }

  const { categoryLayers, enhancementLayers, spaceWeatherLayers } = getLayersByGroup();

  return (
    <div
      className={cn(
        "fixed right-4 top-16 z-20 transition-all duration-300",
        isExpanded ? "w-[240px]" : "w-10",
      )}
    >
      {!isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg border border-terra-border bg-terra-surface/80 backdrop-blur-md"
          onClick={() => setIsExpanded(true)}
        >
          <Layers className="h-4 w-4 text-terra-text-muted" />
        </Button>
      )}

      {isExpanded && (
        <div className="rounded-lg border border-terra-border bg-terra-surface/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-terra-border">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-terra-text-muted" />
              <span className="text-xs font-medium text-terra-text">Layers</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronRight className="h-3.5 w-3.5 text-terra-text-muted" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-2">
              <LayerGroup
                title="Event Categories"
                layers={categoryLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
              <LayerGroup
                title="Enhancements"
                layers={enhancementLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
              <LayerGroup
                title="Space Weather"
                layers={spaceWeatherLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/components/layer-panel.tsx && git commit -m "add LayerPanel with category, enhancement, space weather toggle groups"
```

---

## Task 12: EventFeed

**Files:**
- Create: `packages/frontend/src/components/event-feed.tsx`

- [ ] **Step 1: Create EventFeed component**

Create `packages/frontend/src/components/event-feed.tsx`:

```tsx
import { useMemo, useState } from "react";
import { ChevronLeft, Activity, Clock } from "lucide-react";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";
import { Button } from "./ui/button.js";
import { ScrollArea } from "./ui/scroll-area.js";
import { Badge } from "./ui/badge.js";
import { cn } from "@/lib/utils.js";

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "< 1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getMostActiveCategory(events: readonly NaturalEvent[]): string | null {
  if (events.length === 0) return null;

  const counts = new Map<EventCategoryId, number>();
  for (const event of events) {
    counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
  }

  let maxCategory: EventCategoryId | null = null;
  let maxCount = 0;
  for (const [category, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category;
    }
  }

  return maxCategory ? CATEGORY_META[maxCategory].label : null;
}

function getLastUpdatedTime(events: readonly NaturalEvent[]): string | null {
  if (events.length === 0) return null;

  let latestTimestamp = "";
  for (const event of events) {
    const lastGeometry = event.geometries[event.geometries.length - 1];
    if (lastGeometry && lastGeometry.timestamp > latestTimestamp) {
      latestTimestamp = lastGeometry.timestamp;
    }
  }

  return latestTimestamp ? formatRelativeTime(latestTimestamp) : null;
}

interface EventListItemProps {
  event: NaturalEvent;
  isSelected: boolean;
  onSelect: (eventId: string) => void;
}

function EventListItem({ event, isSelected, onSelect }: EventListItemProps): React.ReactElement {
  const categoryMeta = CATEGORY_META[event.category];
  const lastGeometry = event.geometries[event.geometries.length - 1];

  return (
    <button
      onClick={() => onSelect(event.id)}
      className={cn(
        "w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-white/5",
        isSelected && "bg-white/10 ring-1 ring-terra-cyan/30",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: categoryMeta.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-terra-text truncate">
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px]"
              style={{ color: categoryMeta.color }}
            >
              {categoryMeta.label}
            </span>
            {lastGeometry && (
              <span className="text-[10px] text-terra-text-muted">
                {formatRelativeTime(lastGeometry.timestamp)}
              </span>
            )}
          </div>
          {event.magnitude && (
            <span className="text-[10px] text-terra-text-muted">
              {event.magnitude.value} {event.magnitude.unit}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function EventFeed(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const events = useEventStore((s) => s.events);
  const searchQuery = useEventStore((s) => s.searchQuery);
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const activeLayers = useLayerStore((s) => s.activeLayers);

  const filteredEvents = useMemo(() => {
    let result = events.filter((e) => activeLayers.has(e.category));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          CATEGORY_META[e.category].label.toLowerCase().includes(query),
      );
    }

    return result;
  }, [events, activeLayers, searchQuery]);

  const activeCount = filteredEvents.filter((e) => e.status === "open").length;
  const mostActiveCategory = getMostActiveCategory(filteredEvents);
  const lastUpdated = getLastUpdatedTime(filteredEvents);

  return (
    <div
      className={cn(
        "fixed left-4 top-16 z-20 transition-all duration-300",
        isExpanded ? "w-[280px]" : "w-10",
      )}
    >
      {!isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg border border-terra-border bg-terra-surface/80 backdrop-blur-md"
          onClick={() => setIsExpanded(true)}
        >
          <Activity className="h-4 w-4 text-terra-text-muted" />
        </Button>
      )}

      {isExpanded && (
        <div className="rounded-lg border border-terra-border bg-terra-surface/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-terra-border">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-terra-text-muted" />
              <span className="text-xs font-medium text-terra-text">Events</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronLeft className="h-3.5 w-3.5 text-terra-text-muted" />
            </Button>
          </div>

          <div className="px-3 py-2 border-b border-terra-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-terra-text-muted">Active events</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {activeCount}
              </Badge>
            </div>
            {mostActiveCategory && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-terra-text-muted">Most active</span>
                <span className="text-[10px] text-terra-text">{mostActiveCategory}</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-terra-text-muted flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  Last updated
                </span>
                <span className="text-[10px] text-terra-text">{lastUpdated}</span>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="p-1.5 space-y-0.5">
              {filteredEvents.length === 0 && (
                <p className="text-xs text-terra-text-muted text-center py-8">
                  No events match active layers
                </p>
              )}
              {filteredEvents.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  isSelected={event.id === selectedEventId}
                  onSelect={selectEvent}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/components/event-feed.tsx && git commit -m "add EventFeed left sidebar with metrics, scrollable event list, click-to-select"
```

---

## Task 13: BottomBar

**Files:**
- Create: `packages/frontend/src/components/bottom-bar.tsx`

- [ ] **Step 1: Create BottomBar component**

Create `packages/frontend/src/components/bottom-bar.tsx`:

```tsx
import { X } from "lucide-react";
import { useLayerStore } from "../stores/layer-store.js";
import { LAYER_REGISTRY } from "@terra/shared";
import type { LayerId } from "@terra/shared";

export function BottomBar(): React.ReactElement {
  const activeLayers = useLayerStore((s) => s.activeLayers);
  const toggleLayer = useLayerStore((s) => s.toggleLayer);

  const activeLayerEntries = Array.from(activeLayers).map((id) => ({
    id,
    label: LAYER_REGISTRY[id]?.label ?? id,
  }));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 rounded-full border border-terra-border bg-terra-surface/80 backdrop-blur-md px-4 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeLayerEntries.length === 0 && (
            <span className="text-[10px] text-terra-text-muted">No active layers</span>
          )}
          {activeLayerEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => toggleLayer(entry.id as LayerId)}
              className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-terra-text hover:bg-white/10 transition-colors"
            >
              {entry.label}
              <X className="h-2.5 w-2.5 text-terra-text-muted" />
            </button>
          ))}
        </div>

        {activeLayerEntries.length > 0 && (
          <>
            <div className="h-3 w-px bg-terra-border" />
            <span className="text-[10px] text-terra-text-muted tabular-nums">
              --.----, --.----
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/components/bottom-bar.tsx && git commit -m "add BottomBar with active layer pills and coordinate readout stub"
```

---

## Task 14: Wire App Component

**Files:**
- Create: `packages/frontend/src/components/data-provider.tsx`
- Modify: `packages/frontend/src/app.tsx`

- [ ] **Step 1: Create DataProvider component**

Create `packages/frontend/src/components/data-provider.tsx`:

```tsx
import type { ReactNode } from "react";
import { useEonetPolling } from "../hooks/use-eonet-polling.js";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps): React.ReactElement {
  useEonetPolling();
  return <>{children}</>;
}
```

- [ ] **Step 2: Update app.tsx to compose all components and wire Escape key**

Replace `packages/frontend/src/app.tsx` with:

```tsx
import { useEffect, useCallback } from "react";
import { GlobeCanvas } from "./components/globe-canvas.js";
import { LoadingScreen } from "./components/loading-screen.js";
import { Vignette } from "./components/vignette.js";
import { DataProvider } from "./components/data-provider.js";
import { TopBar } from "./components/top-bar.js";
import { LayerPanel } from "./components/layer-panel.js";
import { EventFeed } from "./components/event-feed.js";
import { EventPopup } from "./components/event-popup.js";
import { BottomBar } from "./components/bottom-bar.js";
import { useEventStore } from "./stores/event-store.js";
import { useGlobeStore } from "./stores/globe-store.js";

export function App(): React.ReactElement {
  const isLoaded = useGlobeStore((s) => s.isLoaded);
  const clearSelection = useEventStore((s) => s.clearSelection);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection();
      }
    },
    [clearSelection],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <DataProvider>
      <div className="relative w-full h-full">
        <GlobeCanvas />
        <Vignette />
        <LoadingScreen />
        {isLoaded && (
          <>
            <TopBar />
            <EventFeed />
            <LayerPanel />
            <EventPopup />
            <BottomBar />
          </>
        )}
      </div>
    </DataProvider>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint -w packages/frontend
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/freddy/Documents/mr-worldwide && git add packages/frontend/src/components/data-provider.tsx packages/frontend/src/app.tsx && git commit -m "wire all ui components into app shell with data provider and escape key handling"
```

---

## Task 15: Verification

**Files:** none (verification only)

- [ ] **Step 1: Run lint across all packages**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm run lint
```

Expected: no TypeScript errors in any package.

- [ ] **Step 2: Run tests across all packages**

```bash
cd /Users/freddy/Documents/mr-worldwide && npm test
```

Expected: all tests pass across shared, frontend, and backend packages. The output should show passing tests for:
- `packages/frontend/src/stores/__tests__/event-store.test.ts`
- `packages/frontend/src/stores/__tests__/globe-store.test.ts`
- `packages/frontend/src/stores/__tests__/layer-store.test.ts`
- `packages/frontend/src/stores/__tests__/data-store.test.ts`
- `packages/frontend/src/hooks/__tests__/use-eonet-polling.test.ts`
- `packages/backend/src/routes/__tests__/events.test.ts`
- `packages/backend/src/services/__tests__/cache.test.ts`
- `packages/backend/src/services/__tests__/eonet-client.test.ts`

- [ ] **Step 3: Fix any issues**

If lint or tests fail, fix the issues and re-run. Common issues to check:
- Unused imports (the `noUnusedLocals` compiler option is strict)
- Missing `.js` extensions in import paths
- Type mismatches from store changes

- [ ] **Step 4: Final commit if fixes were needed**

Only if Step 3 required fixes:

```bash
cd /Users/freddy/Documents/mr-worldwide && git add -u && git commit -m "fix lint and test issues from phase 1 integration"
```
