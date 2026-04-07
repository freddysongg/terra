import { describe, it, expect, beforeEach } from "vitest";
import { GibsService } from "../gibs-service.js";
import { TtlCache } from "../cache.js";

const LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";
const DATE = "2026-04-07";

describe("GibsService", () => {
  let service: GibsService;

  beforeEach(() => {
    service = new GibsService(new TtlCache(24 * 60 * 60 * 1000));
  });

  it("constructs a valid WMTS tile URL", () => {
    const result = service.buildTileUrl(LAYER, DATE, 3, 2, 1);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toBe(
      `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${LAYER}/default/${DATE}/250m/3/2/1.jpg`,
    );
    expect(result.cached).toBe(false);
  });

  it("returns cached result on second call with same params", () => {
    service.buildTileUrl(LAYER, DATE, 3, 2, 1);
    const result = service.buildTileUrl(LAYER, DATE, 3, 2, 1);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(true);
  });

  it("does not share cache across different tile coordinates", () => {
    service.buildTileUrl(LAYER, DATE, 3, 2, 1);
    const result = service.buildTileUrl(LAYER, DATE, 3, 2, 5);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.cached).toBe(false);
  });

  it("returns PARSE_FAILED error for invalid date format", () => {
    const result = service.buildTileUrl(LAYER, "April 7 2026", 3, 2, 1);

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("PARSE_FAILED");
    expect(result.source).toBe("gibs");
  });

  it("returns PARSE_FAILED error when layer is empty", () => {
    const result = service.buildTileUrl("", DATE, 3, 2, 1);

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.code).toBe("PARSE_FAILED");
    expect(result.source).toBe("gibs");
  });

  it("includes z, y, x in the correct URL path positions", () => {
    const result = service.buildTileUrl(LAYER, DATE, 7, 42, 100);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toContain("/7/42/100.jpg");
  });

  it("accepts zero as a valid value for z, x, y", () => {
    const result = service.buildTileUrl(LAYER, DATE, 0, 0, 0);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toContain("/0/0/0.jpg");
  });
});
