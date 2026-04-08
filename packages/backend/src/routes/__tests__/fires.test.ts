import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerFiresRoute } from "../fires.js";

const MOCK_CSV = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
37.123,-119.456,320.5,0.39,0.36,2026-04-07,0142,N,n,2.0NRT,289.1,8.2,D
36.789,-120.123,340.1,0.39,0.36,2026-04-07,0142,N,h,2.0NRT,295.3,12.7,D`;

describe("GET /api/fires", () => {
  let app: FastifyInstance;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    vi.stubEnv("FIRMS_MAP_KEY", "test-map-key");
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_CSV),
    });
    vi.stubGlobal("fetch", fetchSpy);

    app = Fastify({ logger: false });
    await registerFiresRoute(app);
    await app.ready();
  });

  afterEach(() => {
    fetchSpy.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_CSV),
    });
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns normalized FireHotspot array", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/fires",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toHaveLength(2);

    const first = body.data[0];
    expect(first.latitude).toBe(37.123);
    expect(first.longitude).toBe(-119.456);
    expect(first.confidence).toBe("nominal");
    expect(first.acquisitionTimestamp).toBe("2026-04-07T01:42:00Z");
  });

  it("accepts bbox query parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/fires?bbox=-125,32,-104,49",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");

    const [_url] = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1] as [string];
    expect(_url).toContain("-125,32,-104,49");
  });

  it("returns 502 when upstream fails with no cache", async () => {
    const freshApp = Fastify({ logger: false });
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    await registerFiresRoute(freshApp);
    await freshApp.ready();

    const response = await freshApp.inject({
      method: "GET",
      url: "/api/fires",
    });

    expect(response.statusCode).toBe(502);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.source).toBe("firms");

    await freshApp.close();
  });

  it("sets X-Cache: STALE header when serving cached data after upstream failure", async () => {
    await app.inject({ method: "GET", url: "/api/fires" });

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const response = await app.inject({
      method: "GET",
      url: "/api/fires",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-cache"]).toBe("STALE");
    const body = response.json();
    expect(body.cached).toBe(true);
  });
});
