import type { FastifyInstance } from "fastify";
import { EonetClient } from "../services/eonet-client.js";
import { TtlCache } from "../services/cache.js";
import type { NaturalEvent } from "@terra/shared";

const CACHE_TTL = 10 * 60 * 1000;

export async function registerEventsRoute(app: FastifyInstance): Promise<void> {
  const cache = new TtlCache<readonly NaturalEvent[]>(CACHE_TTL);
  const client = new EonetClient(cache);

  app.get("/api/events", async (_request, reply) => {
    const result = await client.getEvents();

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
