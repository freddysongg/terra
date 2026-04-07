import { describe, it, expect } from "vitest";
import { resolveLatestFlare, resolveFlarePrefix } from "../space-weather-card.js";
import type { SolarFlare } from "@terra/shared";

const MOCK_FLARE: SolarFlare = {
  id: "2026-04-01T10:00:00-FLR-001",
  classType: "M2.5",
  beginTime: "2026-04-01T10:00Z",
  peakTime: "2026-04-01T10:15Z",
  endTime: "2026-04-01T10:30Z",
  sourceLocation: "N15W30",
};

describe("resolveLatestFlare", () => {
  it("returns null for an empty array", () => {
    expect(resolveLatestFlare([])).toBeNull();
  });

  it("returns the single flare when array has one item", () => {
    expect(resolveLatestFlare([MOCK_FLARE])).toBe(MOCK_FLARE);
  });

  it("returns the most recent flare sorted by beginTime descending", () => {
    const older: SolarFlare = {
      id: "2026-04-01T08:00:00-FLR-001",
      classType: "C1.0",
      beginTime: "2026-04-01T08:00Z",
      peakTime: null,
      endTime: null,
      sourceLocation: null,
    };
    const newer: SolarFlare = {
      id: "2026-04-01T14:00:00-FLR-002",
      classType: "X1.3",
      beginTime: "2026-04-01T14:00Z",
      peakTime: null,
      endTime: null,
      sourceLocation: null,
    };

    expect(resolveLatestFlare([older, MOCK_FLARE, newer])).toBe(newer);
  });
});

describe("resolveFlarePrefix", () => {
  it("returns 'X' for an X-class flare", () => {
    expect(resolveFlarePrefix("X1.0")).toBe("X");
  });

  it("returns 'M' for an M-class flare", () => {
    expect(resolveFlarePrefix("M2.5")).toBe("M");
  });

  it("returns 'C' for a C-class flare", () => {
    expect(resolveFlarePrefix("C3.2")).toBe("C");
  });

  it("returns 'B' for a B-class flare", () => {
    expect(resolveFlarePrefix("B5.1")).toBe("B");
  });

  it("returns empty string for an empty string", () => {
    expect(resolveFlarePrefix("")).toBe("");
  });
});
