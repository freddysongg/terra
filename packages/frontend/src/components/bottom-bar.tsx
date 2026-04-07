import { X } from "lucide-react";
import { useLayerStore } from "../stores/layer-store.js";
import { LAYER_REGISTRY } from "@terra/shared";
import type { LayerId } from "@terra/shared";

export function BottomBar(): React.ReactElement {
  const activeLayers = useLayerStore((s) => s.activeLayers);
  const toggleLayer = useLayerStore((s) => s.toggleLayer);

  const activeLayerEntries = Array.from(activeLayers).map((id) => ({
    id,
    label: LAYER_REGISTRY[id]?.label ?? id,
  }));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 rounded-full border border-terra-border bg-terra-surface/80 backdrop-blur-md px-4 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeLayerEntries.length === 0 && (
            <span className="text-[10px] text-terra-text-muted">No active layers</span>
          )}
          {activeLayerEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => toggleLayer(entry.id as LayerId)}
              className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-terra-text hover:bg-white/10 transition-colors"
            >
              {entry.label}
              <X className="h-2.5 w-2.5 text-terra-text-muted" />
            </button>
          ))}
        </div>

        {activeLayerEntries.length > 0 && (
          <>
            <div className="h-3 w-px bg-terra-border" />
            <span className="text-[10px] text-terra-text-muted tabular-nums">
              --.----, --.----
            </span>
          </>
        )}
      </div>
    </div>
  );
}
