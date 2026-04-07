import { describe, it, expect, beforeEach } from "vitest";
import { useLayerStore } from "../layer-store.js";

describe("layer-store", () => {
  beforeEach(() => {
    useLayerStore.setState(useLayerStore.getInitialState());
  });

  it("starts with all 13 EONET categories active", () => {
    const { activeLayers } = useLayerStore.getState();
    expect(activeLayers.size).toBe(13);
    expect(activeLayers.has("wildfires")).toBe(true);
    expect(activeLayers.has("earthquakes")).toBe(true);
    expect(activeLayers.has("volcanoes")).toBe(true);
    expect(activeLayers.has("floods")).toBe(true);
    expect(activeLayers.has("severeStorms")).toBe(true);
  });

  it("toggles a default-active layer off", () => {
    useLayerStore.getState().toggleLayer("wildfires");
    expect(useLayerStore.getState().activeLayers.has("wildfires")).toBe(false);
  });

  it("toggles a layer back on after toggling off", () => {
    useLayerStore.getState().toggleLayer("wildfires");
    useLayerStore.getState().toggleLayer("wildfires");
    expect(useLayerStore.getState().activeLayers.has("wildfires")).toBe(true);
  });

  it("toggles a non-default layer on", () => {
    useLayerStore.getState().toggleLayer("fireDensity");
    expect(useLayerStore.getState().activeLayers.has("fireDensity")).toBe(true);
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
