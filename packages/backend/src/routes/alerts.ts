import type { FastifyInstance } from "fastify";
import { NwsClient } from "../services/nws-client.js";
import { TtlCache } from "../services/cache.js";
import type { NwsAlert } from "@terra/shared";

const CACHE_TTL = 3 * 60 * 1000;

export async function registerAlertsRoute(app: FastifyInstance): Promise<void> {
  const cache = new TtlCache<readonly NwsAlert[]>(CACHE_TTL);
  const client = new NwsClient(cache);

  app.get("/api/alerts", async (_request, reply) => {
    const result = await client.getAlerts();

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
