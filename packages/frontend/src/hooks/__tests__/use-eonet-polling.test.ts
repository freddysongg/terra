import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEonetPolling } from "../use-eonet-polling.js";
import { useEventStore } from "../../stores/event-store.js";
import type { NaturalEvent } from "@terra/shared";

const MOCK_EVENT: NaturalEvent = {
  id: "EONET_5678",
  title: "Wildfire in California",
  category: "wildfires",
  status: "open",
  geometries: [
    { type: "Point", coordinates: [-119.5, 37.0], timestamp: "2026-04-01T00:00:00Z" },
  ],
  magnitude: null,
  sourceUrl: "https://example.com",
  sourceAgency: "InciWeb",
  closedDate: null,
};

describe("useEonetPolling", () => {
  beforeEach(() => {
    useEventStore.setState(useEventStore.getInitialState());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches events on mount and writes to store", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [MOCK_EVENT], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useEonetPolling());
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/events", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(useEventStore.getState().events).toHaveLength(1);
    expect(useEventStore.getState().events[0]!.id).toBe("EONET_5678");
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
        json: () => Promise.resolve({ status: "ok", data: [MOCK_EVENT], cached: false }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useEonetPolling());

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useEventStore.getState().events).toHaveLength(1);
  });

  it("cleans up interval and aborts on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", data: [], cached: false }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { unmount } = renderHook(() => useEonetPolling());
    await vi.advanceTimersByTimeAsync(0);

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });
});
