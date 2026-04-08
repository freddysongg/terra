import { useEffect, useRef } from "react";
import { useDataStore } from "../stores/data-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import type { ApiResponse, SpaceWeatherSummary } from "@terra/shared";

const POLL_INTERVAL_MS = 20 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

async function fetchSpaceWeather(signal: AbortSignal): Promise<SpaceWeatherSummary> {
  const response = await fetch("/api/space-weather", { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<SpaceWeatherSummary>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

async function fetchWithRetry(signal: AbortSignal): Promise<SpaceWeatherSummary> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchSpaceWeather(signal);
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("fetch space weather failed after retries");
}

export function useDonkiPolling(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function poll(): Promise<void> {
      useDataStore.getState().setLoadingSpaceWeather(true);
      try {
        const summary = await fetchWithRetry(abortController.signal);
        if (!abortController.signal.aborted) {
          const store = useDataStore.getState();
          store.setSpaceWeather(summary);
          store.setLoadingSpaceWeather(false);
          useLayerStore.getState().enableLayer("spaceWeather");
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("donki polling failed:", err);
          useDataStore.getState().setLoadingSpaceWeather(false);
          useLayerStore.getState().disableLayer("spaceWeather", "Space weather service unavailable");
        }
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      abortController.abort();
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
