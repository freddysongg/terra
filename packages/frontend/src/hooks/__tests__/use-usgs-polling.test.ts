import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useUsgsPolling } from "../use-usgs-polling.js";
import { useDataStore } from "../../stores/data-store.js";
import { useLayerStore } from "../../stores/layer-store.js";
import type { Earthquake } from "@terra/shared";

const MOCK_EARTHQUAKE: Earthquake = {
  id: "us7000abc",
  title: "M 5.2 - Central California",
  magnitude: 5.2,
  latitude: 36.5,
  longitude: -120.1,
  depth: 10.5,
  timestamp: "2026-04-01T12:00:00Z",
  detailUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc",
};

describe("useUsgsPolling", () => {
  beforeEach(() => {
    useDataStore.setState(useDataStore.getInitialState());
    useLayerStore.setState(useLayerStore.getInitialState());
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "clearInterval", "clearTimeout"] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not fetch when layer is off", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_EARTHQUAKE], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useUsgsPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(useDataStore.getState().earthquakes).toHaveLength(0);
  });

  it("fetches when layer is toggled on", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_EARTHQUAKE], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useUsgsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("seismicDensity");
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/earthquakes",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(useDataStore.getState().earthquakes).toHaveLength(1);
    expect(useDataStore.getState().earthquakes[0]!.id).toBe("us7000abc");
  });

  it("clears earthquakes when layer is toggled off", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_EARTHQUAKE], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useUsgsPolling());

    await act(async () => {
      useLayerStore.getState().toggleLayer("seismicDensity");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(useDataStore.getState().earthquakes).toHaveLength(1);

    await act(async () => {
      useLayerStore.getState().toggleLayer("seismicDensity");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(useDataStore.getState().earthquakes).toHaveLength(0);
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
        json: () => Promise.resolve({ status: "ok", data: [MOCK_EARTHQUAKE], cached: false }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useUsgsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("seismicDensity");
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useDataStore.getState().earthquakes).toHaveLength(1);
  });

  it("reverts the layer toggle on total failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useUsgsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("seismicDensity");
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(useLayerStore.getState().activeLayers.has("seismicDensity")).toBe(false);
  });

  it("cleans up on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await act(async () => {
      useLayerStore.getState().toggleLayer("seismicDensity");
    });
    const { unmount } = renderHook(() => useUsgsPolling());
    await vi.advanceTimersByTimeAsync(0);

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });
});
