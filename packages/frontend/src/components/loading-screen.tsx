import { useGlobeStore } from "../stores/globe-store.js";

export function LoadingScreen(): React.ReactElement {
  const isLoaded = useGlobeStore((s) => s.isLoaded);
  const loadProgress = useGlobeStore((s) => s.loadProgress);

  return (
    <div
      className={`fixed inset-0 z-10 flex flex-col items-center justify-center bg-terra-bg transition-opacity duration-800 ${
        isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        className="mb-4 text-[11px] font-semibold tracking-[4px] uppercase text-terra-text-faint"
        style={{ animation: "load-pulse 2s ease-in-out infinite" }}
      >
        TERRA
      </div>
      <div className="w-[200px] h-0.5 bg-terra-azure/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-terra-azure/60 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${loadProgress}%` }}
        />
      </div>
      <div className="mt-2.5 text-[10px] text-terra-text-faint tracking-[1px] tabular-nums">
        {Math.round(loadProgress)}%
      </div>
    </div>
  );
}
