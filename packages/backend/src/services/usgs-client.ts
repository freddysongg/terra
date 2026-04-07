import type { Earthquake, ApiResponse } from "@terra/shared";
import { TtlCache } from "./cache.js";

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
const CACHE_KEY = "usgs:earthquakes";

type FetchFn = typeof globalThis.fetch;

interface RawUsgsProperties {
  mag: number;
  title: string;
  time: number;
  url: string;
}

interface RawUsgsGeometry {
  type: string;
  coordinates: [number, number, number];
}

interface RawUsgsFeature {
  id: string;
  properties: RawUsgsProperties;
  geometry: RawUsgsGeometry;
}

interface RawUsgsResponse {
  type: string;
  features: RawUsgsFeature[];
}

function transformFeature(raw: RawUsgsFeature): Earthquake {
  const [longitude, latitude, depth] = raw.geometry.coordinates;

  return {
    id: raw.id,
    title: raw.properties.title,
    magnitude: raw.properties.mag,
    latitude,
    longitude,
    depth,
    timestamp: new Date(raw.properties.time).toISOString(),
    detailUrl: raw.properties.url,
  };
}

export class UsgsClient {
  constructor(
    private cache: TtlCache<readonly Earthquake[]>,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getEarthquakes(): Promise<ApiResponse<readonly Earthquake[]>> {
    try {
      const response = await this.fetchFn(USGS_URL);
      if (!response.ok) {
        return this.fallbackOrError(`USGS returned ${response.status}`);
      }

      const body = (await response.json()) as RawUsgsResponse;
      const earthquakes = body.features.map(transformFeature);
      this.cache.set(CACHE_KEY, earthquakes);

      return { status: "ok", data: earthquakes, cached: false };
    } catch (err) {
      return this.fallbackOrError(
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  private fallbackOrError(reason: string): ApiResponse<readonly Earthquake[]> {
    const stale = this.cache.getStale(CACHE_KEY);
    if (stale) {
      return { status: "ok", data: stale, cached: true };
    }

    return {
      status: "error",
      code: "UPSTREAM_UNAVAILABLE",
      source: "usgs",
      message: reason,
    };
  }
}
