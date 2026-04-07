import { useCallback, useState } from "react";
import type { ApiResponse } from "@terra/shared";

interface GibsImageryHook {
  fetchImagery: (layer: string, date: string, z: number, y: number, x: number) => Promise<void>;
  activeImageryUrl: string | null;
}

async function fetchImageryUrl(
  layer: string,
  date: string,
  z: number,
  y: number,
  x: number,
  signal: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({ date, z: String(z), y: String(y), x: String(x) });
  const response = await fetch(`/api/imagery/${layer}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<string>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

export function useGibsImagery(): GibsImageryHook {
  const [activeImageryUrl, setActiveImageryUrl] = useState<string | null>(null);

  const fetchImagery = useCallback(
    async (layer: string, date: string, z: number, y: number, x: number): Promise<void> => {
      const abortController = new AbortController();
      try {
        const url = await fetchImageryUrl(layer, date, z, y, x, abortController.signal);
        setActiveImageryUrl(url);
      } catch (err) {
        console.error("gibs imagery fetch failed:", err);
      }
    },
    [],
  );

  return { fetchImagery, activeImageryUrl };
}
