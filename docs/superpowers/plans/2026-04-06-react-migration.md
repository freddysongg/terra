# TERRA React Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the TERRA globe prototype from a single HTML file into a production React + Fastify monorepo with modular Three.js integration.

**Architecture:** npm workspaces monorepo with three packages — `frontend` (Vite + React + Three.js globe), `backend` (Fastify proxy/cache), `shared` (TypeScript types and constants). The Three.js globe remains imperative code wrapped in a React shell via `useRef` + `useEffect`. Zustand bridges React UI state to the imperative scene.

**Tech Stack:** npm workspaces, Vite, React 19, TypeScript, Three.js, Zustand, Tailwind CSS, shadcn/ui, Fastify, Vitest, Playwright

---

## File Map

### `packages/shared/`

| File | Responsibility |
|---|---|
| `src/types/events.ts` | EONET event, category, geometry, magnitude types |
| `src/types/layers.ts` | Layer ID literal union, layer metadata type |
| `src/types/api.ts` | API response envelope, error response, source literal union |
| `src/types/space-weather.ts` | DONKI solar flare, CME, geomagnetic storm types |
| `src/types/fires.ts` | FIRMS fire hotspot point type |
| `src/types/earthquakes.ts` | USGS earthquake normalized type |
| `src/constants/categories.ts` | Category ID → color, label, icon mappings |
| `src/constants/layers.ts` | Layer ID → metadata mappings |
| `src/index.ts` | Re-exports all types and constants |

### `packages/frontend/`

| File | Responsibility |
|---|---|
| `src/globe/shaders/globe-surface.vert` | Globe surface vertex shader |
| `src/globe/shaders/globe-surface.frag` | Globe surface fragment shader (land, ocean, coastlines, city lights) |
| `src/globe/shaders/atmosphere.vert` | Atmosphere vertex shader |
| `src/globe/shaders/atmosphere.frag` | Atmosphere fragment shader (volumetric glow) |
| `src/globe/textures/ocean-color.ts` | Procedural ocean color map generator |
| `src/globe/textures/contour-lines.ts` | Procedural contour line texture generator |
| `src/globe/textures/fallback-night.ts` | Procedural city lights fallback texture |
| `src/globe/textures/texture-loader.ts` | Cascade CDN texture loader with fallback chain |
| `src/globe/stars.ts` | Star field particle system |
| `src/globe/atmosphere.ts` | Atmosphere mesh + separate scene for bloom bypass |
| `src/globe/post-processing.ts` | EffectComposer + UnrealBloomPass pipeline |
| `src/globe/globe-scene.ts` | Scene orchestrator — composes all modules, owns animation loop |
| `src/stores/globe-store.ts` | Globe loading and interaction state |
| `src/stores/layer-store.ts` | Layer visibility toggles |
| `src/stores/event-store.ts` | Event data, selection, filters |
| `src/components/globe-canvas.tsx` | Canvas ref wrapper — mounts/disposes GlobeScene |
| `src/components/loading-screen.tsx` | Full-screen loading overlay with progress bar |
| `src/app.tsx` | Root component composing all UI |

### `packages/backend/`

| File | Responsibility |
|---|---|
| `src/index.ts` | Fastify server entry, plugin registration |
| `src/plugins/cors.ts` | CORS plugin config |
| `src/plugins/rate-limit.ts` | Rate limiting plugin config |
| `src/services/cache.ts` | In-memory TTL cache |
| `src/services/eonet-client.ts` | NASA EONET API client + normalization |
| `src/routes/events.ts` | `/api/events`, `/api/events/:id`, `/api/categories` routes |
| `src/routes/health.ts` | `/health` route |

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/frontend/package.json`
- Create: `packages/backend/package.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create root package.json with workspace config**

```json
{
  "name": "mr-worldwide",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:frontend": "npm run dev -w packages/frontend",
    "dev:backend": "npm run dev -w packages/backend",
    "build": "npm run build -w packages/shared && npm run build -w packages/frontend && npm run build -w packages/backend",
    "test": "npm run test -w packages/shared -w packages/frontend -w packages/backend",
    "lint": "npm run lint -w packages/shared -w packages/frontend -w packages/backend"
  }
}
```

- [ ] **Step 2: Create base TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 3: Create shared package**

Create `packages/shared/package.json`:

```json
{
  "name": "@terra/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

Create `packages/shared/src/index.ts`:

```typescript
export {};
```

- [ ] **Step 4: Create frontend package**

Create `packages/frontend/package.json`:

```json
{
  "name": "@terra/frontend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@terra/shared": "*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.170.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.170.0",
    "@vitejs/plugin-react": "^4.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-glsl": "^1.3.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 5: Create backend package**

Create `packages/backend/package.json`:

```json
{
  "name": "@terra/backend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@terra/shared": "*",
    "@fastify/cors": "^11.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 6: Install dependencies and verify workspace resolution**

Run: `npm install`

Expected: Clean install with symlinked workspace packages. Verify `node_modules/@terra/shared` exists and is a symlink.

Run: `ls -la node_modules/@terra/`

Expected: `shared -> ../../packages/shared`

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.base.json packages/shared packages/frontend/package.json packages/backend/package.json
git commit -m "add: monorepo scaffolding with npm workspaces"
```

---

## Task 2: Shared Types Package

**Files:**
- Create: `packages/shared/src/types/events.ts`
- Create: `packages/shared/src/types/layers.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/types/space-weather.ts`
- Create: `packages/shared/src/types/fires.ts`
- Create: `packages/shared/src/types/earthquakes.ts`
- Create: `packages/shared/src/constants/categories.ts`
- Create: `packages/shared/src/constants/layers.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create event types**

Create `packages/shared/src/types/events.ts`:

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
```

- [ ] **Step 2: Create API response types**

Create `packages/shared/src/types/api.ts`:

```typescript
export type ApiSource = "eonet" | "firms" | "usgs" | "donki" | "gibs";

export type ApiErrorCode =
  | "UPSTREAM_UNAVAILABLE"
  | "RATE_LIMITED"
  | "PARSE_FAILED"
  | "TIMEOUT";

export interface ApiSuccessResponse<T> {
  status: "ok";
  data: T;
  cached: boolean;
}

export interface ApiErrorResponse {
  status: "error";
  code: ApiErrorCode;
  source: ApiSource;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

- [ ] **Step 3: Create layer types**

Create `packages/shared/src/types/layers.ts`:

```typescript
import type { EventCategoryId } from "./events.js";

export type EnhancementLayerId = "fireDensity" | "seismicDensity";

export type SpaceWeatherLayerId = "spaceWeather";

export type LayerId = EventCategoryId | EnhancementLayerId | SpaceWeatherLayerId;

interface LayerMetadata {
  id: LayerId;
  label: string;
  group: "category" | "enhancement" | "spaceWeather";
}

export type { LayerMetadata };
```

- [ ] **Step 4: Create fire, earthquake, and space weather types**

Create `packages/shared/src/types/fires.ts`:

```typescript
export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: "low" | "nominal" | "high";
  acquisitionTimestamp: string;
}
```

Create `packages/shared/src/types/earthquakes.ts`:

```typescript
export interface Earthquake {
  id: string;
  title: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  detailUrl: string;
}
```

Create `packages/shared/src/types/space-weather.ts`:

```typescript
export interface SolarFlare {
  id: string;
  classType: string;
  beginTime: string;
  peakTime: string | null;
  endTime: string | null;
  sourceLocation: string | null;
}

export interface GeomagneticStorm {
  id: string;
  startTime: string;
  kpIndex: number;
}

export interface SpaceWeatherSummary {
  solarFlares: readonly SolarFlare[];
  geomagneticStorms: readonly GeomagneticStorm[];
}
```

- [ ] **Step 5: Create category constants**

Create `packages/shared/src/constants/categories.ts`:

```typescript
import type { EventCategoryId } from "../types/events.js";

interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_META: Record<EventCategoryId, CategoryMeta> = {
  drought: { label: "Drought", color: "#d4a574" },
  dustHaze: { label: "Dust & Haze", color: "#c4a882" },
  earthquakes: { label: "Earthquakes", color: "#ffd700" },
  floods: { label: "Floods", color: "#4a90d9" },
  landslides: { label: "Landslides", color: "#8b6914" },
  manmade: { label: "Manmade", color: "#ff6b6b" },
  seaLakeIce: { label: "Sea & Lake Ice", color: "#a8d8ea" },
  severeStorms: { label: "Severe Storms", color: "#6b8dd6" },
  snow: { label: "Snow", color: "#e8e8f0" },
  tempExtremes: { label: "Temperature Extremes", color: "#ff4500" },
  volcanoes: { label: "Volcanoes", color: "#dc143c" },
  waterColor: { label: "Water Color", color: "#20b2aa" },
  wildfires: { label: "Wildfires", color: "#ff8c00" },
};
```

- [ ] **Step 6: Create layer constants**

Create `packages/shared/src/constants/layers.ts`:

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
  spaceWeather: { id: "spaceWeather", label: "Space Weather", group: "spaceWeather" },
};
```

- [ ] **Step 7: Update index.ts with re-exports**

Update `packages/shared/src/index.ts`:

```typescript
export type {
  EventCategoryId,
  EventStatus,
  NaturalEvent,
  EventCategory,
} from "./types/events.js";

export type {
  ApiSource,
  ApiErrorCode,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
} from "./types/api.js";

export type {
  LayerId,
  EnhancementLayerId,
  SpaceWeatherLayerId,
  LayerMetadata,
} from "./types/layers.js";

export type { FireHotspot } from "./types/fires.js";
export type { Earthquake } from "./types/earthquakes.js";
export type {
  SolarFlare,
  GeomagneticStorm,
  SpaceWeatherSummary,
} from "./types/space-weather.js";

export { CATEGORY_META } from "./constants/categories.js";
export { LAYER_REGISTRY } from "./constants/layers.js";
```

- [ ] **Step 8: Type check**

Run: `cd packages/shared && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/
git commit -m "add: shared types and constants for events, layers, api responses"
```

---

## Task 3: Frontend Scaffolding (Vite + React + Tailwind)

**Files:**
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/frontend/tsconfig.app.json`
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/app.tsx`
- Create: `packages/frontend/src/index.css`
- Create: `packages/frontend/src/vite-env.d.ts`
- Create: `packages/frontend/postcss.config.js`

- [ ] **Step 1: Create TypeScript configs**

Create `packages/frontend/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" }
  ]
}
```

Create `packages/frontend/tsconfig.app.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create Vite config with GLSL plugin**

Create `packages/frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [react(), glsl()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/health": "http://localhost:3001",
    },
  },
});
```

- [ ] **Step 3: Create Vite env declaration**

Create `packages/frontend/src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

declare module "*.vert" {
  const shader: string;
  export default shader;
}

declare module "*.frag" {
  const shader: string;
  export default shader;
}
```

- [ ] **Step 4: Create Tailwind v4 CSS**

Create `packages/frontend/src/index.css`:

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
}
```

Create `packages/frontend/postcss.config.js`:

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create HTML entry point**

Create `packages/frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TERRA</title>
  </head>
  <body class="bg-terra-bg text-terra-text overflow-hidden w-screen h-screen">
    <div id="root" class="w-full h-full"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create React entry and shell app**

Create `packages/frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `packages/frontend/src/app.tsx`:

```tsx
export function App(): React.ReactElement {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center justify-center text-terra-text-muted">
        TERRA — globe will mount here
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify frontend builds and type-checks**

Run: `cd packages/frontend && npx tsc -b`

Expected: No type errors.

Run: `cd packages/frontend && npx vite build`

Expected: Build succeeds, output in `dist/`.

- [ ] **Step 8: Commit**

```bash
git add packages/frontend/
git commit -m "add: frontend scaffolding with vite, react, tailwind, glsl plugin"
```

---

## Task 4: Globe Shaders

Port the inline GLSL template strings from `index.html` into standalone `.vert` and `.frag` files.

**Files:**
- Create: `packages/frontend/src/globe/shaders/globe-surface.vert`
- Create: `packages/frontend/src/globe/shaders/globe-surface.frag`
- Create: `packages/frontend/src/globe/shaders/atmosphere.vert`
- Create: `packages/frontend/src/globe/shaders/atmosphere.frag`

**Reference:** `index.html` lines 296–366 (globe shaders), lines 432–490 (atmosphere shader)

- [ ] **Step 1: Create globe surface vertex shader**

Create `packages/frontend/src/globe/shaders/globe-surface.vert`:

```glsl
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

- [ ] **Step 2: Create globe surface fragment shader**

Create `packages/frontend/src/globe/shaders/globe-surface.frag`:

```glsl
uniform sampler2D uNightMap;
uniform sampler2D uTopoMap;
uniform sampler2D uOceanMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vec4 tex = texture2D(uNightMap, vUv);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float topo = texture2D(uTopoMap, vUv).r;

  // land/ocean threshold
  float isLand = smoothstep(0.004, 0.02, topo);

  // ocean: dark navy from pre-painted map
  vec3 oceanColor = texture2D(uOceanMap, vUv).rgb;

  // land: very dark navy, barely distinguishable from ocean
  vec3 landBase = vec3(0.014, 0.025, 0.060);
  vec3 landMid  = vec3(0.018, 0.030, 0.072);
  vec3 landHigh = vec3(0.024, 0.038, 0.085);
  float elev = smoothstep(0.02, 0.25, topo);
  float mount = smoothstep(0.15, 0.55, topo);
  vec3 landColor = mix(landBase, landMid, elev);
  landColor = mix(landColor, landHigh, mount);

  vec3 base = mix(landColor, oceanColor, isLand);

  // coastline: thin subtle cyan edge
  float coastInner = smoothstep(0.006, 0.012, topo) * (1.0 - smoothstep(0.014, 0.020, topo));
  float coastOuter = smoothstep(0.003, 0.007, topo) * (1.0 - smoothstep(0.016, 0.025, topo));
  vec3 coastColor = vec3(0.25, 0.55, 0.78);
  base += coastColor * coastInner * 0.07;
  base += coastColor * coastOuter * 0.03;

  // city lights: warm golden-white
  float isCity = smoothstep(0.04, 0.14, lum);
  float cityBright = mix(0.4, 1.0, smoothstep(0.08, 0.5, lum));
  vec3 cityWarm = vec3(1.0, 0.82, 0.50);
  vec3 cityCool = vec3(1.0, 0.90, 0.72);
  vec3 cityTint = mix(cityWarm, cityCool, smoothstep(0.1, 0.4, lum));
  vec3 cityColor = cityTint * isCity * cityBright * 1.6;

  // subtle rim lighting for depth
  vec3 viewDir = normalize(-vViewPos);
  float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
  base += vec3(0.008, 0.014, 0.028) * pow(rim, 2.5);

  gl_FragColor = vec4(base + cityColor, 1.0);
}
```

- [ ] **Step 3: Create atmosphere vertex shader**

Create `packages/frontend/src/globe/shaders/atmosphere.vert`:

```glsl
varying vec3 vWorldPos;

void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
```

- [ ] **Step 4: Create atmosphere fragment shader**

Create `packages/frontend/src/globe/shaders/atmosphere.frag`:

```glsl
uniform vec3 uCamPos;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform float uGlobeR;
uniform float uAtmosR;
uniform float uIntensity;
uniform float uFalloff;
varying vec3 vWorldPos;

void main() {
  vec3 rayDir = normalize(vWorldPos - uCamPos);
  vec3 ro = uCamPos;

  float b = dot(ro, rayDir);
  float c = dot(ro, ro);
  float closestDist = sqrt(max(c - b * b, 0.0));

  float disc = b * b - (c - uGlobeR * uGlobeR);
  if (disc > 0.0 && -b - sqrt(disc) > 0.0) discard;

  float edgeDist = closestDist - uGlobeR;
  float thickness = uAtmosR - uGlobeR;
  float t = clamp(edgeDist / thickness, 0.0, 1.0);

  float glow = exp(-t * uFalloff) * (1.0 - t * t);
  glow *= uIntensity;

  vec3 col = mix(uColorInner, uColorOuter, t);

  gl_FragColor = vec4(col, glow);
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/globe/shaders/
git commit -m "add: globe surface and atmosphere glsl shaders"
```

---

## Task 5: Globe Procedural Textures

Port the procedural texture generators from `index.html` into TypeScript modules.

**Files:**
- Create: `packages/frontend/src/globe/textures/ocean-color.ts`
- Create: `packages/frontend/src/globe/textures/contour-lines.ts`
- Create: `packages/frontend/src/globe/textures/fallback-night.ts`
- Create: `packages/frontend/src/globe/textures/texture-loader.ts`

**Reference:** `index.html` lines 95–292 (textures), lines 526–551 (fallback night)

- [ ] **Step 1: Create ocean color map generator**

Create `packages/frontend/src/globe/textures/ocean-color.ts`:

```typescript
import * as THREE from "three";

const PALETTE: readonly [number, number, number][] = [
  [7, 12, 24],
  [10, 17, 32],
  [14, 22, 40],
  [18, 28, 48],
  [22, 34, 55],
];

function lerp3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * clamped,
    a[1] + (b[1] - a[1]) * clamped,
    a[2] + (b[2] - a[2]) * clamped,
  ];
}

function samplePalette(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (PALETTE.length - 1);
  const lo = Math.floor(idx);
  return lerp3(
    PALETTE[lo] as [number, number, number],
    PALETTE[Math.min(lo + 1, PALETTE.length - 1)] as [number, number, number],
    idx - lo,
  );
}

function buildNoiseGrid(size: number): Float32Array {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
  return grid;
}

function sampleNoise(
  grid: Float32Array,
  gridSize: number,
  u: number,
  v: number,
): number {
  const x = (((u % 1) + 1) % 1) * gridSize;
  const y = (((v % 1) + 1) % 1) * gridSize;
  const ix = Math.floor(x) % gridSize;
  const iy = Math.floor(y) % gridSize;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const nx = (ix + 1) % gridSize;
  const ny = (iy + 1) % gridSize;
  return (
    grid[iy * gridSize + ix]! * (1 - sx) * (1 - sy) +
    grid[iy * gridSize + nx]! * sx * (1 - sy) +
    grid[ny * gridSize + ix]! * (1 - sx) * sy +
    grid[ny * gridSize + nx]! * sx * sy
  );
}

function greatCircleDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  let dLon = Math.abs(lon1 - lon2);
  if (dLon > 180) dLon = 360 - dLon;
  return Math.sqrt(dLon * dLon + (lat1 - lat2) * (lat1 - lat2));
}

function basinInfluence(
  noiseGrid: Float32Array,
  noiseSize: number,
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
  radius: number,
  u: number,
  v: number,
): number {
  const warpLon = lon + (sampleNoise(noiseGrid, noiseSize, u * 1.5 + 0.7, v * 1.5 + 3.1) - 0.5) * 25;
  const warpLat = lat + (sampleNoise(noiseGrid, noiseSize, u * 1.5 + 7.2, v * 1.5 + 1.4) - 0.5) * 20;
  const d = greatCircleDistance(warpLon, warpLat, centerLon, centerLat);
  const t = Math.max(0, 1 - d / radius);
  return t * t * (3 - 2 * t);
}

export function createOceanColorMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(W, H);
  const pixels = imgData.data;

  const noiseSize = 64;
  const noiseGrid = buildNoiseGrid(noiseSize);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const v = py / H;
      const lon = u * 360 - 180;
      const lat = 90 - v * 180;

      let baseT = 0.15 + (1 - Math.abs(lat) / 90) * 0.3;

      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, -155, -5, 100, u, v) * -0.12;
      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, -40, 45, 60, u, v) * 0.15;
      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, -65, 18, 45, u, v) * 0.2;
      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, 72, -10, 70, u, v) * 0.1;
      baseT += Math.max(0, (-lat - 50) / 20) * -0.15;

      const n1 = sampleNoise(noiseGrid, noiseSize, u * 3, v * 3);
      const n2 = sampleNoise(noiseGrid, noiseSize, u * 5 + 5.3, v * 5 + 2.7);
      baseT += (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.04;

      const col = samplePalette(baseT);
      const i = (py * W + px) * 4;
      pixels[i] = col[0];
      pixels[i + 1] = col[1];
      pixels[i + 2] = col[2];
      pixels[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
```

- [ ] **Step 2: Create contour lines texture**

Create `packages/frontend/src/globe/textures/contour-lines.ts`:

```typescript
import * as THREE from "three";

const CONTOUR_WIDTH = 4096;
const CONTOUR_HEIGHT = 2048;
const CONTOUR_COLOR = "rgba(55,130,175,";

function lonLatToXY(
  lon: number,
  lat: number,
): [x: number, y: number] {
  return [
    ((lon + 180) / 360) * CONTOUR_WIDTH,
    ((90 - lat) / 180) * CONTOUR_HEIGHT,
  ];
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: readonly [number, number][],
  lineWidth: number,
  alpha: number,
): void {
  if (points.length < 2) return;
  ctx.strokeStyle = `${CONTOUR_COLOR}${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  const start = lonLatToXY(points[0]![0], points[0]![1]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 1; i < points.length; i++) {
    const prev = lonLatToXY(points[i - 1]![0], points[i - 1]![1]);
    const curr = lonLatToXY(points[i]![0], points[i]![1]);
    ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2);
  }
  const last = lonLatToXY(points[points.length - 1]![0], points[points.length - 1]![1]);
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  centerLon: number,
  centerLat: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  alpha: number,
  lineWidth: number,
): void {
  const [x, y] = lonLatToXY(centerLon, centerLat);
  ctx.strokeStyle = `${CONTOUR_COLOR}${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(
    x, y,
    radiusX * (CONTOUR_WIDTH / 360),
    radiusY * (CONTOUR_HEIGHT / 180),
    rotation, 0, Math.PI * 2,
  );
  ctx.stroke();
}

export function createContourTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CONTOUR_WIDTH;
  canvas.height = CONTOUR_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // north atlantic
  drawEllipse(ctx, -35, 55, 10, 5, 0.3, 0.18, 1.8);
  drawEllipse(ctx, -33, 53, 18, 9, 0.35, 0.13, 1.4);
  drawEllipse(ctx, -30, 50, 28, 14, 0.4, 0.09, 1.1);
  drawEllipse(ctx, -27, 47, 38, 19, 0.45, 0.06, 0.8);

  // south pacific
  drawCurve(ctx, [[-180,-30],[-165,-26],[-148,-28],[-130,-24],[-112,-27],[-95,-23],[-80,-26]], 2.2, 0.18);
  drawCurve(ctx, [[-178,-36],[-160,-33],[-142,-36],[-124,-32],[-106,-35],[-90,-31]], 1.8, 0.14);
  drawCurve(ctx, [[-175,-42],[-158,-39],[-140,-42],[-122,-38],[-104,-41],[-88,-37]], 1.4, 0.10);
  drawCurve(ctx, [[-172,-48],[-155,-45],[-138,-48],[-120,-44],[-102,-47]], 1.1, 0.07);

  // south atlantic spiral
  for (let ring = 0; ring < 5; ring++) {
    const r = 5 + ring * 4.5;
    const alpha = 0.18 - ring * 0.03;
    const points: [number, number][] = [];
    for (let t = 0; t <= Math.PI * 1.8; t += 0.15) {
      const w = Math.sin(t * 2.5) * 1.5;
      points.push([
        -20 + (r + w) * Math.cos(t + ring * 0.4),
        -30 + (r * 0.5 + w * 0.3) * Math.sin(t + ring * 0.4),
      ]);
    }
    drawCurve(ctx, points, 1.8 - ring * 0.18, alpha);
  }

  // southern africa
  drawCurve(ctx, [[10,-38],[20,-34],[32,-32],[44,-30],[54,-33],[62,-37],[72,-40]], 1.8, 0.16);
  drawCurve(ctx, [[8,-44],[22,-40],[36,-38],[50,-36],[60,-40],[70,-44]], 1.4, 0.12);
  drawCurve(ctx, [[12,-50],[28,-46],[44,-44],[58,-42],[68,-46]], 1.1, 0.08);

  // indian ocean
  drawCurve(ctx, [[55,-14],[68,-18],[80,-14],[92,-18],[104,-14],[116,-18]], 1.6, 0.14);
  drawCurve(ctx, [[50,-24],[68,-20],[84,-24],[100,-20],[116,-24]], 1.3, 0.10);

  // north pacific
  drawCurve(ctx, [[140,34],[158,38],[175,34],[192,38],[210,34]], 1.4, 0.12);
  drawCurve(ctx, [[145,28],[162,32],[178,28],[195,32]], 1.1, 0.08);

  // west pacific spiral
  drawEllipse(ctx, 160, 20, 10, 5, 0.3, 0.13, 1.5);
  drawEllipse(ctx, 160, 20, 16, 8, 0.35, 0.09, 1.1);

  // southern ocean
  drawCurve(ctx, [[-180,-56],[-140,-52],[-100,-56],[-60,-52],[-20,-56],[20,-52],[60,-56],[100,-52],[140,-56],[180,-52]], 2.0, 0.16);
  drawCurve(ctx, [[-180,-63],[-130,-59],[-80,-63],[-30,-59],[20,-63],[70,-59],[120,-63],[170,-59]], 1.6, 0.11);
  drawCurve(ctx, [[-180,-70],[-120,-66],[-60,-70],[0,-66],[60,-70],[120,-66],[180,-70]], 1.1, 0.07);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

- [ ] **Step 3: Create fallback night texture**

Create `packages/frontend/src/globe/textures/fallback-night.ts`:

```typescript
import * as THREE from "three";

const CITY_COORDS: readonly [longitude: number, latitude: number][] = [
  [-74, 40.7], [-87.6, 41.9], [-118.2, 34.1], [-122.4, 37.8], [-95.4, 29.8],
  [-80.2, 25.8], [-77, 38.9], [-99.1, 19.4], [-43.2, -22.9], [-58.4, -34.6],
  [-3.7, 40.4], [2.3, 48.9], [-0.1, 51.5], [13.4, 52.5], [12.5, 41.9],
  [37.6, 55.8], [28.9, 41], [55.3, 25.3], [72.9, 19], [77.2, 28.6],
  [100.5, 13.8], [103.9, 1.4], [114.2, 22.3], [121.5, 31.2], [116.4, 39.9],
  [126.9, 37.6], [139.7, 35.7], [151.2, -33.9], [3.4, 6.5], [28.1, -26.2],
];

export function createFallbackNightTexture(): THREE.CanvasTexture {
  const W = 4096;
  const H = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#020406";
  ctx.fillRect(0, 0, W, H);

  for (const [lon, lat] of CITY_COORDS) {
    const cx = ((lon + 180) / 360) * W;
    const cy = ((90 - lat) / 180) * H;
    const dotCount = 20 + Math.floor(Math.random() * 20);
    for (let i = 0; i < dotCount; i++) {
      const dx = cx + (Math.random() - 0.5) * 10;
      const dy = cy + (Math.random() - 0.5) * 10;
      ctx.beginPath();
      ctx.arc(dx, dy, 0.3 + Math.random(), 0, Math.PI * 2);
      const g = 185 + Math.floor(Math.random() * 40);
      const b = 100 + Math.floor(Math.random() * 40);
      const a = 0.2 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(255,${g},${b},${a})`;
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

- [ ] **Step 4: Create cascade texture loader**

Create `packages/frontend/src/globe/textures/texture-loader.ts`:

```typescript
import * as THREE from "three";

const NIGHT_URLS: readonly string[] = [
  "https://cdn.jsdelivr.net/npm/three-globe@2.34.1/example/img/earth-night.jpg",
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-night.jpg",
  "https://cdn.jsdelivr.net/npm/three-globe@2.24.13/example/img/earth-night.jpg",
  "https://unpkg.com/three-globe@2.34.1/example/img/earth-night.jpg",
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
];

const TOPO_URLS: readonly string[] = [
  "https://cdn.jsdelivr.net/npm/three-globe@2.34.1/example/img/earth-topology.png",
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-topology.png",
];

async function cascadeLoad(urls: readonly string[]): Promise<THREE.Texture | null> {
  const loader = new THREE.TextureLoader();
  for (const url of urls) {
    try {
      return await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    } catch {
      /* try next URL */
    }
  }
  return null;
}

interface LoadedTextures {
  night: THREE.Texture | null;
  topo: THREE.Texture | null;
}

export async function loadGlobeTextures(
  onProgress?: (progress: number) => void,
): Promise<LoadedTextures> {
  onProgress?.(10);
  const [night, topo] = await Promise.all([
    cascadeLoad(NIGHT_URLS),
    cascadeLoad(TOPO_URLS),
  ]);
  onProgress?.(60);
  return { night, topo };
}

export function configureTexture(
  texture: THREE.Texture,
  maxAnisotropy: number,
  colorSpace: THREE.ColorSpace,
): void {
  texture.colorSpace = colorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
}
```

- [ ] **Step 5: Verify type check**

Run: `cd packages/frontend && npx tsc -b`

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/globe/textures/ packages/frontend/src/globe/shaders/
git commit -m "add: procedural textures and cascade texture loader"
```

---

## Task 6: Globe Scene Modules (Stars, Atmosphere, Post-Processing)

**Files:**
- Create: `packages/frontend/src/globe/stars.ts`
- Create: `packages/frontend/src/globe/atmosphere.ts`
- Create: `packages/frontend/src/globe/post-processing.ts`

**Reference:** `index.html` lines 78–92 (stars), 429–491 (atmosphere), 496–504 (bloom)

- [ ] **Step 1: Create star field module**

Create `packages/frontend/src/globe/stars.ts`:

```typescript
import * as THREE from "three";

const STAR_COUNT = 1200;
const MIN_DISTANCE = 40;
const MAX_DISTANCE = 70;

export function createStarField(): THREE.Points {
  const positions = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const dist = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
    positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = dist * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.25,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}
```

- [ ] **Step 2: Create atmosphere module**

Create `packages/frontend/src/globe/atmosphere.ts`:

```typescript
import * as THREE from "three";
import atmosphereVert from "./shaders/atmosphere.vert";
import atmosphereFrag from "./shaders/atmosphere.frag";

const ATMOSPHERE_RADIUS = 2.2;

interface AtmosphereResources {
  scene: THREE.Scene;
  material: THREE.ShaderMaterial;
  dispose: () => void;
}

export function createAtmosphere(camera: THREE.PerspectiveCamera): AtmosphereResources {
  const scene = new THREE.Scene();

  const material = new THREE.ShaderMaterial({
    vertexShader: atmosphereVert,
    fragmentShader: atmosphereFrag,
    uniforms: {
      uCamPos: { value: camera.position },
      uColorInner: { value: new THREE.Vector3(0.15, 0.45, 0.85) },
      uColorOuter: { value: new THREE.Vector3(0.06, 0.18, 0.42) },
      uGlobeR: { value: 1.0 },
      uAtmosR: { value: ATMOSPHERE_RADIUS },
      uIntensity: { value: 0.56 },
      uFalloff: { value: 3.5 },
    },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const geometry = new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 64);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return {
    scene,
    material,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
```

- [ ] **Step 3: Create post-processing module**

Create `packages/frontend/src/globe/post-processing.ts`:

```typescript
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BLOOM_STRENGTH = 0.55;
const BLOOM_RADIUS = 0.3;
const BLOOM_THRESHOLD = 0.5;

interface PostProcessingPipeline {
  composer: EffectComposer;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostProcessingPipeline {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    ),
  );
  composer.addPass(new OutputPass());

  return {
    composer,
    resize(width: number, height: number): void {
      composer.setSize(width, height);
    },
    dispose(): void {
      composer.dispose();
    },
  };
}
```

- [ ] **Step 4: Verify type check**

Run: `cd packages/frontend && npx tsc -b`

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/globe/stars.ts packages/frontend/src/globe/atmosphere.ts packages/frontend/src/globe/post-processing.ts
git commit -m "add: stars, atmosphere, post-processing globe modules"
```

---

## Task 7: Globe Scene Orchestrator

The central module that composes all globe sub-modules and owns the animation loop.

**Files:**
- Create: `packages/frontend/src/globe/globe-scene.ts`

**Reference:** `index.html` lines 50–76 (scene/camera/renderer/controls), 376–523 (init + animate)

- [ ] **Step 1: Create the GlobeScene class**

Create `packages/frontend/src/globe/globe-scene.ts`:

```typescript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStarField } from "./stars.js";
import { createAtmosphere } from "./atmosphere.js";
import { createPostProcessing } from "./post-processing.js";
import { createOceanColorMap } from "./textures/ocean-color.js";
import { createContourTexture } from "./textures/contour-lines.js";
import { createFallbackNightTexture } from "./textures/fallback-night.js";
import { loadGlobeTextures, configureTexture } from "./textures/texture-loader.js";
import globeSurfaceVert from "./shaders/globe-surface.vert";
import globeSurfaceFrag from "./shaders/globe-surface.frag";

const BACKGROUND_COLOR = 0x040a16;
const AUTO_ROTATE_SPEED = 0.25;
const AUTO_ROTATE_RESUME_DELAY = 3000;
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
  private autoRotateTimer: ReturnType<typeof setTimeout> | null = null;

  private atmosphere: ReturnType<typeof createAtmosphere> | null = null;
  private postProcessing: ReturnType<typeof createPostProcessing> | null = null;
  private globe: THREE.Mesh | null = null;
  private globeMaterial: THREE.ShaderMaterial | null = null;
  private contourMesh: THREE.Mesh | null = null;

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

    this.scene.add(createStarField());

    this.init();
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
      if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer);
    });

    controls.addEventListener("end", () => {
      this.autoRotateTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, AUTO_ROTATE_RESUME_DELAY);
    });

    return controls;
  }

  private async init(): Promise<void> {
    const { onProgress, onReady } = this.config;

    const { night, topo } = await loadGlobeTextures(onProgress);
    onProgress?.(60);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    if (night) configureTexture(night, maxAniso, THREE.SRGBColorSpace);
    if (topo) configureTexture(topo, maxAniso, THREE.LinearSRGBColorSpace);

    const finalNight = night ?? createFallbackNightTexture();
    onProgress?.(75);

    this.globeMaterial = new THREE.ShaderMaterial({
      vertexShader: globeSurfaceVert,
      fragmentShader: globeSurfaceFrag,
      uniforms: {
        uNightMap: { value: finalNight },
        uTopoMap: { value: topo ?? this.createFlatTexture() },
        uOceanMap: { value: createOceanColorMap() },
      },
    });

    const globeGeometry = new THREE.SphereGeometry(1, 200, 200);
    this.globe = new THREE.Mesh(globeGeometry, this.globeMaterial);
    this.globe.rotation.y = -Math.PI / 2;
    this.globe.rotation.x = THREE.MathUtils.degToRad(GLOBE_TILT_DEG);
    this.scene.add(this.globe);

    const contourGeometry = new THREE.SphereGeometry(1.003, 200, 200);
    const contourMaterial = new THREE.MeshBasicMaterial({
      map: createContourTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
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
    if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.atmosphere?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
}
```

- [ ] **Step 2: Verify type check**

Run: `cd packages/frontend && npx tsc -b`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/globe/globe-scene.ts
git commit -m "add: globe scene orchestrator composing all modules"
```

---

## Task 8: Zustand Stores with Tests

**Files:**
- Create: `packages/frontend/src/stores/globe-store.ts`
- Create: `packages/frontend/src/stores/layer-store.ts`
- Create: `packages/frontend/src/stores/event-store.ts`
- Create: `packages/frontend/src/stores/__tests__/globe-store.test.ts`
- Create: `packages/frontend/src/stores/__tests__/layer-store.test.ts`
- Create: `packages/frontend/src/stores/__tests__/event-store.test.ts`
- Create: `packages/frontend/vitest.config.ts`

- [ ] **Step 1: Create Vitest config for frontend**

Create `packages/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write failing test for globe store**

Create `packages/frontend/src/stores/__tests__/globe-store.test.ts`:

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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/frontend && npx vitest run src/stores/__tests__/globe-store.test.ts`

Expected: FAIL — module `../globe-store.js` not found.

- [ ] **Step 4: Implement globe store**

Create `packages/frontend/src/stores/globe-store.ts`:

```typescript
import { create } from "zustand";

interface GlobeState {
  loadProgress: number;
  isLoaded: boolean;
  isUserInteracting: boolean;
  setLoadProgress: (progress: number) => void;
  setLoaded: () => void;
  setUserInteracting: (interacting: boolean) => void;
}

export const useGlobeStore = create<GlobeState>()((set) => ({
  loadProgress: 0,
  isLoaded: false,
  isUserInteracting: false,

  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setLoaded: () => set({ isLoaded: true, loadProgress: 100 }),
  setUserInteracting: (isUserInteracting) => set({ isUserInteracting }),
}));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/frontend && npx vitest run src/stores/__tests__/globe-store.test.ts`

Expected: PASS — all 4 tests green.

- [ ] **Step 6: Write failing test for layer store**

Create `packages/frontend/src/stores/__tests__/layer-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useLayerStore } from "../layer-store.js";

describe("layer-store", () => {
  beforeEach(() => {
    useLayerStore.setState(useLayerStore.getInitialState());
  });

  it("starts with no active layers", () => {
    expect(useLayerStore.getState().activeLayers.size).toBe(0);
  });

  it("toggles a layer on", () => {
    useLayerStore.getState().toggleLayer("wildfires");
    expect(useLayerStore.getState().activeLayers.has("wildfires")).toBe(true);
  });

  it("toggles a layer off", () => {
    useLayerStore.getState().toggleLayer("wildfires");
    useLayerStore.getState().toggleLayer("wildfires");
    expect(useLayerStore.getState().activeLayers.has("wildfires")).toBe(false);
  });

  it("sets multiple layers at once", () => {
    useLayerStore.getState().setLayers(["wildfires", "earthquakes"]);
    const { activeLayers } = useLayerStore.getState();
    expect(activeLayers.has("wildfires")).toBe(true);
    expect(activeLayers.has("earthquakes")).toBe(true);
    expect(activeLayers.size).toBe(2);
  });

  it("replaces existing layers on setLayers", () => {
    useLayerStore.getState().toggleLayer("volcanoes");
    useLayerStore.getState().setLayers(["wildfires"]);
    const { activeLayers } = useLayerStore.getState();
    expect(activeLayers.has("volcanoes")).toBe(false);
    expect(activeLayers.has("wildfires")).toBe(true);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd packages/frontend && npx vitest run src/stores/__tests__/layer-store.test.ts`

Expected: FAIL — module `../layer-store.js` not found.

- [ ] **Step 8: Implement layer store**

Create `packages/frontend/src/stores/layer-store.ts`:

```typescript
import { create } from "zustand";
import type { LayerId } from "@terra/shared";

interface LayerState {
  activeLayers: Set<LayerId>;
  toggleLayer: (id: LayerId) => void;
  setLayers: (ids: readonly LayerId[]) => void;
}

export const useLayerStore = create<LayerState>()((set) => ({
  activeLayers: new Set<LayerId>(),

  toggleLayer: (id) =>
    set((state) => {
      const next = new Set(state.activeLayers);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { activeLayers: next };
    }),

  setLayers: (ids) => set({ activeLayers: new Set(ids) }),
}));
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd packages/frontend && npx vitest run src/stores/__tests__/layer-store.test.ts`

Expected: PASS — all 5 tests green.

- [ ] **Step 10: Write failing test for event store**

Create `packages/frontend/src/stores/__tests__/event-store.test.ts`:

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
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `cd packages/frontend && npx vitest run src/stores/__tests__/event-store.test.ts`

Expected: FAIL — module `../event-store.js` not found.

- [ ] **Step 12: Implement event store**

Create `packages/frontend/src/stores/event-store.ts`:

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
  setEvents: (events: readonly NaturalEvent[]) => void;
  selectEvent: (id: string) => void;
  clearSelection: () => void;
  setSelectedScreenPosition: (pos: ScreenPosition | null) => void;
  setHoveredEvent: (id: string | null) => void;
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],
  selectedEventId: null,
  selectedEventScreenPosition: null,
  hoveredEventId: null,

  setEvents: (events) => set({ events }),

  selectEvent: (selectedEventId) => set({ selectedEventId }),

  clearSelection: () =>
    set({ selectedEventId: null, selectedEventScreenPosition: null }),

  setSelectedScreenPosition: (selectedEventScreenPosition) =>
    set({ selectedEventScreenPosition }),

  setHoveredEvent: (hoveredEventId) => set({ hoveredEventId }),
}));
```

- [ ] **Step 13: Run all store tests**

Run: `cd packages/frontend && npx vitest run src/stores/`

Expected: PASS — all 15 tests green.

- [ ] **Step 14: Commit**

```bash
git add packages/frontend/vitest.config.ts packages/frontend/src/stores/
git commit -m "add: zustand stores for globe, layers, events with tests"
```

---

## Task 9: React Shell Components (GlobeCanvas + LoadingScreen)

**Files:**
- Create: `packages/frontend/src/components/globe-canvas.tsx`
- Create: `packages/frontend/src/components/loading-screen.tsx`
- Modify: `packages/frontend/src/app.tsx`

- [ ] **Step 1: Create GlobeCanvas component**

Create `packages/frontend/src/components/globe-canvas.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { GlobeScene } from "../globe/globe-scene.js";
import { useGlobeStore } from "../stores/globe-store.js";

export function GlobeCanvas(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GlobeScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { setLoadProgress, setLoaded } = useGlobeStore.getState();

    sceneRef.current = new GlobeScene({
      canvas,
      onProgress: setLoadProgress,
      onReady: setLoaded,
    });

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}
```

- [ ] **Step 2: Create LoadingScreen component**

Create `packages/frontend/src/components/loading-screen.tsx`:

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
      <div className="mb-4 text-[13px] tracking-[2px] uppercase text-white/40 font-[-apple-system,sans-serif]">
        Loading
      </div>
      <div className="w-[200px] h-px bg-white/[0.08] overflow-hidden">
        <div
          className="h-full bg-terra-cyan/50 transition-[width] duration-300 ease-out"
          style={{ width: `${loadProgress}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create vignette overlay**

Create `packages/frontend/src/components/vignette.tsx`:

```tsx
export function Vignette(): React.ReactElement {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
      }}
    />
  );
}
```

- [ ] **Step 4: Update App to compose components**

Update `packages/frontend/src/app.tsx`:

```tsx
import { GlobeCanvas } from "./components/globe-canvas.js";
import { LoadingScreen } from "./components/loading-screen.js";
import { Vignette } from "./components/vignette.js";

export function App(): React.ReactElement {
  return (
    <div className="relative w-full h-full">
      <GlobeCanvas />
      <Vignette />
      <LoadingScreen />
    </div>
  );
}
```

- [ ] **Step 5: Verify type check**

Run: `cd packages/frontend && npx tsc -b`

Expected: No type errors.

- [ ] **Step 6: Verify build**

Run: `cd packages/frontend && npx vite build`

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/components/ packages/frontend/src/app.tsx
git commit -m "add: globe canvas, loading screen, vignette components"
```

---

## Task 10: Backend Scaffolding

**Files:**
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/src/plugins/cors.ts`
- Create: `packages/backend/src/plugins/rate-limit.ts`
- Create: `packages/backend/src/routes/health.ts`
- Create: `packages/backend/vitest.config.ts`

- [ ] **Step 1: Create TypeScript config**

Create `packages/backend/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create Vitest config for backend**

Create `packages/backend/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Create CORS plugin**

Create `packages/backend/src/plugins/cors.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: ["http://localhost:5173"],
    methods: ["GET"],
  });
}
```

- [ ] **Step 4: Create rate limit plugin**

Create `packages/backend/src/plugins/rate-limit.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
}
```

- [ ] **Step 5: Create health route**

Create `packages/backend/src/routes/health.ts`:

```typescript
import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
```

- [ ] **Step 6: Create server entry**

Create `packages/backend/src/index.ts`:

```typescript
import Fastify from "fastify";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerHealthRoute } from "./routes/health.js";

const PORT = 3001;

export async function buildApp(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: true });

  await registerCors(app);
  await registerRateLimit(app);
  await registerHealthRoute(app);

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
```

- [ ] **Step 7: Verify type check**

Run: `cd packages/backend && npx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add packages/backend/
git commit -m "add: fastify backend scaffolding with cors, rate-limit, health route"
```

---

## Task 11: Backend Cache Service with Tests

**Files:**
- Create: `packages/backend/src/services/cache.ts`
- Create: `packages/backend/src/services/__tests__/cache.test.ts`

- [ ] **Step 1: Write failing test for cache**

Create `packages/backend/src/services/__tests__/cache.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TtlCache } from "../cache.js";

describe("TtlCache", () => {
  let cache: TtlCache<string>;

  beforeEach(() => {
    cache = new TtlCache<string>(60_000);
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns stale data via getStale after TTL expires", () => {
    vi.useFakeTimers();
    cache.set("key1", "value1");

    vi.advanceTimersByTime(61_000);

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.getStale("key1")).toBe("value1");

    vi.useRealTimers();
  });

  it("overwrites existing values", () => {
    cache.set("key1", "v1");
    cache.set("key1", "v2");
    expect(cache.get("key1")).toBe("v2");
  });

  it("reports whether entry is stale", () => {
    vi.useFakeTimers();
    cache.set("key1", "value1");
    expect(cache.isStale("key1")).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(cache.isStale("key1")).toBe(true);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && npx vitest run src/services/__tests__/cache.test.ts`

Expected: FAIL — module `../cache.js` not found.

- [ ] **Step 3: Implement cache**

Create `packages/backend/src/services/cache.ts`:

```typescript
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value;
  }

  getStale(key: string): T | undefined {
    return this.store.get(key)?.value;
  }

  isStale(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && npx vitest run src/services/__tests__/cache.test.ts`

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/services/
git commit -m "add: ttl cache service with tests"
```

---

## Task 12: EONET Client Service with Tests

**Files:**
- Create: `packages/backend/src/services/eonet-client.ts`
- Create: `packages/backend/src/services/__tests__/eonet-client.test.ts`

- [ ] **Step 1: Write failing test for EONET client**

Create `packages/backend/src/services/__tests__/eonet-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EonetClient } from "../eonet-client.js";
import { TtlCache } from "../cache.js";

const MOCK_EONET_RESPONSE = {
  events: [
    {
      id: "EONET_1234",
      title: "Wildfire - Oregon",
      categories: [{ id: "wildfires", title: "Wildfires" }],
      sources: [{ id: "InciWeb", url: "https://example.com" }],
      geometry: [
        { type: "Point", coordinates: [-121.5, 44.0], date: "2026-04-01T00:00:00Z" },
      ],
      magnitudeValue: 5000,
      magnitudeUnit: "acres",
      closed: null,
    },
  ],
};

describe("EonetClient", () => {
  let client: EonetClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    client = new EonetClient(new TtlCache(60_000), fetchSpy);
  });

  it("transforms EONET response into NaturalEvent array", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_EONET_RESPONSE),
    });

    const result = await client.getEvents();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("EONET_1234");
    expect(result.data[0]!.category).toBe("wildfires");
    expect(result.data[0]!.title).toBe("Wildfire - Oregon");
    expect(result.data[0]!.magnitude?.value).toBe(5000);
  });

  it("returns cached data on upstream failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_EONET_RESPONSE),
    });
    await client.getEvents();

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getEvents();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns error when upstream fails and no cache exists", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getEvents();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("eonet");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && npx vitest run src/services/__tests__/eonet-client.test.ts`

Expected: FAIL — module `../eonet-client.js` not found.

- [ ] **Step 3: Implement EONET client**

Create `packages/backend/src/services/eonet-client.ts`:

```typescript
import type { NaturalEvent, ApiResponse, EventCategoryId } from "@terra/shared";
import { TtlCache } from "./cache.js";

const EONET_BASE = "https://eonet.gsfc.nasa.gov/api/v3";
const CACHE_KEY = "eonet:events";

type FetchFn = typeof globalThis.fetch;

interface RawEonetEvent {
  id: string;
  title: string;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  geometry: { type: string; coordinates: number[]; date: string }[];
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  closed: string | null;
}

interface RawEonetResponse {
  events: RawEonetEvent[];
}

function transformEvent(raw: RawEonetEvent): NaturalEvent {
  const category = raw.categories[0];
  const source = raw.sources[0];

  return {
    id: raw.id,
    title: raw.title,
    category: (category?.id ?? "manmade") as EventCategoryId,
    status: raw.closed ? "closed" : "open",
    geometries: raw.geometry.map((g) => ({
      type: g.type as "Point" | "Polygon",
      coordinates: [g.coordinates[0]!, g.coordinates[1]!],
      timestamp: g.date,
    })),
    magnitude:
      raw.magnitudeValue !== null && raw.magnitudeUnit !== null
        ? { id: raw.magnitudeUnit, value: raw.magnitudeValue, unit: raw.magnitudeUnit }
        : null,
    sourceUrl: source?.url ?? "",
    sourceAgency: source?.id ?? "Unknown",
    closedDate: raw.closed,
  };
}

export class EonetClient {
  constructor(
    private cache: TtlCache<readonly NaturalEvent[]>,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getEvents(): Promise<ApiResponse<readonly NaturalEvent[]>> {
    try {
      const response = await this.fetchFn(`${EONET_BASE}/events?status=open&days=30`);
      if (!response.ok) {
        return this.fallbackOrError(`EONET returned ${response.status}`);
      }

      const body = (await response.json()) as RawEonetResponse;
      const events = body.events.map(transformEvent);
      this.cache.set(CACHE_KEY, events);

      return { status: "ok", data: events, cached: false };
    } catch (err) {
      return this.fallbackOrError(
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  private fallbackOrError(
    reason: string,
  ): ApiResponse<readonly NaturalEvent[]> {
    const stale = this.cache.getStale(CACHE_KEY);
    if (stale) {
      return { status: "ok", data: stale, cached: true };
    }

    return {
      status: "error",
      code: "UPSTREAM_UNAVAILABLE",
      source: "eonet",
      message: reason,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && npx vitest run src/services/__tests__/eonet-client.test.ts`

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/services/eonet-client.ts packages/backend/src/services/__tests__/eonet-client.test.ts
git commit -m "add: eonet client with response normalization, cache fallback, tests"
```

---

## Task 13: Events Route with Integration Test

**Files:**
- Create: `packages/backend/src/routes/events.ts`
- Create: `packages/backend/src/routes/__tests__/events.test.ts`
- Modify: `packages/backend/src/index.ts`

- [ ] **Step 1: Write failing integration test**

Create `packages/backend/src/routes/__tests__/events.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index.js";
import type { FastifyInstance } from "fastify";

const MOCK_EONET_RESPONSE = {
  events: [
    {
      id: "EONET_5678",
      title: "Storm - Atlantic",
      categories: [{ id: "severeStorms", title: "Severe Storms" }],
      sources: [{ id: "NOAA", url: "https://noaa.gov" }],
      geometry: [
        { type: "Point", coordinates: [-40.0, 30.0], date: "2026-04-01T00:00:00Z" },
      ],
      magnitudeValue: null,
      magnitudeUnit: null,
      closed: null,
    },
  ],
};

describe("GET /api/events", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_EONET_RESPONSE),
    }));

    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns normalized events", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/events",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("EONET_5678");
    expect(body.data[0].category).toBe("severeStorms");
  });

  it("returns 200 with health check", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("ok");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && npx vitest run src/routes/__tests__/events.test.ts`

Expected: FAIL — `/api/events` route not registered.

- [ ] **Step 3: Create events route**

Create `packages/backend/src/routes/events.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import { EonetClient } from "../services/eonet-client.js";
import { TtlCache } from "../services/cache.js";
import type { NaturalEvent } from "@terra/shared";

const CACHE_TTL = 10 * 60 * 1000;

export async function registerEventsRoute(app: FastifyInstance): Promise<void> {
  const cache = new TtlCache<readonly NaturalEvent[]>(CACHE_TTL);
  const client = new EonetClient(cache);

  app.get("/api/events", async (_request, reply) => {
    const result = await client.getEvents();

    if (result.status === "error") {
      const statusMap = {
        UPSTREAM_UNAVAILABLE: 502,
        RATE_LIMITED: 429,
        PARSE_FAILED: 502,
        TIMEOUT: 504,
      } as const;
      return reply.status(statusMap[result.code]).send(result);
    }

    if (result.cached) {
      reply.header("X-Cache", "STALE");
    }

    return reply.send(result);
  });
}
```

- [ ] **Step 4: Register events route in server entry**

Update `packages/backend/src/index.ts`:

```typescript
import Fastify from "fastify";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerEventsRoute } from "./routes/events.js";

const PORT = 3001;

export async function buildApp(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: true });

  await registerCors(app);
  await registerRateLimit(app);
  await registerHealthRoute(app);
  await registerEventsRoute(app);

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/backend && npx vitest run src/routes/__tests__/events.test.ts`

Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/routes/ packages/backend/src/index.ts
git commit -m "add: events route with eonet integration, integration tests"
```

---

## Task 14: Visual Parity Verification

Manual verification that the React app renders the same globe as `index.html`.

**Files:** None (no code changes)

- [ ] **Step 1: Run the prototype for reference**

Open `index.html` directly in a browser (double-click or `open index.html`). Note the globe appearance — dark navy, cyan contours, amber city lights, atmospheric glow, bloom on lights.

- [ ] **Step 2: Run the React app**

Run: `npm run dev:frontend` (from monorepo root)

Open `http://localhost:5173` in a separate browser tab.

- [ ] **Step 3: Compare side by side**

Verify:
- Loading screen appears and fades out
- Globe rotates slowly
- Ocean is dark navy with subtle basin color variation
- Contour lines visible in cyan-teal
- City lights glow warm amber/golden
- Atmospheric rim glow visible at globe edges
- Bloom effect on city lights
- Orbit controls work (click-drag to rotate, scroll to zoom)
- Auto-rotation resumes after 3 seconds of inactivity
- Vignette darkens screen edges

- [ ] **Step 4: Commit any visual fixes if needed**

If any visual differences are found, fix them and commit:

```bash
git add -A
git commit -m "fix: visual parity adjustments from prototype comparison"
```

If no fixes needed, skip this step.

---

## Remaining Work (Future Tasks)

The following items from the spec are **not** covered in this plan and should be planned separately once the core migration is verified:

1. **Remaining backend clients** — FIRMS (`firms-client.ts`), USGS (`usgs-client.ts`), DONKI (`donki-client.ts`), GIBS imagery routes
2. **UI components** — `LayerPanel`, `FilterBar`, `StatusBar`, `EventPopupCard` (these depend on event markers being implemented first)
3. **Event markers on globe** — rendering data-driven markers on the Three.js globe
4. **shadcn/ui setup** — initialize shadcn in the frontend package when UI components are needed
5. **Playwright E2E tests** — setup and basic globe-loads test
6. **Environment config** — `.env` files for API keys (FIRMS requires a key)

These are deferred because they depend on the core migration being complete and visually verified first. Each should be its own plan.
