import { useEffect, useCallback } from "react";
import { GlobeCanvas } from "./components/globe-canvas.js";
import { LoadingScreen } from "./components/loading-screen.js";
import { Vignette } from "./components/vignette.js";
import { DataProvider } from "./components/data-provider.js";
import { TopBar } from "./components/top-bar.js";
import { LayerPanel } from "./components/layer-panel.js";
import { SpaceWeatherCard } from "./components/space-weather-card.js";
import { EventFeed } from "./components/event-feed.js";
import { EventPopup } from "./components/event-popup.js";
import { BottomBar } from "./components/bottom-bar.js";
import { useEventStore } from "./stores/event-store.js";
import { useGlobeStore } from "./stores/globe-store.js";

export function App(): React.ReactElement {
  const isLoaded = useGlobeStore((s) => s.isLoaded);
  const clearSelection = useEventStore((s) => s.clearSelection);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection();
      }
    },
    [clearSelection],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <DataProvider>
      <div className="relative w-full h-full">
        <GlobeCanvas />
        <Vignette />
        <LoadingScreen />
        {isLoaded && (
          <>
            <div className="animate-[fade-slide-down_0.4s_ease-out_both]">
              <TopBar />
            </div>
            <div className="animate-[fade-slide-right_0.4s_ease-out_0.1s_both]">
              <EventFeed />
            </div>
            <div className="animate-[fade-slide-left_0.4s_ease-out_0.2s_both]">
              <LayerPanel />
            </div>
            <div className="animate-[fade-slide-left_0.4s_ease-out_0.4s_both]">
              <SpaceWeatherCard />
            </div>
            <EventPopup />
            <div className="animate-[fade-slide-up_0.4s_ease-out_0.3s_both]">
              <BottomBar />
            </div>
          </>
        )}
      </div>
    </DataProvider>
  );
}
