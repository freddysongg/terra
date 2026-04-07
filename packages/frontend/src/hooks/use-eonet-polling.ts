import { useEffect, useRef } from "react";
import { useEventStore } from "../stores/event-store.js";
import type { ApiResponse, NaturalEvent } from "@terra/shared";

const POLL_INTERVAL_MS = 10 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

async function fetchEvents(signal: AbortSignal): Promise<readonly NaturalEvent[]> {
  const response = await fetch("/api/events", { signal });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<readonly NaturalEvent[]>;
  if (body.status === "error") {
    throw new Error(body.message);
  }

  return body.data;
}

async function fetchWithRetry(signal: AbortSignal): Promise<readonly NaturalEvent[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchEvents(signal);
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("fetch events failed after retries");
}

export function useEonetPolling(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function poll(): Promise<void> {
      try {
        const events = await fetchWithRetry(abortController.signal);
        if (!abortController.signal.aborted) {
          useEventStore.getState().setEvents(events);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("eonet polling failed:", err);
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
