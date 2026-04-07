import { describe, it, expect, beforeEach } from "vitest";
import { useGlobeStore } from "../globe-store.js";

describe("globe-store", () => {
  beforeEach(() => {
    useGlobeStore.setState(useGlobeStore.getInitialState());
  });

  it("starts with zero progress and not loaded", () => {
    const state = useGlobeStore.getState();
    expect(state.loadProgress).toBe(0);
    expect(state.isLoaded).toBe(false);
    expect(state.isUserInteracting).toBe(false);
  });

  it("updates load progress", () => {
    useGlobeStore.getState().setLoadProgress(50);
    expect(useGlobeStore.getState().loadProgress).toBe(50);
  });

  it("marks as loaded", () => {
    useGlobeStore.getState().setLoaded();
    const state = useGlobeStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.loadProgress).toBe(100);
  });

  it("tracks user interaction", () => {
    useGlobeStore.getState().setUserInteracting(true);
    expect(useGlobeStore.getState().isUserInteracting).toBe(true);
    useGlobeStore.getState().setUserInteracting(false);
    expect(useGlobeStore.getState().isUserInteracting).toBe(false);
  });
});
