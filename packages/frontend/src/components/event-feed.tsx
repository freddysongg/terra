import { useMemo, useState } from "react";
import { ChevronLeft, Activity, Clock } from "lucide-react";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";
import { Button } from "./ui/button.js";
import { ScrollArea } from "./ui/scroll-area.js";
import { Badge } from "./ui/badge.js";
import { cn } from "@/lib/utils.js";

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "< 1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getMostActiveCategory(events: readonly NaturalEvent[]): string | null {
  if (events.length === 0) return null;

  const counts = new Map<EventCategoryId, number>();
  for (const event of events) {
    counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
  }

  let maxCategory: EventCategoryId | null = null;
  let maxCount = 0;
  for (const [category, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category;
    }
  }

  return maxCategory ? CATEGORY_META[maxCategory].label : null;
}

function getLastUpdatedTime(events: readonly NaturalEvent[]): string | null {
  if (events.length === 0) return null;

  let latestTimestamp = "";
  for (const event of events) {
    const lastGeometry = event.geometries[event.geometries.length - 1];
    if (lastGeometry && lastGeometry.timestamp > latestTimestamp) {
      latestTimestamp = lastGeometry.timestamp;
    }
  }

  return latestTimestamp ? formatRelativeTime(latestTimestamp) : null;
}

interface EventListItemProps {
  event: NaturalEvent;
  isSelected: boolean;
  onSelect: (eventId: string) => void;
}

function EventListItem({ event, isSelected, onSelect }: EventListItemProps): React.ReactElement {
  const categoryMeta = CATEGORY_META[event.category];
  const lastGeometry = event.geometries[event.geometries.length - 1];

  return (
    <button
      onClick={() => onSelect(event.id)}
      className={cn(
        "w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-white/5",
        isSelected && "bg-white/10 ring-1 ring-terra-cyan/30",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: categoryMeta.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-terra-text truncate">
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px]"
              style={{ color: categoryMeta.color }}
            >
              {categoryMeta.label}
            </span>
            {lastGeometry && (
              <span className="text-[10px] text-terra-text-muted">
                {formatRelativeTime(lastGeometry.timestamp)}
              </span>
            )}
          </div>
          {event.magnitude && (
            <span className="text-[10px] text-terra-text-muted">
              {event.magnitude.value} {event.magnitude.unit}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function EventFeed(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const events = useEventStore((s) => s.events);
  const searchQuery = useEventStore((s) => s.searchQuery);
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const activeLayers = useLayerStore((s) => s.activeLayers);

  const filteredEvents = useMemo(() => {
    let result = events.filter((e) => activeLayers.has(e.category));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          CATEGORY_META[e.category].label.toLowerCase().includes(query),
      );
    }

    return result;
  }, [events, activeLayers, searchQuery]);

  const activeCount = filteredEvents.filter((e) => e.status === "open").length;
  const mostActiveCategory = getMostActiveCategory(filteredEvents);
  const lastUpdated = getLastUpdatedTime(filteredEvents);

  return (
    <div
      className={cn(
        "fixed left-4 top-16 z-20 transition-all duration-300",
        isExpanded ? "w-[280px]" : "w-10",
      )}
    >
      {!isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg border border-terra-border bg-terra-surface/80 backdrop-blur-md"
          onClick={() => setIsExpanded(true)}
        >
          <Activity className="h-4 w-4 text-terra-text-muted" />
        </Button>
      )}

      {isExpanded && (
        <div className="rounded-lg border border-terra-border bg-terra-surface/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-terra-border">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-terra-text-muted" />
              <span className="text-xs font-medium text-terra-text">Events</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronLeft className="h-3.5 w-3.5 text-terra-text-muted" />
            </Button>
          </div>

          <div className="px-3 py-2 border-b border-terra-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-terra-text-muted">Active events</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {activeCount}
              </Badge>
            </div>
            {mostActiveCategory && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-terra-text-muted">Most active</span>
                <span className="text-[10px] text-terra-text">{mostActiveCategory}</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-terra-text-muted flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  Last updated
                </span>
                <span className="text-[10px] text-terra-text">{lastUpdated}</span>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="p-1.5 space-y-0.5">
              {filteredEvents.length === 0 && (
                <p className="text-xs text-terra-text-muted text-center py-8">
                  No events match active layers
                </p>
              )}
              {filteredEvents.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  isSelected={event.id === selectedEventId}
                  onSelect={selectEvent}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
