import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsgsClient } from "../usgs-client.js";
import { TtlCache } from "../cache.js";

const MOCK_USGS_RESPONSE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "us7000abc1",
      properties: {
        mag: 5.2,
        title: "M 5.2 - 10km SSW of Somewhere",
        time: 1712000000000,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc1",
      },
      geometry: {
        type: "Point",
        coordinates: [-121.5, 44.0, 10.5],
      },
    },
  ],
};

describe("UsgsClient", () => {
  let client: UsgsClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    client = new UsgsClient(new TtlCache(60_000), fetchSpy);
  });

  it("normalizes GeoJSON features into Earthquake array", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_USGS_RESPONSE),
    });

    const result = await client.getEarthquakes();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(1);
    const quake = result.data[0]!;
    expect(quake.id).toBe("us7000abc1");
    expect(quake.title).toBe("M 5.2 - 10km SSW of Somewhere");
    expect(quake.magnitude).toBe(5.2);
    expect(quake.longitude).toBe(-121.5);
    expect(quake.latitude).toBe(44.0);
    expect(quake.depth).toBe(10.5);
    expect(quake.timestamp).toBe(new Date(1712000000000).toISOString());
    expect(quake.detailUrl).toBe(
      "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc1",
    );
    expect(result.cached).toBe(false);
  });

  it("returns empty array when features list is empty", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ type: "FeatureCollection", features: [] }),
    });

    const result = await client.getEarthquakes();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(0);
  });

  it("returns stale cache on upstream failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_USGS_RESPONSE),
    });
    await client.getEarthquakes();

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getEarthquakes();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns error when upstream fails and no cache exists", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getEarthquakes();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("usgs");
  });

  it("returns error on non-ok HTTP response with no cache", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await client.getEarthquakes();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("usgs");
  });
});
