import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerImageryRoute } from "../imagery.js";

const LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";
const DATE = "2026-04-07";
const BASE_URL = `/api/imagery/${LAYER}?date=${DATE}&z=3&x=1&y=2`;
const EXPECTED_URL = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${LAYER}/default/${DATE}/250m/3/2/1.jpg`;

describe("GET /api/imagery/:layer", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await registerImageryRoute(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns a constructed WMTS tile URL", async () => {
    const response = await app.inject({
      method: "GET",
      url: BASE_URL,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toBe(EXPECTED_URL);
    expect(body.cached).toBe(false);
  });

  it("returns cached: true on second identical request", async () => {
    await app.inject({ method: "GET", url: BASE_URL });
    const response = await app.inject({ method: "GET", url: BASE_URL });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.cached).toBe(true);
  });

  it("returns 400 when date param is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/imagery/${LAYER}?z=3&x=1&y=2`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("PARSE_FAILED");
    expect(body.source).toBe("gibs");
  });

  it("returns 400 when date param has invalid format", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/imagery/${LAYER}?date=April-7-2026&z=3&x=1&y=2`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("PARSE_FAILED");
    expect(body.source).toBe("gibs");
  });

  it("returns 400 when z param is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/imagery/${LAYER}?date=${DATE}&x=1&y=2`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("PARSE_FAILED");
    expect(body.source).toBe("gibs");
  });

  it("returns 400 when x param is not an integer", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/imagery/${LAYER}?date=${DATE}&z=3&x=1.5&y=2`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("PARSE_FAILED");
    expect(body.source).toBe("gibs");
  });

  it("returns 400 when y param is negative", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/imagery/${LAYER}?date=${DATE}&z=3&x=1&y=-1`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("PARSE_FAILED");
    expect(body.source).toBe("gibs");
  });

  it("accepts zero for all numeric params", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/imagery/${LAYER}?date=${DATE}&z=0&x=0&y=0`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.data).toContain("/0/0/0.jpg");
  });

  it("makes no upstream fetch calls", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response();
    };

    await app.inject({ method: "GET", url: BASE_URL });

    globalThis.fetch = originalFetch;
    expect(fetchCalled).toBe(false);
  });
});
