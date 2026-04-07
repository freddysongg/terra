import { describe, it, expect, beforeEach } from "vitest";
import { useEventStore } from "../event-store.js";
import type { NaturalEvent } from "@terra/shared";

const MOCK_EVENT: NaturalEvent = {
  id: "EONET_1234",
  title: "Wildfire in Oregon",
  category: "wildfires",
  status: "open",
  geometries: [
    { type: "Point", coordinates: [-121.5, 44.0], timestamp: "2026-04-01T00:00:00Z" },
  ],
  magnitude: { id: "mag_acres", value: 5000, unit: "acres" },
  sourceUrl: "https://example.com",
  sourceAgency: "InciWeb",
  closedDate: null,
};

describe("event-store", () => {
  beforeEach(() => {
    useEventStore.setState(useEventStore.getInitialState());
  });

  it("starts with empty events and no selection", () => {
    const state = useEventStore.getState();
    expect(state.events).toEqual([]);
    expect(state.selectedEventId).toBeNull();
    expect(state.hoveredEventId).toBeNull();
  });

  it("sets events", () => {
    useEventStore.getState().setEvents([MOCK_EVENT]);
    expect(useEventStore.getState().events).toHaveLength(1);
    expect(useEventStore.getState().events[0]!.id).toBe("EONET_1234");
  });

  it("selects an event", () => {
    useEventStore.getState().selectEvent("EONET_1234");
    expect(useEventStore.getState().selectedEventId).toBe("EONET_1234");
  });

  it("clears selection", () => {
    useEventStore.getState().selectEvent("EONET_1234");
    useEventStore.getState().clearSelection();
    const state = useEventStore.getState();
    expect(state.selectedEventId).toBeNull();
    expect(state.selectedEventScreenPosition).toBeNull();
  });

  it("updates screen position for selected event", () => {
    useEventStore.getState().setSelectedScreenPosition({ x: 100, y: 200 });
    const pos = useEventStore.getState().selectedEventScreenPosition;
    expect(pos).toEqual({ x: 100, y: 200 });
  });

  it("sets hover state", () => {
    useEventStore.getState().setHoveredEvent("EONET_1234");
    expect(useEventStore.getState().hoveredEventId).toBe("EONET_1234");
    useEventStore.getState().setHoveredEvent(null);
    expect(useEventStore.getState().hoveredEventId).toBeNull();
  });

  it("starts with empty search query", () => {
    expect(useEventStore.getState().searchQuery).toBe("");
  });

  it("sets search query", () => {
    useEventStore.getState().setSearchQuery("wildfire");
    expect(useEventStore.getState().searchQuery).toBe("wildfire");
    useEventStore.getState().setSearchQuery("");
    expect(useEventStore.getState().searchQuery).toBe("");
  });

  it("tracks last fetched timestamp", () => {
    expect(useEventStore.getState().lastFetchedAt).toBeNull();
    const before = Date.now();
    useEventStore.getState().setLastFetchedAt(before);
    expect(useEventStore.getState().lastFetchedAt).toBe(before);
  });
});
