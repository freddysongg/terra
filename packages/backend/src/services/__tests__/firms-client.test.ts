import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FirmsClient } from "../firms-client.js";
import { TtlCache } from "../cache.js";

const MOCK_CSV = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
37.123,-119.456,320.5,0.39,0.36,2026-04-07,0142,N,n,2.0NRT,289.1,8.2,D
36.789,-120.123,340.1,0.39,0.36,2026-04-07,0142,N,h,2.0NRT,295.3,12.7,D`;

const MOCK_CSV_LOW_CONFIDENCE = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
35.000,-118.000,305.0,0.39,0.36,2026-04-07,0200,N,l,2.0NRT,280.0,5.0,D`;

describe("FirmsClient", () => {
  let client: FirmsClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    client = new FirmsClient(new TtlCache(60_000), fetchSpy);
    vi.stubEnv("FIRMS_MAP_KEY", "test-map-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses CSV response into FireHotspot array", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(MOCK_CSV),
    });

    const result = await client.getData("-125,32,-104,49");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(2);

    const first = result.data[0]!;
    expect(first.latitude).toBe(37.123);
    expect(first.longitude).toBe(-119.456);
    expect(first.brightness).toBe(320.5);
    expect(first.confidence).toBe("nominal");
    expect(first.acquisitionTimestamp).toBe("2026-04-07T01:42:00Z");

    const second = result.data[1]!;
    expect(second.confidence).toBe("high");
  });

  it("maps confidence single-letter codes correctly", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(MOCK_CSV_LOW_CONFIDENCE),
    });

    const result = await client.getData("world");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data[0]!.confidence).toBe("low");
  });

  it("returns empty array for CSV with only a header row", async () => {
    const headerOnly = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight";
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(headerOnly),
    });

    const result = await client.getData("world");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(0);
  });

  it("skips malformed CSV rows and parses remaining valid rows", async () => {
    const malformedCsv = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
not-a-number,-119.456,320.5,0.39,0.36,2026-04-07,0142,N,n,2.0NRT,289.1,8.2,D
36.789,-120.123,340.1,0.39,0.36,2026-04-07,0142,N,h,2.0NRT,295.3,12.7,D`;

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(malformedCsv),
    });

    const result = await client.getData("world");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.longitude).toBe(-120.123);
  });

  it("returns stale cache on upstream HTTP error", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(MOCK_CSV),
    });
    await client.getData("world");

    fetchSpy.mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await client.getData("world");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("returns stale cache on network failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(MOCK_CSV),
    });
    await client.getData("world");

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getData("world");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
  });

  it("returns error when upstream fails and no cache exists", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    const result = await client.getData("world");

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("firms");
  });

  it("returns error when FIRMS_MAP_KEY is missing", async () => {
    vi.unstubAllEnvs();
    delete process.env.FIRMS_MAP_KEY;

    const result = await client.getData("world");

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.source).toBe("firms");
  });
});
