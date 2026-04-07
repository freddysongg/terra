import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "../logger.js";

describe("createLogger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("info() outputs valid JSON with all required fields", () => {
    const logger = createLogger("eonet");

    logger.info("fetched events", {
      endpoint: "/api/v3/events",
      status: 200,
      cacheStatus: "miss",
    });

    expect(logSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(parsed.level).toBe("info");
    expect(parsed.source).toBe("eonet");
    expect(parsed.endpoint).toBe("/api/v3/events");
    expect(parsed.status).toBe(200);
    expect(parsed.cacheStatus).toBe("miss");
    expect(parsed.message).toBe("fetched events");
    expect(parsed).toHaveProperty("timestamp");
  });

  it("timestamp is ISO8601 format", () => {
    const logger = createLogger("firms");

    logger.info("check", { endpoint: "/api/fires", status: 200 });

    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    const timestamp = parsed.timestamp as string;

    expect(() => new Date(timestamp).toISOString()).not.toThrow();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it("error() includes message and stack from Error object", () => {
    const logger = createLogger("usgs");
    const testError = new Error("connection refused");

    logger.error("upstream failure", {
      endpoint: "/api/earthquakes",
      status: "error",
      cacheStatus: "stale",
      error: testError,
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(errorSpy.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(parsed.level).toBe("error");
    expect(parsed.source).toBe("usgs");
    expect(parsed.message).toBe("connection refused");
    expect(parsed.stack).toBeDefined();
    expect(typeof parsed.stack).toBe("string");
  });

  it("error() handles non-Error thrown values", () => {
    const logger = createLogger("usgs");

    logger.error("unexpected", {
      endpoint: "/api/earthquakes",
      error: "string error",
    });

    const parsed = JSON.parse(errorSpy.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(parsed.message).toBe("string error");
    expect(parsed.stack).toBeUndefined();
  });

  it("includes retry attempt number when provided", () => {
    const logger = createLogger("firms");

    logger.warn("retrying request", {
      endpoint: "/api/fires",
      status: 503,
      cacheStatus: "none",
      attempt: 2,
    });

    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(parsed.attempt).toBe(2);
    expect(parsed.level).toBe("warn");
  });

  it("defaults cacheStatus to 'none' and status to 'error' when omitted", () => {
    const logger = createLogger("eonet");

    logger.info("partial context", { endpoint: "/api/events" });

    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(parsed.cacheStatus).toBe("none");
    expect(parsed.status).toBe("error");
  });

  it("includes durationMs when provided", () => {
    const logger = createLogger("eonet");

    logger.info("request complete", {
      endpoint: "/api/events",
      status: 200,
      cacheStatus: "miss",
      durationMs: 342,
    });

    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;

    expect(parsed.durationMs).toBe(342);
  });
});
