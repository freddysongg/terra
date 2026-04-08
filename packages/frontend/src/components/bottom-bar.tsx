import { X } from "lucide-react";
import { useLayerStore } from "../stores/layer-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { LAYER_REGISTRY } from "@terra/shared";
import type { LayerId, LayerMetadata } from "@terra/shared";

function formatCoordinates(lat: number, lng: number): string {
  const latAbs = Math.abs(lat).toFixed(1);
  const lngAbs = Math.abs(lng).toFixed(1);
  const latSuffix = lat >= 0 ? "N" : "S";
  const lngSuffix = lng >= 0 ? "E" : "W";
  return `${latAbs}\u00B0${latSuffix}, ${lngAbs}\u00B0${lngSuffix}`;
}

export function BottomBar(): React.ReactElement {
  const activeLayers = useLayerStore((s) => s.activeLayers);
  const toggleLayer = useLayerStore((s) => s.toggleLayer);
  const cursorCoordinates = useGlobeStore((s) => s.cursorCoordinates);

  const activeLayerIds = Array.from(activeLayers);

  const activeCategoryCount = activeLayerIds.filter(
    (id) => (LAYER_REGISTRY[id] as LayerMetadata | undefined)?.group === "category",
  ).length;

  const activeNonCategoryLayers = activeLayerIds
    .filter(
      (id) => (LAYER_REGISTRY[id] as LayerMetadata | undefined)?.group !== "category",
    )
    .map((id) => ({
      id,
      label: LAYER_REGISTRY[id]?.label ?? id,
    }));

  const hasActiveLayers = activeCategoryCount > 0 || activeNonCategoryLayers.length > 0;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 rounded-full panel-surface px-4 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!hasActiveLayers && (
            <span className="text-[10px] text-terra-text-muted">No active layers</span>
          )}
          {activeCategoryCount > 0 && (
            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-terra-text-secondary">
              Events ({activeCategoryCount})
            </span>
          )}
          {activeNonCategoryLayers.map((entry) => (
            <button
              key={entry.id}
              onClick={() => toggleLayer(entry.id as LayerId)}
              className="flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-terra-text-secondary hover:bg-white/10 transition-colors"
            >
              {entry.label}
              <X className="h-2.5 w-2.5 text-terra-text-faint" />
            </button>
          ))}
        </div>

        {hasActiveLayers && <div className="h-3 w-px bg-terra-border" />}
        <span className="text-[11px] text-terra-text-muted tabular-nums">
          {cursorCoordinates
            ? formatCoordinates(cursorCoordinates.lat, cursorCoordinates.lng)
            : "\u2014"}
        </span>
      </div>
    </div>
  );
}
