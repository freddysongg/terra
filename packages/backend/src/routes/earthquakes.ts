import type { FastifyInstance } from "fastify";
import { UsgsClient } from "../services/usgs-client.js";
import { TtlCache } from "../services/cache.js";
import type { Earthquake } from "@terra/shared";

const CACHE_TTL = 5 * 60 * 1000;

export async function registerEarthquakesRoute(
  app: FastifyInstance,
): Promise<void> {
  const cache = new TtlCache<readonly Earthquake[]>(CACHE_TTL);
  const client = new UsgsClient(cache);

  app.get("/api/earthquakes", async (_request, reply) => {
    const result = await client.getEarthquakes();

    if (result.status === "error") {
      const statusMap = {
        UPSTREAM_UNAVAILABLE: 502,
        RATE_LIMITED: 429,
        PARSE_FAILED: 502,
        TIMEOUT: 504,
      } as const;
      return reply.status(statusMap[result.code]).send(result);
    }

    if (result.cached) {
      reply.header("X-Cache", "STALE");
    }

    return reply.send(result);
  });
}
