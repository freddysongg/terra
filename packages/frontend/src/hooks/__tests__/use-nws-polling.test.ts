import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useNwsPolling } from "../use-nws-polling.js";
import { useDataStore } from "../../stores/data-store.js";
import { useLayerStore } from "../../stores/layer-store.js";
import type { NwsAlert } from "@terra/shared";

const MOCK_ALERT: NwsAlert = {
  id: "urn:oid:2.49.0.1.840.0.abc",
  event: "Tornado Warning",
  severity: "Extreme",
  urgency: "Immediate",
  headline: "Tornado Warning issued for Central Oklahoma",
  description: "A severe tornado warning has been issued for Central Oklahoma.",
  geometry: null,
  onset: "2026-04-01T18:00:00Z",
  expiration: "2026-04-01T19:00:00Z",
  senderName: "NWS Norman OK",
};

describe("useNwsPolling", () => {
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
      json: () => Promise.resolve({ status: "ok", data: [MOCK_ALERT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useNwsPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(useDataStore.getState().weatherAlerts).toHaveLength(0);
  });

  it("fetches when layer is toggled on", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_ALERT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useNwsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("weatherAlerts");
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/alerts",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(useDataStore.getState().weatherAlerts).toHaveLength(1);
    expect(useDataStore.getState().weatherAlerts[0]!.id).toBe("urn:oid:2.49.0.1.840.0.abc");
  });

  it("clears weather alerts when layer is toggled off", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_ALERT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useNwsPolling());

    await act(async () => {
      useLayerStore.getState().toggleLayer("weatherAlerts");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(useDataStore.getState().weatherAlerts).toHaveLength(1);

    await act(async () => {
      useLayerStore.getState().toggleLayer("weatherAlerts");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(useDataStore.getState().weatherAlerts).toHaveLength(0);
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
        json: () => Promise.resolve({ status: "ok", data: [MOCK_ALERT], cached: false }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useNwsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("weatherAlerts");
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useDataStore.getState().weatherAlerts).toHaveLength(1);
  });

  it("reverts the layer toggle on total failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useNwsPolling());
    await act(async () => {
      useLayerStore.getState().toggleLayer("weatherAlerts");
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(useLayerStore.getState().activeLayers.has("weatherAlerts")).toBe(false);
  });

  it("cleans up on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await act(async () => {
      useLayerStore.getState().toggleLayer("weatherAlerts");
    });
    const { unmount } = renderHook(() => useNwsPolling());
    await vi.advanceTimersByTimeAsync(0);

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });
});
