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
      <div className="mb-4 text-[13px] tracking-[2px] uppercase text-white/40 font-[-apple-system,sans-serif]">
        Loading
      </div>
      <div className="w-[200px] h-px bg-white/[0.08] overflow-hidden">
        <div
          className="h-full bg-terra-cyan/50 transition-[width] duration-300 ease-out"
          style={{ width: `${loadProgress}%` }}
        />
      </div>
    </div>
  );
}
