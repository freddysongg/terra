import { create } from "zustand";
import { EVENT_CATEGORY_IDS } from "@terra/shared";
import type { LayerId } from "@terra/shared";

interface LayerState {
  activeLayers: Set<LayerId>;
  disabledLayers: Map<LayerId, string>;
  toggleLayer: (id: LayerId) => void;
  setLayers: (ids: readonly LayerId[]) => void;
  disableLayer: (id: LayerId, reason: string) => void;
  disableLayers: (ids: readonly LayerId[], reason: string) => void;
  enableLayer: (id: LayerId) => void;
  enableLayers: (ids: readonly LayerId[]) => void;
}

export const useLayerStore = create<LayerState>()((set) => ({
  activeLayers: new Set<LayerId>(EVENT_CATEGORY_IDS),
  disabledLayers: new Map<LayerId, string>(),

  toggleLayer: (id) =>
    set((state) => {
      if (state.disabledLayers.has(id)) return state;
      const next = new Set(state.activeLayers);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { activeLayers: next };
    }),

  setLayers: (ids) => set({ activeLayers: new Set(ids) }),

  disableLayer: (id, reason) =>
    set((state) => {
      const nextDisabled = new Map(state.disabledLayers);
      nextDisabled.set(id, reason);
      const nextActive = new Set(state.activeLayers);
      nextActive.delete(id);
      return { disabledLayers: nextDisabled, activeLayers: nextActive };
    }),

  disableLayers: (ids, reason) =>
    set((state) => {
      const nextDisabled = new Map(state.disabledLayers);
      const nextActive = new Set(state.activeLayers);
      for (const id of ids) {
        nextDisabled.set(id, reason);
        nextActive.delete(id);
      }
      return { disabledLayers: nextDisabled, activeLayers: nextActive };
    }),

  enableLayer: (id) =>
    set((state) => {
      if (!state.disabledLayers.has(id)) return state;
      const nextDisabled = new Map(state.disabledLayers);
      nextDisabled.delete(id);
      const nextActive = new Set(state.activeLayers);
      nextActive.add(id);
      return { disabledLayers: nextDisabled, activeLayers: nextActive };
    }),

  enableLayers: (ids) =>
    set((state) => {
      const nextDisabled = new Map(state.disabledLayers);
      const nextActive = new Set(state.activeLayers);
      let changed = false;
      for (const id of ids) {
        if (nextDisabled.has(id)) {
          nextDisabled.delete(id);
          nextActive.add(id);
          changed = true;
        }
      }
      return changed ? { disabledLayers: nextDisabled, activeLayers: nextActive } : state;
    }),
}));
