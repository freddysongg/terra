import { useEffect, useRef } from "react";
import { useLayerStore } from "../stores/layer-store.js";
import { useDataStore } from "../stores/data-store.js";
import type { ApiResponse, FireHotspot } from "@terra/shared";

const POLL_INTERVAL_MS = 30 * 60 * 1000;
const RETRY_INTERVAL_MS = 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const LAYER_ID = "fireDensity" as const;
const DISABLED_REASON = "FIRMS fire data unavailable";

async function fetchFires(signal: AbortSignal): Promise<readonly FireHotspot[]> {
  const response = await fetch("/api/fires", { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<readonly FireHotspot[]>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

async function fetchWithRetry(signal: AbortSignal): Promise<readonly FireHotspot[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchFires(signal);
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("fetch fires failed after retries");
}

export function useFirmsPolling(): void {
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
      useDataStore.getState().setFireHotspots([]);
    }

    function startRetryLoop(): void {
      clearRetryTimer();
      const retryAbort = new AbortController();
      abortControllerRef.current = retryAbort;

      retryTimerRef.current = setInterval(async () => {
        try {
          const hotspots = await fetchWithRetry(retryAbort.signal);
          if (!retryAbort.signal.aborted) {
            useDataStore.getState().setFireHotspots(hotspots);
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
        useDataStore.getState().setLoadingFires(true);
        try {
          const hotspots = await fetchWithRetry(abortController.signal);
          if (!abortController.signal.aborted) {
            const store = useDataStore.getState();
            store.setFireHotspots(hotspots);
            store.setLoadingFires(false);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            console.error("firms polling failed:", err);
            useDataStore.getState().setLoadingFires(false);
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
