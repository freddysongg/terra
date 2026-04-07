import { useEventStore } from "../stores/event-store.js";
import { useDataStore } from "../stores/data-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";
import { X, Satellite } from "lucide-react";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";
import { CategoryIcon } from "./category-icon.js";
import { useGibsImagery } from "../hooks/use-gibs-imagery.js";

const DEFAULT_GIBS_LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";

const CATEGORY_GIBS_LAYER: Partial<Record<EventCategoryId, string>> = {
  wildfires: "MODIS_Terra_CorrectedReflectance_TrueColor",
  volcanoes: "MODIS_Terra_CorrectedReflectance_TrueColor",
  severeStorms: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
  floods: "MODIS_Aqua_CorrectedReflectance_TrueColor",
  landslides: "MODIS_Terra_CorrectedReflectance_TrueColor",
  snow: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
  seaLakeIce: "MODIS_Terra_CorrectedReflectance_TrueColor",
  dustHaze: "MODIS_Terra_CorrectedReflectance_TrueColor",
};

const GIBS_ZOOM = 3;

function latLngToTileCoords(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((90 - lat) / 180) * n);
  return { x, y };
}

function gibsLayerForCategory(category: EventCategoryId): string {
  return CATEGORY_GIBS_LAYER[category] ?? DEFAULT_GIBS_LAYER;
}

type PopupPlacement = "above" | "below" | "left" | "right";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMagnitude(event: NaturalEvent): string | null {
  if (!event.magnitude) return null;
  return `${event.magnitude.value} ${event.magnitude.unit}`;
}

function resolvePopupPlacement(x: number, y: number): PopupPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (x > vw * 0.7) return "left";
  if (x < vw * 0.3) return "right";
  if (y < vh * 0.2) return "below";
  return "above";
}

function resolvePopupTransform(placement: PopupPlacement): string {
  switch (placement) {
    case "above":
      return "translate(-50%, -100%) translateY(-16px)";
    case "below":
      return "translate(-50%, 16px)";
    case "left":
      return "translate(calc(-100% - 16px), -50%)";
    case "right":
      return "translate(16px, -50%)";
  }
}

interface ConnectorProps {
  placement: PopupPlacement;
  categoryColor: string;
}

function ConnectorLine({ placement, categoryColor }: ConnectorProps): React.ReactElement | null {
  const connectorLength = 16;

  const isVertical = placement === "above" || placement === "below";
  const width = isVertical ? 1 : connectorLength;
  const height = isVertical ? connectorLength : 1;

  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;

  switch (placement) {
    case "above":
      x1 = 0.5;
      y1 = connectorLength;
      x2 = 0.5;
      y2 = 0;
      break;
    case "below":
      x1 = 0.5;
      y1 = 0;
      x2 = 0.5;
      y2 = connectorLength;
      break;
    case "left":
      x1 = connectorLength;
      y1 = 0.5;
      x2 = 0;
      y2 = 0.5;
      break;
    case "right":
      x1 = 0;
      y1 = 0.5;
      x2 = connectorLength;
      y2 = 0.5;
      break;
  }

  const positionStyle: React.CSSProperties =
    placement === "above"
      ? { bottom: -connectorLength, left: "50%", transform: "translateX(-50%)" }
      : placement === "below"
        ? { top: -connectorLength, left: "50%", transform: "translateX(-50%)" }
        : placement === "left"
          ? { right: -connectorLength, top: "50%", transform: "translateY(-50%)" }
          : { left: -connectorLength, top: "50%", transform: "translateY(-50%)" };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute pointer-events-none"
      style={positionStyle}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={categoryColor}
        strokeWidth={1}
        strokeOpacity={0.4}
      />
    </svg>
  );
}

export function EventPopup(): React.ReactElement | null {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const screenPosition = useEventStore((s) => s.selectedEventScreenPosition);
  const events = useEventStore((s) => s.events);
  const clearSelection = useEventStore((s) => s.clearSelection);
  const activeImageryUrl = useDataStore((s) => s.activeImageryUrl);
  const clearImagery = useDataStore((s) => s.clearImagery);
  const { fetchImagery } = useGibsImagery();

  if (!selectedEventId || !screenPosition) return null;

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  if (!selectedEvent) return null;

  const categoryMeta = CATEGORY_META[selectedEvent.category];
  const lastGeometry = selectedEvent.geometries[selectedEvent.geometries.length - 1];
  const magnitudeText = formatMagnitude(selectedEvent);

  const placement = resolvePopupPlacement(screenPosition.x, screenPosition.y);
  const transform = resolvePopupTransform(placement);

  return (
    <div
      className="fixed z-30 pointer-events-auto"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform,
      }}
    >
      <div className="relative w-[280px] rounded-lg border border-terra-border bg-terra-surface/90 backdrop-blur-md shadow-xl p-3">
        <ConnectorLine placement={placement} categoryColor={categoryMeta.color} />
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-terra-text leading-tight">
            {selectedEvent.title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={clearSelection}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 flex items-center gap-1"
            style={{ borderColor: categoryMeta.color, color: categoryMeta.color }}
          >
            <CategoryIcon iconName={categoryMeta.icon} className="h-2.5 w-2.5" />
            {categoryMeta.label}
          </Badge>
          <Badge
            variant={selectedEvent.status === "open" ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {selectedEvent.status === "open" ? "Active" : "Closed"}
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-terra-text-muted">
          {lastGeometry && (
            <p>
              {lastGeometry.coordinates[1]!.toFixed(2)}, {lastGeometry.coordinates[0]!.toFixed(2)}
            </p>
          )}
          {magnitudeText && <p>{magnitudeText}</p>}
          {lastGeometry && <p>{formatDate(lastGeometry.timestamp)}</p>}
          <p className="text-[10px]">Source: {selectedEvent.sourceAgency}</p>
        </div>

        {selectedEvent.sourceUrl && (
          <a
            href={selectedEvent.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-[10px] text-terra-cyan hover:underline"
          >
            View source
          </a>
        )}

        {activeImageryUrl ? (
          <button
            className="mt-1 flex items-center gap-1 text-[10px] text-terra-cyan hover:underline"
            onClick={clearImagery}
          >
            <X className="h-2.5 w-2.5" />
            Close satellite imagery
          </button>
        ) : (
          <button
            className="mt-1 flex items-center gap-1 text-[10px] text-terra-cyan hover:underline"
            onClick={() => {
              if (!lastGeometry) return;
              const [longitude, latitude] = lastGeometry.coordinates;
              const layer = gibsLayerForCategory(selectedEvent.category);
              const date = lastGeometry.timestamp.slice(0, 10);
              const { x, y } = latLngToTileCoords(latitude, longitude, GIBS_ZOOM);

              useDataStore.getState().setImageryEventCoordinates({ lat: latitude, lng: longitude });
              fetchImagery(layer, date, GIBS_ZOOM, y, x);
            }}
          >
            <Satellite className="h-2.5 w-2.5" />
            View satellite imagery
          </button>
        )}
      </div>
    </div>
  );
}
