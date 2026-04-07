import { create } from "zustand";
import type { LayerId, EventCategoryId } from "@terra/shared";

const DEFAULT_ACTIVE_CATEGORIES: EventCategoryId[] = [
  "drought",
  "dustHaze",
  "earthquakes",
  "floods",
  "landslides",
  "manmade",
  "seaLakeIce",
  "severeStorms",
  "snow",
  "tempExtremes",
  "volcanoes",
  "waterColor",
  "wildfires",
];

interface LayerState {
  activeLayers: Set<LayerId>;
  toggleLayer: (id: LayerId) => void;
  setLayers: (ids: readonly LayerId[]) => void;
}

export const useLayerStore = create<LayerState>()((set) => ({
  activeLayers: new Set<LayerId>(DEFAULT_ACTIVE_CATEGORIES),

  toggleLayer: (id) =>
    set((state) => {
      const next = new Set(state.activeLayers);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { activeLayers: next };
    }),

  setLayers: (ids) => set({ activeLayers: new Set(ids) }),
}));
