import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSpaceWeatherRoute } from "../space-weather.js";

const MOCK_FLR_RESPONSE = [
  {
    flrID: "2026-04-01T10:00:00-FLR-001",
    classType: "X1.0",
    beginTime: "2026-04-01T10:00Z",
    peakTime: "2026-04-01T10:12Z",
    endTime: "2026-04-01T10:25Z",
    sourceLocation: "S20E10",
  },
];

const MOCK_GST_RESPONSE = [
  {
    gstID: "2026-04-01T12:00:00-GST-001",
    startTime: "2026-04-01T12:00Z",
    allKpIndex: [{ kpIndex: 5, observedTime: "2026-04-01T12:00Z" }],
  },
];

const MOCK_CME_RESPONSE = [
  {
    activityID: "2026-04-01T08:00:00-CME-001",
    startTime: "2026-04-01T08:00Z",
    sourceLocation: "N10W20",
    note: "Full halo CME",
    cmeAnalyses: [{ isEarthDirected: true, estimatedArrivalTime: "2026-04-03T20:00Z" }],
  },
];

describe("GET /api/space-weather", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_FLR_RESPONSE) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_GST_RESPONSE) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_CME_RESPONSE) }),
    );

    app = Fastify({ logger: false });
    await registerSpaceWeatherRoute(app);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns normalized SpaceWeatherSummary", async () => {
    const response = await app.inject({ method: "GET", url: "/api/space-weather" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data.solarFlares).toHaveLength(1);
    expect(body.data.solarFlares[0].id).toBe("2026-04-01T10:00:00-FLR-001");
    expect(body.data.solarFlares[0].classType).toBe("X1.0");
    expect(body.data.geomagneticStorms).toHaveLength(1);
    expect(body.data.geomagneticStorms[0].kpIndex).toBe(5);
    expect(body.data.coronalMassEjections).toHaveLength(1);
    expect(body.data.coronalMassEjections[0].estimatedEarthArrival).toBe("2026-04-03T20:00Z");
    expect(body.cached).toBe(false);
  });
});

describe("GET /api/space-weather — all endpoints fail, no cache", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));

    app = Fastify({ logger: false });
    await registerSpaceWeatherRoute(app);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns 502 when all DONKI endpoints fail and no cache exists", async () => {
    const response = await app.inject({ method: "GET", url: "/api/space-weather" });

    expect(response.statusCode).toBe(502);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.source).toBe("donki");
  });
});

describe("GET /api/space-weather — partial failure", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("flr down"))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_GST_RESPONSE) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_CME_RESPONSE) }),
    );

    app = Fastify({ logger: false });
    await registerSpaceWeatherRoute(app);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns 200 with empty solarFlares when FLR endpoint fails", async () => {
    const response = await app.inject({ method: "GET", url: "/api/space-weather" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data.solarFlares).toHaveLength(0);
    expect(body.data.geomagneticStorms).toHaveLength(1);
    expect(body.data.coronalMassEjections).toHaveLength(1);
  });
});
