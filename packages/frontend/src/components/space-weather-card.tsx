import { Sun } from "lucide-react";
import { useDataStore } from "../stores/data-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import type { SpaceWeatherSummary, SolarFlare, CoronalMassEjection } from "@terra/shared";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.js";
import { Badge } from "./ui/badge.js";

interface FlareClassDisplay {
  classLabel: string;
  badgeClass: string;
}

function resolveFlareClassDisplay(classType: string): FlareClassDisplay {
  const prefix = classType[0]?.toUpperCase() ?? "";

  if (prefix === "X") {
    return { classLabel: "Solar storm", badgeClass: "border-terra-border text-terra-text-secondary" };
  }
  if (prefix === "M") {
    return { classLabel: "Active", badgeClass: "border-terra-border text-terra-text-secondary" };
  }
  return { classLabel: "Quiet", badgeClass: "border-terra-border text-terra-text-secondary" };
}

function formatRelativeTime(isoTime: string): string {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function resolveLatestFlare(flares: readonly SolarFlare[]): SolarFlare | null {
  if (flares.length === 0) return null;
  return [...flares].sort(
    (a, b) => new Date(b.beginTime).getTime() - new Date(a.beginTime).getTime(),
  )[0]!;
}

export function resolveFlarePrefix(classType: string): string {
  return classType[0]?.toUpperCase() ?? "";
}

function resolveCmeStatus(cmes: readonly CoronalMassEjection[]): string {
  const earthDirected = cmes.filter((cme) => cme.estimatedEarthArrival !== null);

  if (earthDirected.length === 0) {
    return "No Earth-directed CMEs";
  }

  const soonest = earthDirected.sort(
    (a, b) =>
      new Date(a.estimatedEarthArrival!).getTime() -
      new Date(b.estimatedEarthArrival!).getTime(),
  )[0]!;

  const hoursUntilArrival = Math.round(
    (new Date(soonest.estimatedEarthArrival!).getTime() - Date.now()) / (1000 * 60 * 60),
  );

  if (hoursUntilArrival <= 0) {
    return "CME arriving now ±6h";
  }

  return `Arriving in ~${hoursUntilArrival}h ±6h`;
}

interface SpaceWeatherBodyProps {
  summary: SpaceWeatherSummary;
}

function SpaceWeatherBody({ summary }: SpaceWeatherBodyProps): React.ReactElement {
  const latestFlare = resolveLatestFlare(summary.solarFlares);
  const cmeStatus = resolveCmeStatus(summary.coronalMassEjections);
  const flareDisplay = latestFlare !== null ? resolveFlareClassDisplay(latestFlare.classType) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-terra-text-muted text-[13px]">Solar Activity</span>
        {latestFlare !== null && flareDisplay !== null ? (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${flareDisplay.badgeClass}`}
            >
              {latestFlare.classType}
            </Badge>
            <span className="text-terra-text text-[13px]">{flareDisplay.classLabel}</span>
          </div>
        ) : (
          <span className="text-terra-azure text-[13px]">None detected</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-terra-text-muted text-[13px]">Last flare</span>
        <span className="text-terra-text text-[13px]">
          {latestFlare !== null ? formatRelativeTime(latestFlare.beginTime) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-terra-text-muted text-[13px]">CME Status</span>
        <span className="text-terra-text text-[13px] text-right">{cmeStatus}</span>
      </div>
    </div>
  );
}

export function SpaceWeatherCard(): React.ReactElement | null {
  const spaceWeather = useDataStore((s) => s.spaceWeather);
  const activeLayers = useLayerStore((s) => s.activeLayers);

  if (!activeLayers.has("spaceWeather")) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-16 z-20">
      <Card className="w-[260px] panel-surface accent-line edge-shimmer relative overflow-hidden shadow-lg">
        <CardHeader className="px-3 py-2 pb-2 border-b border-terra-border/50">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-terra-text tracking-[0.5px]">
            <Sun className="h-3.5 w-3.5 text-terra-text-muted" />
            Space Weather
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {spaceWeather !== null ? (
            <SpaceWeatherBody summary={spaceWeather} />
          ) : (
            <p className="text-xs text-terra-text-muted">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
