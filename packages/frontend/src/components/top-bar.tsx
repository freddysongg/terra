import { Search, Settings, Sun } from "lucide-react";
import { useState } from "react";
import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import { Input } from "./ui/input.js";
import { Button } from "./ui/button.js";
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
  const isPerformanceMode = useGlobeStore((s) => s.isPerformanceMode);
  const togglePerformanceMode = useGlobeStore((s) => s.togglePerformanceMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeEventCount = events.filter((e) => e.status === "open").length;

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
