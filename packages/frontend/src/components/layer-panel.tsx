import { useMemo, useState } from "react";
import { ChevronRight, Layers, AlertTriangle } from "lucide-react";
import { useLayerStore } from "../stores/layer-store.js";
import { useEventStore } from "../stores/event-store.js";
import { LAYER_REGISTRY, CATEGORY_META } from "@terra/shared";
import type { LayerMetadata, EventCategoryId } from "@terra/shared";
import { Switch } from "./ui/switch.js";
import { Button } from "./ui/button.js";
import { ScrollArea } from "./ui/scroll-area.js";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip.js";
import { cn } from "@/lib/utils.js";

interface LayerGroupProps {
  title: string;
  layers: readonly LayerMetadata[];
  eventCountsByCategory: Map<EventCategoryId, number>;
}

function LayerGroup({ title, layers, eventCountsByCategory }: LayerGroupProps): React.ReactElement {
  const activeLayers = useLayerStore((s) => s.activeLayers);
  const toggleLayer = useLayerStore((s) => s.toggleLayer);
  const disabledLayers = useLayerStore((s) => s.disabledLayers);

  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[3px] text-terra-text-faint mb-2 px-1">
        {title}
      </h3>
      <div className="space-y-0.5">
        {layers.map((layer) => {
          const isActive = activeLayers.has(layer.id);
          const isDisabled = disabledLayers.has(layer.id);
          const disabledReason = disabledLayers.get(layer.id);
          const categoryColor = layer.group === "category"
            ? CATEGORY_META[layer.id as EventCategoryId]?.color
            : undefined;
          const eventCount = layer.group === "category"
            ? eventCountsByCategory.get(layer.id as EventCategoryId) ?? 0
            : undefined;

          const layerRow = (
            <div
              key={layer.id}
              role={isDisabled ? undefined : "button"}
              tabIndex={isDisabled ? -1 : 0}
              onClick={isDisabled ? undefined : () => toggleLayer(layer.id)}
              onKeyDown={isDisabled ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") toggleLayer(layer.id); }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                isDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : cn("hover:bg-white/4 cursor-pointer", isActive ? "text-terra-text" : "text-terra-text-muted"),
              )}
            >
              <div className="flex items-center gap-2">
                {categoryColor && (
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive && !isDisabled ? categoryColor : "transparent",
                      border: `1.5px solid ${categoryColor}`,
                    }}
                  />
                )}
                <span>{layer.label}</span>
                {eventCount !== undefined && eventCount > 0 && !isDisabled && (
                  <span className="text-[10px] text-terra-text-muted tabular-nums">
                    {eventCount}
                  </span>
                )}
              </div>
              <Switch
                checked={isActive && !isDisabled}
                onCheckedChange={isDisabled ? undefined : () => toggleLayer(layer.id)}
                className="scale-75 origin-right"
                onClick={(e) => e.stopPropagation()}
                disabled={isDisabled}
              />
            </div>
          );

          if (isDisabled && disabledReason) {
            return (
              <Tooltip key={layer.id}>
                <TooltipTrigger asChild>
                  {layerRow}
                </TooltipTrigger>
                <TooltipContent side="left">
                  {disabledReason}
                </TooltipContent>
              </Tooltip>
            );
          }

          return layerRow;
        })}
      </div>
    </div>
  );
}

function getLayersByGroup(): {
  categoryLayers: LayerMetadata[];
  enhancementLayers: LayerMetadata[];
  spaceWeatherLayers: LayerMetadata[];
  imageryLayers: LayerMetadata[];
} {
  const categoryLayers: LayerMetadata[] = [];
  const enhancementLayers: LayerMetadata[] = [];
  const spaceWeatherLayers: LayerMetadata[] = [];
  const imageryLayers: LayerMetadata[] = [];

  for (const layer of Object.values(LAYER_REGISTRY)) {
    switch (layer.group) {
      case "category":
        categoryLayers.push(layer);
        break;
      case "enhancement":
        enhancementLayers.push(layer);
        break;
      case "spaceWeather":
        spaceWeatherLayers.push(layer);
        break;
      case "imagery":
        imageryLayers.push(layer);
        break;
    }
  }

  return { categoryLayers, enhancementLayers, spaceWeatherLayers, imageryLayers };
}

export function LayerPanel(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const events = useEventStore((s) => s.events);
  const disabledLayers = useLayerStore((s) => s.disabledLayers);

  const uniqueDisabledReasons = useMemo(
    () => [...new Set(disabledLayers.values())],
    [disabledLayers],
  );

  const eventCountsByCategory = useMemo(() => {
    const counts = new Map<EventCategoryId, number>();
    for (const event of events) {
      const current = counts.get(event.category) ?? 0;
      counts.set(event.category, current + 1);
    }
    return counts;
  }, [events]);

  const { categoryLayers, enhancementLayers, spaceWeatherLayers, imageryLayers } = getLayersByGroup();

  return (
    <div
      className={cn(
        "fixed right-4 top-16 z-20 transition-all duration-300",
        isExpanded ? "w-[240px]" : "w-10",
      )}
    >
      {!isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg panel-surface"
          onClick={() => setIsExpanded(true)}
        >
          <Layers className="h-4 w-4 text-terra-text-muted" />
        </Button>
      )}

      {isExpanded && (
        <div className="relative overflow-hidden rounded-lg panel-surface accent-line edge-shimmer shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-terra-border">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-terra-text-muted" />
              <span className="text-xs font-medium text-terra-text">Layers</span>
              {uniqueDisabledReasons.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="font-medium mb-1">Services unavailable</p>
                    {uniqueDisabledReasons.map((reason) => (
                      <p key={reason} className="text-terra-text-muted">{reason}</p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronRight className="h-3.5 w-3.5 text-terra-text-muted" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-2">
              <LayerGroup
                title="Event Categories"
                layers={categoryLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
              <LayerGroup
                title="Enhancements"
                layers={enhancementLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
              <LayerGroup
                title="Space Weather"
                layers={spaceWeatherLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
              <LayerGroup
                title="Imagery"
                layers={imageryLayers}
                eventCountsByCategory={eventCountsByCategory}
              />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
