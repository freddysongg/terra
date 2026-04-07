import { Search, Settings, Sun } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent } from "@terra/shared";
import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { Input } from "./ui/input.js";
import { Button } from "./ui/button.js";
import { ScrollArea } from "./ui/scroll-area.js";
import { Switch } from "./ui/switch.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip.js";

export function TopBar(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const searchQuery = useEventStore((s) => s.searchQuery);
  const setSearchQuery = useEventStore((s) => s.setSearchQuery);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const setSelectedScreenPosition = useEventStore((s) => s.setSelectedScreenPosition);
  const isPerformanceMode = useGlobeStore((s) => s.isPerformanceMode);
  const togglePerformanceMode = useGlobeStore((s) => s.togglePerformanceMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeEventCount = events.filter((e) => e.status === "open").length;

  const MAX_DROPDOWN_RESULTS = 8;

  const matchingEvents: readonly NaturalEvent[] = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return [];
    return events.filter((event) => {
      const categoryLabel = CATEGORY_META[event.category]?.label ?? "";
      return (
        event.title.toLowerCase().includes(trimmed) ||
        categoryLabel.toLowerCase().includes(trimmed)
      );
    }).slice(0, MAX_DROPDOWN_RESULTS);
  }, [events, searchQuery]);

  const handleDropdownSelect = useCallback((id: string): void => {
    selectEvent(id);
    setSelectedScreenPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 3,
    });
    setSearchQuery("");
  }, [selectEvent, setSelectedScreenPosition, setSearchQuery]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 rounded-full border border-terra-border bg-terra-surface/80 backdrop-blur-md px-3 py-1.5 shadow-lg">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-terra-text-muted" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-[180px] rounded-full border-none bg-transparent pl-8 pr-3 text-xs text-terra-text placeholder:text-terra-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery.trim() && matchingEvents.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-[260px] rounded-lg border border-terra-border bg-terra-surface/95 backdrop-blur-md shadow-xl overflow-hidden z-50">
                <ScrollArea className="max-h-[240px]">
                  <div className="p-1">
                    {matchingEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => handleDropdownSelect(event.id)}
                        className="flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors"
                      >
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: CATEGORY_META[event.category]?.color }}
                        />
                        <span className="text-xs text-terra-text truncate">
                          {event.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-terra-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2">
                <div className="h-2 w-2 rounded-full bg-terra-cyan animate-pulse" />
                <span className="text-xs text-terra-text-muted tabular-nums">
                  {activeEventCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{activeEventCount} active events</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-terra-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center px-1">
                <Sun className="h-3.5 w-3.5 text-terra-text-muted/40" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Solar activity (coming soon)</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-terra-border" />

          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                  <Settings className="h-3.5 w-3.5 text-terra-text-muted" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-[200px] rounded-lg border border-terra-border bg-terra-surface/90 backdrop-blur-md shadow-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-terra-text">Performance mode</span>
                  <Switch
                    checked={isPerformanceMode}
                    onCheckedChange={togglePerformanceMode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
