import { useEffect, useRef } from "react";
import { GlobeScene } from "../globe/globe-scene.js";
import { useGlobeStore } from "../stores/globe-store.js";

export function GlobeCanvas(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GlobeScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { setLoadProgress, setLoaded } = useGlobeStore.getState();

    sceneRef.current = new GlobeScene({
      canvas,
      onProgress: setLoadProgress,
      onReady: setLoaded,
    });

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}
