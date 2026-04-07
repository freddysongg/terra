import { create } from "zustand";
import type { LayerId } from "@terra/shared";

interface LayerState {
  activeLayers: Set<LayerId>;
  toggleLayer: (id: LayerId) => void;
  setLayers: (ids: readonly LayerId[]) => void;
}

export const useLayerStore = create<LayerState>()((set) => ({
  activeLayers: new Set<LayerId>(),

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
