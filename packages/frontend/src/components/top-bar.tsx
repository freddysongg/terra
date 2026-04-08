import { Search, Settings, Globe } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, SpaceWeatherSummary } from "@terra/shared";
import { resolveLatestFlare, resolveFlarePrefix } from "./space-weather-card.js";
import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { useDataStore } from "../stores/data-store.js";
import { REGIONS } from "../constants/regions.js";
import type { Region } from "../constants/regions.js";
import { Input } from "./ui/input.js";
import { Button } from "./ui/button.js";
import { ScrollArea } from "./ui/scroll-area.js";
import { Switch } from "./ui/switch.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip.js";

interface SolarIndicatorState {
  dotClass: string;
  tooltipLabel: string;
}

function resolveSolarIndicator(spaceWeather: SpaceWeatherSummary | null): SolarIndicatorState {
  if (spaceWeather === null) {
    return { dotClass: "bg-gray-500", tooltipLabel: "Unavailable" };
  }

  const latestFlare = resolveLatestFlare(spaceWeather.solarFlares);
  if (latestFlare === null) {
    return { dotClass: "bg-gray-500", tooltipLabel: "No activity" };
  }

  const prefix = resolveFlarePrefix(latestFlare.classType);

  if (prefix === "X") {
    return { dotClass: "bg-red-500", tooltipLabel: "Solar storm" };
  }
  if (prefix === "M") {
    return { dotClass: "bg-yellow-500", tooltipLabel: "Active" };
  }
  return { dotClass: "bg-green-500", tooltipLabel: "Quiet" };
}

export function TopBar(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const searchQuery = useEventStore((s) => s.searchQuery);
  const setSearchQuery = useEventStore((s) => s.setSearchQuery);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const isPerformanceMode = useGlobeStore((s) => s.isPerformanceMode);
  const togglePerformanceMode = useGlobeStore((s) => s.togglePerformanceMode);
  const spaceWeather = useDataStore((s) => s.spaceWeather);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const solarIndicator = resolveSolarIndicator(spaceWeather);

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

  const matchingRegions: readonly Region[] = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return [];
    return REGIONS.filter((region) => region.name.toLowerCase().includes(trimmed));
  }, [searchQuery]);

  const hasDropdownResults = matchingEvents.length > 0 || matchingRegions.length > 0;

  const handleDropdownSelect = useCallback((eventId: string): void => {
    const selectedEvent = useEventStore.getState().events.find((e) => e.id === eventId);
    selectEvent(eventId);
    setSearchQuery("");

    if (selectedEvent) {
      const lastGeometry = selectedEvent.geometries[selectedEvent.geometries.length - 1];
      if (lastGeometry) {
        const [longitude, latitude] = lastGeometry.coordinates;
        useGlobeStore.getState().setFlyToTarget({ lat: latitude, lng: longitude });
      }
    }
  }, [selectEvent, setSearchQuery]);

  const handleRegionSelect = useCallback((region: Region): void => {
    useGlobeStore.getState().setFlyToTarget({ lat: region.lat, lng: region.lng });
    setSearchQuery("");
  }, [setSearchQuery]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 w-[40vw] min-w-[300px] max-w-[600px]">
        <div className="flex items-center gap-2 rounded-full panel-surface px-3 py-1.5 shadow-lg">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-terra-text-muted" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-[180px] rounded-full border-none bg-transparent pl-8 pr-3 text-xs text-terra-text placeholder:text-terra-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery.trim() && hasDropdownResults && (
              <div className="absolute left-0 top-full mt-1 w-[260px] rounded-lg panel-surface shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                <ScrollArea className="max-h-[240px]">
                  <div className="p-1">
                    {matchingRegions.length > 0 && (
                      <>
                        <div className="px-2.5 py-1 text-[10px] text-terra-text-muted uppercase tracking-wider">
                          Regions
                        </div>
                        {matchingRegions.map((region) => (
                          <button
                            key={region.name}
                            onClick={() => handleRegionSelect(region)}
                            className="flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left hover:bg-white/4 transition-colors"
                          >
                            <Globe className="h-3 w-3 shrink-0 text-terra-text-muted" />
                            <span className="text-xs text-terra-text truncate">
                              {region.name}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {matchingEvents.length > 0 && (
                      <>
                        <div className="px-2.5 py-1 text-[10px] text-terra-text-muted uppercase tracking-wider">
                          Events
                        </div>
                        {matchingEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleDropdownSelect(event.id)}
                            className="flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left hover:bg-white/4 transition-colors"
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
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-terra-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2">
                <div className="h-2 w-2 rounded-full bg-terra-azure animate-pulse" />
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
                <div className={`h-2 w-2 rounded-full ${solarIndicator.dotClass}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Solar activity: {solarIndicator.tooltipLabel}</p>
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
              <div className="absolute right-0 top-full mt-2 w-[200px] rounded-lg panel-surface shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3">
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
  );
}
