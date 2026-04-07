import { useCallback, useEffect, useRef } from "react";
import { useDataStore } from "../stores/data-store.js";
import type { ApiResponse } from "@terra/shared";

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

interface GibsImageryHook {
  fetchImagery: (layer: string, date: string, z: number, y: number, x: number) => Promise<void>;
}

export function useGibsImagery(): GibsImageryHook {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchImagery = useCallback(
    async (layer: string, date: string, z: number, y: number, x: number): Promise<void> => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const url = await fetchImageryUrl(layer, date, z, y, x, abortController.signal);
        if (!abortController.signal.aborted) {
          useDataStore.getState().setActiveImageryUrl(url);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("gibs imagery fetch failed:", err);
        }
      }
    },
    [],
  );

  return { fetchImagery };
}
