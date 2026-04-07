import { describe, it, expect, vi } from "vitest";
import { DonkiClient } from "../donki-client.js";
import { TtlCache } from "../cache.js";

const MOCK_FLR_RESPONSE = [
  {
    flrID: "2026-04-01T10:00:00-FLR-001",
    classType: "M2.5",
    beginTime: "2026-04-01T10:00Z",
    peakTime: "2026-04-01T10:15Z",
    endTime: "2026-04-01T10:30Z",
    sourceLocation: "N15W30",
  },
];

const MOCK_GST_RESPONSE = [
  {
    gstID: "2026-04-01T12:00:00-GST-001",
    startTime: "2026-04-01T12:00Z",
    allKpIndex: [
      { kpIndex: 4, observedTime: "2026-04-01T12:00Z" },
      { kpIndex: 6, observedTime: "2026-04-01T13:00Z" },
    ],
  },
];

const MOCK_CME_RESPONSE = [
  {
    activityID: "2026-04-01T08:00:00-CME-001",
    startTime: "2026-04-01T08:00Z",
    sourceLocation: "N10W20",
    note: "Partial halo CME",
    cmeAnalyses: [
      { isEarthDirected: false, estimatedArrivalTime: null },
      { isEarthDirected: true, estimatedArrivalTime: "2026-04-03T14:00Z" },
    ],
  },
];

function makeMockFetch(responses: Array<{ ok: boolean; body: unknown } | "reject">): ReturnType<typeof vi.fn> {
  const fetchSpy = vi.fn();
  for (const resp of responses) {
    if (resp === "reject") {
      fetchSpy.mockRejectedValueOnce(new Error("network error"));
    } else {
      fetchSpy.mockResolvedValueOnce({
        ok: resp.ok,
        json: () => Promise.resolve(resp.body),
      });
    }
  }
  return fetchSpy;
}

describe("DonkiClient", () => {
  it("fetches all three endpoints concurrently and normalizes the summary", async () => {
    const fetchSpy = makeMockFetch([
      { ok: true, body: MOCK_FLR_RESPONSE },
      { ok: true, body: MOCK_GST_RESPONSE },
      { ok: true, body: MOCK_CME_RESPONSE },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.cached).toBe(false);
    expect(result.data.solarFlares).toHaveLength(1);
    expect(result.data.solarFlares[0]!.id).toBe("2026-04-01T10:00:00-FLR-001");
    expect(result.data.solarFlares[0]!.classType).toBe("M2.5");

    expect(result.data.geomagneticStorms).toHaveLength(1);
    expect(result.data.geomagneticStorms[0]!.kpIndex).toBe(6);

    expect(result.data.coronalMassEjections).toHaveLength(1);
    expect(result.data.coronalMassEjections[0]!.estimatedEarthArrival).toBe("2026-04-03T14:00Z");
  });

  it("uses maximum kpIndex from allKpIndex array", async () => {
    const fetchSpy = makeMockFetch([
      { ok: true, body: [] },
      {
        ok: true,
        body: [
          {
            gstID: "2026-04-01T12:00:00-GST-001",
            startTime: "2026-04-01T12:00Z",
            allKpIndex: [
              { kpIndex: 3, observedTime: "2026-04-01T12:00Z" },
              { kpIndex: 7, observedTime: "2026-04-01T13:00Z" },
              { kpIndex: 5, observedTime: "2026-04-01T14:00Z" },
            ],
          },
        ],
      },
      { ok: true, body: [] },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.geomagneticStorms[0]!.kpIndex).toBe(7);
  });

  it("defaults kpIndex to 0 when allKpIndex is empty", async () => {
    const fetchSpy = makeMockFetch([
      { ok: true, body: [] },
      {
        ok: true,
        body: [
          {
            gstID: "2026-04-01T12:00:00-GST-001",
            startTime: "2026-04-01T12:00Z",
            allKpIndex: [],
          },
        ],
      },
      { ok: true, body: [] },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.geomagneticStorms[0]!.kpIndex).toBe(0);
  });

  it("sets estimatedEarthArrival to null when no Earth-directed analysis exists", async () => {
    const fetchSpy = makeMockFetch([
      { ok: true, body: [] },
      { ok: true, body: [] },
      {
        ok: true,
        body: [
          {
            activityID: "2026-04-01T08:00:00-CME-001",
            startTime: "2026-04-01T08:00Z",
            sourceLocation: "N10W20",
            note: "No Earth impact",
            cmeAnalyses: [{ isEarthDirected: false, estimatedArrivalTime: "2026-04-05T00:00Z" }],
          },
        ],
      },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.coronalMassEjections[0]!.estimatedEarthArrival).toBeNull();
  });

  it("returns partial data when one endpoint fails with non-ok status", async () => {
    const fetchSpy = makeMockFetch([
      { ok: false, body: null },
      { ok: true, body: MOCK_GST_RESPONSE },
      { ok: true, body: MOCK_CME_RESPONSE },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.solarFlares).toHaveLength(0);
    expect(result.data.geomagneticStorms).toHaveLength(1);
    expect(result.data.coronalMassEjections).toHaveLength(1);
  });

  it("returns partial data when one endpoint rejects", async () => {
    const fetchSpy = makeMockFetch([
      { ok: true, body: MOCK_FLR_RESPONSE },
      "reject",
      { ok: true, body: MOCK_CME_RESPONSE },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.solarFlares).toHaveLength(1);
    expect(result.data.geomagneticStorms).toHaveLength(0);
    expect(result.data.coronalMassEjections).toHaveLength(1);
  });

  it("returns partial data when two endpoints fail", async () => {
    const fetchSpy = makeMockFetch([
      "reject",
      "reject",
      { ok: true, body: MOCK_CME_RESPONSE },
    ]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.solarFlares).toHaveLength(0);
    expect(result.data.geomagneticStorms).toHaveLength(0);
    expect(result.data.coronalMassEjections).toHaveLength(1);
  });

  it("falls back to stale cache when all three endpoints fail", async () => {
    const ttlCache = new TtlCache<import("@terra/shared").SpaceWeatherSummary>(60_000);

    const seedFetch = makeMockFetch([
      { ok: true, body: MOCK_FLR_RESPONSE },
      { ok: true, body: MOCK_GST_RESPONSE },
      { ok: true, body: MOCK_CME_RESPONSE },
    ]);
    const seedClient = new DonkiClient(ttlCache, seedFetch);
    await seedClient.getData();

    const failFetch = makeMockFetch(["reject", "reject", "reject"]);
    const client = new DonkiClient(ttlCache, failFetch);
    const result = await client.getData();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
    expect(result.data.solarFlares).toHaveLength(1);
  });

  it("returns error when all three fail and no cache exists", async () => {
    const fetchSpy = makeMockFetch(["reject", "reject", "reject"]);
    const client = new DonkiClient(new TtlCache(60_000), fetchSpy);

    const result = await client.getData();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.source).toBe("donki");
  });
});
