import { describe, it, expect, beforeEach } from "vitest";
import { useLayerStore } from "../layer-store.js";

describe("layer-store", () => {
  beforeEach(() => {
    useLayerStore.setState(useLayerStore.getInitialState());
  });

  it("starts with no active layers", () => {
    expect(useLayerStore.getState().activeLayers.size).toBe(0);
  });

  it("toggles a layer on", () => {
    useLayerStore.getState().toggleLayer("wildfires");
    expect(useLayerStore.getState().activeLayers.has("wildfires")).toBe(true);
  });

  it("toggles a layer off", () => {
    useLayerStore.getState().toggleLayer("wildfires");
    useLayerStore.getState().toggleLayer("wildfires");
    expect(useLayerStore.getState().activeLayers.has("wildfires")).toBe(false);
  });

  it("sets multiple layers at once", () => {
    useLayerStore.getState().setLayers(["wildfires", "earthquakes"]);
    const { activeLayers } = useLayerStore.getState();
    expect(activeLayers.has("wildfires")).toBe(true);
    expect(activeLayers.has("earthquakes")).toBe(true);
    expect(activeLayers.size).toBe(2);
  });

  it("replaces existing layers on setLayers", () => {
    useLayerStore.getState().toggleLayer("volcanoes");
    useLayerStore.getState().setLayers(["wildfires"]);
    const { activeLayers } = useLayerStore.getState();
    expect(activeLayers.has("volcanoes")).toBe(false);
    expect(activeLayers.has("wildfires")).toBe(true);
  });
});
