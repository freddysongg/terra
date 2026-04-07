import { describe, it, expect, vi, beforeEach } from "vitest";
import { NwsClient } from "../nws-client.js";
import { TtlCache } from "../cache.js";

const MOCK_ALERT_WITH_GEOMETRY = {
  id: "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.abc",
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [[-97.1, 32.7], [-97.0, 32.7], [-97.0, 32.8], [-97.1, 32.8], [-97.1, 32.7]],
    ],
  },
  properties: {
    id: "urn:oid:2.49.0.1.840.0.abc",
    event: "Tornado Warning",
    severity: "Extreme",
    urgency: "Immediate",
    headline: "Tornado Warning issued April 7",
    description: "The National Weather Service has issued a Tornado Warning.",
    onset: "2026-04-07T15:00:00-05:00",
    expires: "2026-04-07T16:00:00-05:00",
    senderName: "NWS Fort Worth TX",
  },
};

const MOCK_ALERT_NULL_GEOMETRY = {
  id: "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.xyz",
  type: "Feature",
  geometry: null,
  properties: {
    id: "urn:oid:2.49.0.1.840.0.xyz",
    event: "Flood Watch",
    severity: "Moderate",
    urgency: "Expected",
    headline: "Flood Watch in effect",
    description: "A Flood Watch has been issued for the area.",
    onset: "2026-04-07T18:00:00-05:00",
    expires: "2026-04-08T06:00:00-05:00",
    senderName: "NWS Dallas TX",
  },
};

const MOCK_NWS_RESPONSE = {
  type: "FeatureCollection",
  features: [MOCK_ALERT_WITH_GEOMETRY],
};

describe("NwsClient", () => {
  let client: NwsClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    client = new NwsClient(new TtlCache(60_000), fetchSpy);
  });

  it("sends User-Agent header on all requests", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    });

    await client.getAlerts();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("api.weather.gov"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "(terra-globe, contact@terra.dev)",
        }),
      }),
    );
  });

  it("normalizes alert features into NwsAlert array", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    });

    const result = await client.getAlerts();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(1);

    const alert = result.data[0]!;
    expect(alert.id).toBe("urn:oid:2.49.0.1.840.0.abc");
    expect(alert.event).toBe("Tornado Warning");
    expect(alert.severity).toBe("Extreme");
    expect(alert.urgency).toBe("Immediate");
    expect(alert.headline).toBe("Tornado Warning issued April 7");
    expect(alert.expiration).toBe("2026-04-07T16:00:00-05:00");
    expect(alert.senderName).toBe("NWS Fort Worth TX");
    expect(alert.geometry).not.toBeNull();
    expect(alert.geometry?.type).toBe("Polygon");
  });

  it("maps properties.expires to expiration field", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    });

    const result = await client.getAlerts();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data[0]!.expiration).toBe("2026-04-07T16:00:00-05:00");
  });

  it("uses properties.id not feature-level id", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    });

    const result = await client.getAlerts();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data[0]!.id).toBe("urn:oid:2.49.0.1.840.0.abc");
    expect(result.data[0]!.id).not.toContain("https://");
  });

  it("handles alerts with null geometry", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "FeatureCollection",
          features: [MOCK_ALERT_NULL_GEOMETRY],
        }),
    });

    const result = await client.getAlerts();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.geometry).toBeNull();
    expect(result.data[0]!.event).toBe("Flood Watch");
  });

  it("includes alerts with null geometry alongside alerts with geometry", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "FeatureCollection",
          features: [MOCK_ALERT_WITH_GEOMETRY, MOCK_ALERT_NULL_GEOMETRY],
        }),
    });

    const result = await client.getAlerts();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.geometry).not.toBeNull();
    expect(result.data[1]!.geometry).toBeNull();
  });

  it("returns stale cache on upstream failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    });
    await client.getAlerts();

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getAlerts();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns error when upstream fails and no cache exists", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getAlerts();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("nws");
  });

  it("returns error on non-ok HTTP status with no cache", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await client.getAlerts();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("nws");
    expect(result.message).toContain("503");
  });
});
