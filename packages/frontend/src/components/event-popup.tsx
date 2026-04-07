import { useEventStore } from "../stores/event-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent } from "@terra/shared";
import { X } from "lucide-react";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";
import { CategoryIcon } from "./category-icon.js";

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

export function EventPopup(): React.ReactElement | null {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const screenPosition = useEventStore((s) => s.selectedEventScreenPosition);
  const events = useEventStore((s) => s.events);
  const clearSelection = useEventStore((s) => s.clearSelection);

  if (!selectedEventId || !screenPosition) return null;

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  if (!selectedEvent) return null;

  const categoryMeta = CATEGORY_META[selectedEvent.category];
  const lastGeometry = selectedEvent.geometries[selectedEvent.geometries.length - 1];
  const magnitudeText = formatMagnitude(selectedEvent);

  return (
    <div
      className="fixed z-30 pointer-events-auto"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: "translate(-50%, -100%) translateY(-16px)",
      }}
    >
      <div className="w-[260px] rounded-lg border border-terra-border bg-terra-surface/90 backdrop-blur-md shadow-xl p-3">
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

        <button
          disabled
          className="mt-1 block text-[10px] text-terra-text-muted cursor-not-allowed"
        >
          View satellite imagery (coming soon)
        </button>
      </div>
    </div>
  );
}
