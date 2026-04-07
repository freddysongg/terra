import type { FastifyInstance } from "fastify";
import { DonkiClient } from "../services/donki-client.js";
import { TtlCache } from "../services/cache.js";
import type { SpaceWeatherSummary } from "@terra/shared";

const CACHE_TTL = 20 * 60 * 1000;

export async function registerSpaceWeatherRoute(app: FastifyInstance): Promise<void> {
  const cache = new TtlCache<SpaceWeatherSummary>(CACHE_TTL);
  const client = new DonkiClient(cache);

  app.get("/api/space-weather", async (_request, reply) => {
    const result = await client.getData();

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
