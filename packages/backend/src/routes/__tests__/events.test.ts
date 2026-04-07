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
