import type { NwsAlert, NwsAlertGeometry, ApiResponse } from "@terra/shared";
import { TtlCache } from "./cache.js";

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active?status=actual";
const NWS_USER_AGENT = "(terra-globe, contact@terra.dev)";
const CACHE_KEY = "nws:alerts";

type FetchFn = typeof globalThis.fetch;

interface RawNwsAlertGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

interface RawNwsAlertProperties {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string;
  description: string;
  onset: string;
  expires: string;
  senderName: string;
}

interface RawNwsAlertFeature {
  id: string;
  type: "Feature";
  geometry: RawNwsAlertGeometry | null;
  properties: RawNwsAlertProperties;
}

interface RawNwsResponse {
  type: "FeatureCollection";
  features: RawNwsAlertFeature[];
}

type AlertSeverity = NwsAlert["severity"];
type AlertUrgency = NwsAlert["urgency"];

const VALID_SEVERITIES = new Set<AlertSeverity>([
  "Extreme",
  "Severe",
  "Moderate",
  "Minor",
  "Unknown",
]);

const VALID_URGENCIES = new Set<AlertUrgency>([
  "Immediate",
  "Expected",
  "Future",
  "Past",
  "Unknown",
]);

function normalizeSeverity(raw: string): AlertSeverity {
  return VALID_SEVERITIES.has(raw as AlertSeverity)
    ? (raw as AlertSeverity)
    : "Unknown";
}

function normalizeUrgency(raw: string): AlertUrgency {
  return VALID_URGENCIES.has(raw as AlertUrgency)
    ? (raw as AlertUrgency)
    : "Unknown";
}

function normalizeGeometry(raw: RawNwsAlertGeometry | null): NwsAlertGeometry | null {
  if (!raw) return null;
  return { type: "Polygon", coordinates: raw.coordinates };
}

function transformAlert(feature: RawNwsAlertFeature): NwsAlert {
  const { properties, geometry } = feature;
  return {
    id: properties.id,
    event: properties.event,
    severity: normalizeSeverity(properties.severity),
    urgency: normalizeUrgency(properties.urgency),
    headline: properties.headline,
    description: properties.description,
    geometry: normalizeGeometry(geometry),
    onset: properties.onset,
    expiration: properties.expires,
    senderName: properties.senderName,
  };
}

export class NwsClient {
  constructor(
    private cache: TtlCache<readonly NwsAlert[]>,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getAlerts(): Promise<ApiResponse<readonly NwsAlert[]>> {
    try {
      const response = await this.fetchFn(NWS_ALERTS_URL, {
        headers: { "User-Agent": NWS_USER_AGENT },
      });

      if (!response.ok) {
        return this.fallbackOrError(`NWS returned ${response.status}`);
      }

      const body = (await response.json()) as RawNwsResponse;
      const alerts = body.features.map(transformAlert);
      this.cache.set(CACHE_KEY, alerts);

      return { status: "ok", data: alerts, cached: false };
    } catch (err) {
      return this.fallbackOrError(
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  private fallbackOrError(reason: string): ApiResponse<readonly NwsAlert[]> {
    const stale = this.cache.getStale(CACHE_KEY);
    if (stale) {
      return { status: "ok", data: stale, cached: true };
    }

    return {
      status: "error",
      code: "UPSTREAM_UNAVAILABLE",
      source: "nws",
      message: reason,
    };
  }
}
