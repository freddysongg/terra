import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAlertsRoute } from "../alerts.js";

const MOCK_NWS_RESPONSE = {
  type: "FeatureCollection",
  features: [
    {
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
    },
  ],
};

describe("GET /api/alerts", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_NWS_RESPONSE),
      }),
    );

    app = Fastify({ logger: false });
    await registerAlertsRoute(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns normalized alerts", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/alerts",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toHaveLength(1);

    const alert = body.data[0];
    expect(alert.id).toBe("urn:oid:2.49.0.1.840.0.abc");
    expect(alert.event).toBe("Tornado Warning");
    expect(alert.severity).toBe("Extreme");
    expect(alert.urgency).toBe("Immediate");
    expect(alert.expiration).toBe("2026-04-07T16:00:00-05:00");
    expect(alert.senderName).toBe("NWS Fort Worth TX");
    expect(alert.geometry.type).toBe("Polygon");
  });

  it("returns 502 when upstream is unavailable and no cache exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const freshApp = Fastify({ logger: false });
    await registerAlertsRoute(freshApp);
    await freshApp.ready();

    const response = await freshApp.inject({
      method: "GET",
      url: "/api/alerts",
    });

    await freshApp.close();
    vi.unstubAllGlobals();

    expect(response.statusCode).toBe(502);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.source).toBe("nws");
  });

  it("sets X-Cache: STALE header when serving cached data after upstream failure", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    });
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    vi.stubGlobal("fetch", fetchMock);

    const freshApp = Fastify({ logger: false });
    await registerAlertsRoute(freshApp);
    await freshApp.ready();

    await freshApp.inject({ method: "GET", url: "/api/alerts" });
    const staleResponse = await freshApp.inject({
      method: "GET",
      url: "/api/alerts",
    });

    await freshApp.close();
    vi.unstubAllGlobals();

    expect(staleResponse.statusCode).toBe(200);
    expect(staleResponse.headers["x-cache"]).toBe("STALE");
    const body = staleResponse.json();
    expect(body.status).toBe("ok");
    expect(body.cached).toBe(true);
  });

  it("includes alerts with null geometry in the response", async () => {
    const nullGeometryResponse = {
      type: "FeatureCollection",
      features: [
        {
          id: "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.xyz",
          type: "Feature",
          geometry: null,
          properties: {
            id: "urn:oid:2.49.0.1.840.0.xyz",
            event: "Flood Watch",
            severity: "Moderate",
            urgency: "Expected",
            headline: "Flood Watch in effect",
            description: "A Flood Watch has been issued.",
            onset: "2026-04-07T18:00:00-05:00",
            expires: "2026-04-08T06:00:00-05:00",
            senderName: "NWS Dallas TX",
          },
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(nullGeometryResponse),
      }),
    );

    const freshApp = Fastify({ logger: false });
    await registerAlertsRoute(freshApp);
    await freshApp.ready();

    const response = await freshApp.inject({
      method: "GET",
      url: "/api/alerts",
    });

    await freshApp.close();
    vi.unstubAllGlobals();

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].geometry).toBeNull();
    expect(body.data[0].event).toBe("Flood Watch");
  });
});
