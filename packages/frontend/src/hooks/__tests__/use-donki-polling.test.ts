import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDonkiPolling } from "../use-donki-polling.js";
import { useDataStore } from "../../stores/data-store.js";
import type { SpaceWeatherSummary } from "@terra/shared";

const MOCK_SPACE_WEATHER: SpaceWeatherSummary = {
  solarFlares: [
    {
      id: "2026-04-01-001",
      classType: "M1.2",
      beginTime: "2026-04-01T08:00:00Z",
      peakTime: "2026-04-01T08:30:00Z",
      endTime: "2026-04-01T09:00:00Z",
      sourceLocation: "N20W30",
    },
  ],
  geomagneticStorms: [],
  coronalMassEjections: [],
};

describe("useDonkiPolling", () => {
  beforeEach(() => {
    useDataStore.setState(useDataStore.getInitialState());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches space weather on mount and writes to store", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: MOCK_SPACE_WEATHER, cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useDonkiPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/space-weather",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const spaceWeather = useDataStore.getState().spaceWeather;
    expect(spaceWeather).not.toBeNull();
    expect(spaceWeather!.solarFlares).toHaveLength(1);
    expect(spaceWeather!.solarFlares[0]!.classType).toBe("M1.2");
  });

  it("polls again after interval elapses", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: MOCK_SPACE_WEATHER, cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useDonkiPolling());
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on failure with exponential backoff", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error("network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", data: MOCK_SPACE_WEATHER, cached: false }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useDonkiPolling());

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useDataStore.getState().spaceWeather).not.toBeNull();
  });

  it("cleans up interval and aborts on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: MOCK_SPACE_WEATHER, cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { unmount } = renderHook(() => useDonkiPolling());
    await vi.advanceTimersByTimeAsync(0);

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });

  it("is always active — does not require a layer toggle", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: MOCK_SPACE_WEATHER, cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useDonkiPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
