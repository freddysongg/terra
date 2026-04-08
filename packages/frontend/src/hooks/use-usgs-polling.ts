import { useEffect, useRef } from "react";
import { useLayerStore } from "../stores/layer-store.js";
import { useDataStore } from "../stores/data-store.js";
import type { ApiResponse, Earthquake } from "@terra/shared";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_INTERVAL_MS = 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const LAYER_ID = "seismicDensity" as const;
const DISABLED_REASON = "USGS earthquake data unavailable";

async function fetchEarthquakes(signal: AbortSignal): Promise<readonly Earthquake[]> {
  const response = await fetch("/api/earthquakes", { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<readonly Earthquake[]>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

async function fetchWithRetry(signal: AbortSignal): Promise<readonly Earthquake[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchEarthquakes(signal);
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("fetch earthquakes failed after retries");
}

export function useUsgsPolling(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const retryTimerRef: { current: ReturnType<typeof setInterval> | null } = { current: null };

    function clearRetryTimer(): void {
      if (retryTimerRef.current !== null) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }

    function stopPolling(): void {
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      useDataStore.getState().setEarthquakes([]);
    }

    function startRetryLoop(): void {
      clearRetryTimer();
      const retryAbort = new AbortController();
      abortControllerRef.current = retryAbort;

      retryTimerRef.current = setInterval(async () => {
        try {
          const earthquakes = await fetchWithRetry(retryAbort.signal);
          if (!retryAbort.signal.aborted) {
            useDataStore.getState().setEarthquakes(earthquakes);
            clearRetryTimer();
            useLayerStore.getState().enableLayer(LAYER_ID);
          }
        } catch {
          /* retry on next interval */
        }
      }, RETRY_INTERVAL_MS);
    }

    function startPolling(): void {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      async function poll(): Promise<void> {
        useDataStore.getState().setLoadingEarthquakes(true);
        try {
          const earthquakes = await fetchWithRetry(abortController.signal);
          if (!abortController.signal.aborted) {
            const store = useDataStore.getState();
            store.setEarthquakes(earthquakes);
            store.setLoadingEarthquakes(false);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            console.error("usgs polling failed:", err);
            useDataStore.getState().setLoadingEarthquakes(false);
            useLayerStore.getState().disableLayer(LAYER_ID, DISABLED_REASON);
            startRetryLoop();
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
        clearRetryTimer();
        startPolling();
      } else if (wasActive && !isNowActive) {
        stopPolling();
      }
    });

    return () => {
      unsubscribe();
      clearRetryTimer();
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
