import type { ApiResponse } from "@terra/shared";
import { TtlCache } from "./cache.js";

const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best";
const CACHE_KEY_PREFIX = "gibs:";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function buildCacheKey(
  layer: string,
  date: string,
  z: number,
  y: number,
  x: number,
): string {
  return `${CACHE_KEY_PREFIX}${layer}:${date}:${z}:${y}:${x}`;
}

export class GibsService {
  constructor(private cache: TtlCache<string>) {}

  buildTileUrl(
    layer: string,
    date: string,
    z: number,
    y: number,
    x: number,
  ): ApiResponse<string> {
    if (!layer) {
      return {
        status: "error",
        code: "PARSE_FAILED",
        source: "gibs",
        message: "layer is required",
      };
    }

    if (!DATE_PATTERN.test(date)) {
      return {
        status: "error",
        code: "PARSE_FAILED",
        source: "gibs",
        message: "date must match YYYY-MM-DD format",
      };
    }

    const cacheKey = buildCacheKey(layer, date, z, y, x);
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined) {
      return { status: "ok", data: cached, cached: true };
    }

    const url = `${GIBS_BASE}/${layer}/default/${date}/250m/${z}/${y}/${x}.jpg`;
    this.cache.set(cacheKey, url);

    return { status: "ok", data: url, cached: false };
  }
}
