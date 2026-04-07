import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerEarthquakesRoute } from "../earthquakes.js";

const MOCK_USGS_RESPONSE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "us7000xyz9",
      properties: {
        mag: 6.1,
        title: "M 6.1 - 25km NE of Testville",
        time: 1712100000000,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000xyz9",
      },
      geometry: {
        type: "Point",
        coordinates: [140.2, 35.7, 25.0],
      },
    },
  ],
};

describe("GET /api/earthquakes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_USGS_RESPONSE),
      }),
    );

    app = Fastify({ logger: false });
    await registerEarthquakesRoute(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns normalized earthquakes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/earthquakes",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toHaveLength(1);
    const quake = body.data[0];
    expect(quake.id).toBe("us7000xyz9");
    expect(quake.magnitude).toBe(6.1);
    expect(quake.longitude).toBe(140.2);
    expect(quake.latitude).toBe(35.7);
    expect(quake.depth).toBe(25.0);
    expect(quake.detailUrl).toBe(
      "https://earthquake.usgs.gov/earthquakes/eventpage/us7000xyz9",
    );
  });

  it("returns 502 when upstream is unavailable and no cache exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const freshApp = Fastify({ logger: false });
    await registerEarthquakesRoute(freshApp);
    await freshApp.ready();

    const response = await freshApp.inject({
      method: "GET",
      url: "/api/earthquakes",
    });

    await freshApp.close();
    vi.unstubAllGlobals();

    expect(response.statusCode).toBe(502);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.source).toBe("usgs");
  });

  it("sets X-Cache: STALE header when serving cached data after upstream failure", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_USGS_RESPONSE),
    });
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    vi.stubGlobal("fetch", fetchMock);

    const freshApp = Fastify({ logger: false });
    await registerEarthquakesRoute(freshApp);
    await freshApp.ready();

    await freshApp.inject({ method: "GET", url: "/api/earthquakes" });
    const staleResponse = await freshApp.inject({
      method: "GET",
      url: "/api/earthquakes",
    });

    await freshApp.close();
    vi.unstubAllGlobals();

    expect(staleResponse.statusCode).toBe(200);
    expect(staleResponse.headers["x-cache"]).toBe("STALE");
    const body = staleResponse.json();
    expect(body.status).toBe("ok");
    expect(body.cached).toBe(true);
  });
});
