import type { FastifyInstance } from "fastify";
import { FirmsClient } from "../services/firms-client.js";
import { TtlCache } from "../services/cache.js";
import type { FireHotspot } from "@terra/shared";

const CACHE_TTL = 30 * 60 * 1000;

interface FiresQuerystring {
  bbox?: string;
}

const STATUS_MAP = {
  UPSTREAM_UNAVAILABLE: 502,
  RATE_LIMITED: 429,
  PARSE_FAILED: 502,
  TIMEOUT: 504,
} as const;

export async function registerFiresRoute(app: FastifyInstance): Promise<void> {
  const cache = new TtlCache<readonly FireHotspot[]>(CACHE_TTL);
  const client = new FirmsClient(cache);

  app.get<{ Querystring: FiresQuerystring }>(
    "/api/fires",
    async (request, reply) => {
      const bbox = request.query.bbox ?? "world";
      const result = await client.getData(bbox);

      if (result.status === "error") {
        return reply.status(STATUS_MAP[result.code]).send(result);
      }

      if (result.cached) {
        reply.header("X-Cache", "STALE");
      }

      return reply.send(result);
    },
  );
}
