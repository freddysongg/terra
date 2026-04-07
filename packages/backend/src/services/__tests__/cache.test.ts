import { describe, it, expect, beforeEach, vi } from "vitest";
import { TtlCache } from "../cache.js";

describe("TtlCache", () => {
  let cache: TtlCache<string>;

  beforeEach(() => {
    cache = new TtlCache<string>(60_000);
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns stale data via getStale after TTL expires", () => {
    vi.useFakeTimers();
    cache.set("key1", "value1");

    vi.advanceTimersByTime(61_000);

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.getStale("key1")).toBe("value1");

    vi.useRealTimers();
  });

  it("overwrites existing values", () => {
    cache.set("key1", "v1");
    cache.set("key1", "v2");
    expect(cache.get("key1")).toBe("v2");
  });

  it("reports whether entry is stale", () => {
    vi.useFakeTimers();
    cache.set("key1", "value1");
    expect(cache.isStale("key1")).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(cache.isStale("key1")).toBe(true);

    vi.useRealTimers();
  });
});
