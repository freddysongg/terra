import { create } from "zustand";
import type { NaturalEvent } from "@terra/shared";

interface ScreenPosition {
  x: number;
  y: number;
}

interface EventState {
  events: readonly NaturalEvent[];
  selectedEventId: string | null;
  selectedEventScreenPosition: ScreenPosition | null;
  hoveredEventId: string | null;
  searchQuery: string;
  setEvents: (events: readonly NaturalEvent[]) => void;
  selectEvent: (id: string) => void;
  clearSelection: () => void;
  setSelectedScreenPosition: (pos: ScreenPosition | null) => void;
  setHoveredEvent: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],
  selectedEventId: null,
  selectedEventScreenPosition: null,
  hoveredEventId: null,
  searchQuery: "",
  setEvents: (events) => set({ events }),
  selectEvent: (selectedEventId) => set({ selectedEventId }),
  clearSelection: () => set({ selectedEventId: null, selectedEventScreenPosition: null }),
  setSelectedScreenPosition: (selectedEventScreenPosition) => set({ selectedEventScreenPosition }),
  setHoveredEvent: (hoveredEventId) => set({ hoveredEventId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
