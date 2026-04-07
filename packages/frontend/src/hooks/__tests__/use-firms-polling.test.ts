import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useFirmsPolling } from "../use-firms-polling.js";
import { useDataStore } from "../../stores/data-store.js";
import { useLayerStore } from "../../stores/layer-store.js";
import type { FireHotspot } from "@terra/shared";

const MOCK_HOTSPOT: FireHotspot = {
  latitude: 44.0,
  longitude: -121.5,
  brightness: 350,
  confidence: "high",
  acquisitionTimestamp: "2026-04-01T00:00:00Z",
};

describe("useFirmsPolling", () => {
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
      json: () => Promise.resolve({ status: "ok", data: [MOCK_HOTSPOT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useFirmsPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(useDataStore.getState().fireHotspots).toHaveLength(0);
  });

  it("fetches when layer is toggled on", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_HOTSPOT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useFirmsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("fireDensity");
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/fires",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(useDataStore.getState().fireHotspots).toHaveLength(1);
    expect(useDataStore.getState().fireHotspots[0]!.brightness).toBe(350);
  });

  it("clears fire hotspots when layer is toggled off", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_HOTSPOT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useFirmsPolling());

    await act(async () => {
      useLayerStore.getState().toggleLayer("fireDensity");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(useDataStore.getState().fireHotspots).toHaveLength(1);

    await act(async () => {
      useLayerStore.getState().toggleLayer("fireDensity");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(useDataStore.getState().fireHotspots).toHaveLength(0);
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
        json: () => Promise.resolve({ status: "ok", data: [MOCK_HOTSPOT], cached: false }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useFirmsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("fireDensity");
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useDataStore.getState().fireHotspots).toHaveLength(1);
  });

  it("reverts the layer toggle on total failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useFirmsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("fireDensity");
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(useLayerStore.getState().activeLayers.has("fireDensity")).toBe(false);
  });

  it("cleans up on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await act(async () => {
      useLayerStore.getState().toggleLayer("fireDensity");
    });
    const { unmount } = renderHook(() => useFirmsPolling());
    await vi.advanceTimersByTimeAsync(0);

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });
});
