import { useEffect, useRef } from "react";
import { useLayerStore } from "../stores/layer-store.js";
import { useDataStore } from "../stores/data-store.js";
import type { ApiResponse, NwsAlert } from "@terra/shared";

const POLL_INTERVAL_MS = 3 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const LAYER_ID = "weatherAlerts" as const;

async function fetchAlerts(signal: AbortSignal): Promise<readonly NwsAlert[]> {
  const response = await fetch("/api/alerts", { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<readonly NwsAlert[]>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

async function fetchWithRetry(signal: AbortSignal): Promise<readonly NwsAlert[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchAlerts(signal);
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("fetch alerts failed after retries");
}

export function useNwsPolling(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function stopPolling(): void {
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      useDataStore.getState().setWeatherAlerts([]);
    }

    function startPolling(): void {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      async function poll(): Promise<void> {
        useDataStore.getState().setLoadingWeatherAlerts(true);
        try {
          const alerts = await fetchWithRetry(abortController.signal);
          if (!abortController.signal.aborted) {
            const store = useDataStore.getState();
            store.setWeatherAlerts(alerts);
            store.setLoadingWeatherAlerts(false);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            console.error("nws polling failed:", err);
            useDataStore.getState().setLoadingWeatherAlerts(false);
            useLayerStore.getState().toggleLayer(LAYER_ID);
          }
        }
      }

      poll();
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }

    if (useLayerStore.getState().activeLayers.has(LAYER_ID)) {
      startPolling();
    }

    const unsubscribe = useLayerStore.subscribe((state, prevState) => {
      const wasActive = prevState.activeLayers.has(LAYER_ID);
      const isNowActive = state.activeLayers.has(LAYER_ID);

      if (!wasActive && isNowActive) {
        startPolling();
      } else if (wasActive && !isNowActive) {
        stopPolling();
      }
    });

    return () => {
      unsubscribe();
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
