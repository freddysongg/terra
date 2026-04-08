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
      raw.magnitudeValue != null && raw.magnitudeUnit != null
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
