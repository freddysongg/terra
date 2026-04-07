import type { FireHotspot, ApiResponse } from "@terra/shared";
import { TtlCache } from "./cache.js";

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const FIRMS_SOURCE = "VIIRS_NOAA20_NRT";
const FIRMS_DAYS = 1;
const CACHE_KEY = "firms:fires";

type FetchFn = typeof globalThis.fetch;
type ConfidenceLabel = "low" | "nominal" | "high";

interface RawFirmsRow {
  latitude: string;
  longitude: string;
  brightness: string;
  acq_date: string;
  acq_time: string;
  confidence: string;
}

function parseConfidence(raw: string): ConfidenceLabel {
  const normalized = raw.toLowerCase().trim();
  if (normalized === "l" || normalized === "low") return "low";
  if (normalized === "h" || normalized === "high") return "high";
  return "nominal";
}

function buildAcquisitionTimestamp(acqDate: string, acqTime: string): string {
  const paddedTime = acqTime.padStart(4, "0");
  const hours = paddedTime.slice(0, 2);
  const minutes = paddedTime.slice(2, 4);
  return `${acqDate}T${hours}:${minutes}:00Z`;
}

function parseCsvRow(headers: string[], values: string[]): RawFirmsRow | null {
  if (values.length !== headers.length) return null;

  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    row[headers[i]!] = values[i]!;
  }

  const latitude = row["latitude"];
  const longitude = row["longitude"];
  const brightness = row["brightness"];
  const acq_date = row["acq_date"];
  const acq_time = row["acq_time"];
  const confidence = row["confidence"];

  if (!latitude || !longitude || !brightness || !acq_date || !acq_time || !confidence) {
    return null;
  }

  return { latitude, longitude, brightness, acq_date, acq_time, confidence };
}

function transformRow(raw: RawFirmsRow): FireHotspot | null {
  const latitude = parseFloat(raw.latitude);
  const longitude = parseFloat(raw.longitude);
  const brightness = parseFloat(raw.brightness);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(brightness)) return null;

  return {
    latitude,
    longitude,
    brightness,
    confidence: parseConfidence(raw.confidence),
    acquisitionTimestamp: buildAcquisitionTimestamp(raw.acq_date, raw.acq_time),
  };
}

function parseCsv(csv: string): FireHotspot[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(",").map((h) => h.trim());
  const hotspots: FireHotspot[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(",").map((v) => v.trim());
    const raw = parseCsvRow(headers, values);
    if (!raw) continue;

    const hotspot = transformRow(raw);
    if (hotspot) hotspots.push(hotspot);
  }

  return hotspots;
}

export class FirmsClient {
  constructor(
    private cache: TtlCache<readonly FireHotspot[]>,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getData(bbox: string): Promise<ApiResponse<readonly FireHotspot[]>> {
    const mapKey = process.env.FIRMS_MAP_KEY;
    if (!mapKey) {
      return {
        status: "error",
        code: "UPSTREAM_UNAVAILABLE",
        source: "firms",
        message: "FIRMS_MAP_KEY environment variable is not set",
      };
    }

    const cacheKey = `${CACHE_KEY}:${bbox}`;

    try {
      const url = `${FIRMS_BASE}/${mapKey}/${FIRMS_SOURCE}/${bbox}/${FIRMS_DAYS}`;
      const response = await this.fetchFn(url);

      if (!response.ok) {
        return this.fallbackOrError(`FIRMS returned ${response.status}`, cacheKey);
      }

      const csv = await response.text();
      const hotspots = parseCsv(csv);
      this.cache.set(cacheKey, hotspots);

      return { status: "ok", data: hotspots, cached: false };
    } catch (err) {
      return this.fallbackOrError(
        err instanceof Error ? err.message : "Unknown error",
        cacheKey,
      );
    }
  }

  private fallbackOrError(
    reason: string,
    cacheKey: string,
  ): ApiResponse<readonly FireHotspot[]> {
    const stale = this.cache.getStale(cacheKey);
    if (stale) {
      return { status: "ok", data: stale, cached: true };
    }

    return {
      status: "error",
      code: "UPSTREAM_UNAVAILABLE",
      source: "firms",
      message: reason,
    };
  }
}
