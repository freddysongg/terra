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

  it("starts with performance mode off", () => {
    expect(useGlobeStore.getState().isPerformanceMode).toBe(false);
  });

  it("toggles performance mode", () => {
    useGlobeStore.getState().togglePerformanceMode();
    expect(useGlobeStore.getState().isPerformanceMode).toBe(true);
    useGlobeStore.getState().togglePerformanceMode();
    expect(useGlobeStore.getState().isPerformanceMode).toBe(false);
  });

  it("starts with null cursor coordinates", () => {
    expect(useGlobeStore.getState().cursorCoordinates).toBeNull();
  });

  it("sets cursor coordinates", () => {
    useGlobeStore.getState().setCursorCoordinates({ lat: 44.2, lng: -121.8 });
    expect(useGlobeStore.getState().cursorCoordinates).toEqual({ lat: 44.2, lng: -121.8 });
  });

  it("clears cursor coordinates", () => {
    useGlobeStore.getState().setCursorCoordinates({ lat: 10, lng: 20 });
    useGlobeStore.getState().setCursorCoordinates(null);
    expect(useGlobeStore.getState().cursorCoordinates).toBeNull();
  });

  it("starts with null flyToTarget", () => {
    expect(useGlobeStore.getState().flyToTarget).toBeNull();
  });

  it("sets flyToTarget", () => {
    useGlobeStore.getState().setFlyToTarget({ lat: 50, lng: 15 });
    expect(useGlobeStore.getState().flyToTarget).toEqual({ lat: 50, lng: 15 });
  });

  it("clears flyToTarget", () => {
    useGlobeStore.getState().setFlyToTarget({ lat: 50, lng: 15 });
    useGlobeStore.getState().setFlyToTarget(null);
    expect(useGlobeStore.getState().flyToTarget).toBeNull();
  });
});
