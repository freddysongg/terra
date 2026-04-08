import type { SpaceWeatherSummary, SolarFlare, GeomagneticStorm, CoronalMassEjection, ApiResponse } from "@terra/shared";
import { TtlCache } from "./cache.js";

const DONKI_BASE = "https://api.nasa.gov/DONKI";
const CACHE_KEY = "donki:space-weather";

type FetchFn = typeof globalThis.fetch;

interface RawSolarFlare {
  flrID: string;
  classType: string;
  beginTime: string;
  peakTime: string | null;
  endTime: string | null;
  sourceLocation: string | null;
}

interface RawKpIndex {
  kpIndex: number;
  observedTime: string;
}

interface RawGeomagneticStorm {
  gstID: string;
  startTime: string;
  allKpIndex: RawKpIndex[];
}

interface RawCmeAnalysis {
  isEarthDirected: boolean;
  estimatedArrivalTime: string | null;
}

interface RawCoronalMassEjection {
  activityID: string;
  startTime: string;
  sourceLocation: string | null;
  note: string;
  cmeAnalyses: RawCmeAnalysis[] | null;
}

function transformSolarFlare(raw: RawSolarFlare): SolarFlare {
  return {
    id: raw.flrID,
    classType: raw.classType,
    beginTime: raw.beginTime,
    peakTime: raw.peakTime,
    endTime: raw.endTime,
    sourceLocation: raw.sourceLocation,
  };
}

function transformGeomagneticStorm(raw: RawGeomagneticStorm): GeomagneticStorm {
  const kpIndex =
    raw.allKpIndex.length > 0
      ? Math.max(...raw.allKpIndex.map((k) => k.kpIndex))
      : 0;

  return {
    id: raw.gstID,
    startTime: raw.startTime,
    kpIndex,
  };
}

function transformCoronalMassEjection(raw: RawCoronalMassEjection): CoronalMassEjection {
  const analyses = raw.cmeAnalyses ?? [];
  const earthDirected = analyses.find((a) => a.isEarthDirected === true);

  return {
    id: raw.activityID,
    startTime: raw.startTime,
    sourceLocation: raw.sourceLocation,
    note: raw.note,
    estimatedEarthArrival: earthDirected?.estimatedArrivalTime ?? null,
  };
}

async function resolveSettledJson<T>(result: PromiseSettledResult<Response>): Promise<readonly T[]> {
  if (result.status === "rejected") return [];
  if (!result.value.ok) return [];

  const body: unknown = await result.value.json();
  if (!Array.isArray(body)) return [];
  return body as T[];
}

export class DonkiClient {
  constructor(
    private cache: TtlCache<SpaceWeatherSummary>,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getData(): Promise<ApiResponse<SpaceWeatherSummary>> {
    const apiKey = process.env.NASA_API_KEY ?? "DEMO_KEY";

    const [flrResult, gstResult, cmeResult] = await Promise.allSettled([
      this.fetchFn(`${DONKI_BASE}/FLR?api_key=${apiKey}`),
      this.fetchFn(`${DONKI_BASE}/GST?api_key=${apiKey}`),
      this.fetchFn(`${DONKI_BASE}/CME?api_key=${apiKey}`),
    ]);

    try {
      const [rawFlares, rawStorms, rawCmes] = await Promise.all([
        resolveSettledJson<RawSolarFlare>(flrResult),
        resolveSettledJson<RawGeomagneticStorm>(gstResult),
        resolveSettledJson<RawCoronalMassEjection>(cmeResult),
      ]);

      const endpointFailed = (r: PromiseSettledResult<Response>): boolean =>
        r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok);

      const allFailed =
        endpointFailed(flrResult) &&
        endpointFailed(gstResult) &&
        endpointFailed(cmeResult);

      if (allFailed) {
        return this.fallbackOrError("All DONKI endpoints failed");
      }

      const summary: SpaceWeatherSummary = {
        solarFlares: rawFlares.map(transformSolarFlare),
        geomagneticStorms: rawStorms.map(transformGeomagneticStorm),
        coronalMassEjections: rawCmes.map(transformCoronalMassEjection),
      };

      this.cache.set(CACHE_KEY, summary);

      return { status: "ok", data: summary, cached: false };
    } catch (err) {
      return this.fallbackOrError(
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  private fallbackOrError(reason: string): ApiResponse<SpaceWeatherSummary> {
    const stale = this.cache.getStale(CACHE_KEY);
    if (stale) {
      return { status: "ok", data: stale, cached: true };
    }

    return {
      status: "error",
      code: "UPSTREAM_UNAVAILABLE",
      source: "donki",
      message: reason,
    };
  }
}
