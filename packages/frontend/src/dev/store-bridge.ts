import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { useDataStore } from "../stores/data-store.js";

export function initStoreBridge(): void {
  if (import.meta.env.DEV) {
    (window as Record<string, unknown>).__TERRA__ = {
      events: useEventStore,
      globe: useGlobeStore,
      layers: useLayerStore,
      data: useDataStore,
    };
  }
}
