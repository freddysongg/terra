import { describe, it, expect, vi, beforeEach } from "vitest";
import { EonetClient } from "../eonet-client.js";
import { TtlCache } from "../cache.js";

const MOCK_EONET_RESPONSE = {
  events: [
    {
      id: "EONET_1234",
      title: "Wildfire - Oregon",
      categories: [{ id: "wildfires", title: "Wildfires" }],
      sources: [{ id: "InciWeb", url: "https://example.com" }],
      geometry: [
        { type: "Point", coordinates: [-121.5, 44.0], date: "2026-04-01T00:00:00Z" },
      ],
      magnitudeValue: 5000,
      magnitudeUnit: "acres",
      closed: null,
    },
  ],
};

describe("EonetClient", () => {
  let client: EonetClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    client = new EonetClient(new TtlCache(60_000), fetchSpy);
  });

  it("transforms EONET response into NaturalEvent array", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_EONET_RESPONSE),
    });

    const result = await client.getEvents();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("EONET_1234");
    expect(result.data[0]!.category).toBe("wildfires");
    expect(result.data[0]!.title).toBe("Wildfire - Oregon");
    expect(result.data[0]!.magnitude?.value).toBe(5000);
  });

  it("returns cached data on upstream failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_EONET_RESPONSE),
    });
    await client.getEvents();

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getEvents();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns error when upstream fails and no cache exists", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getEvents();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("eonet");
  });
});
