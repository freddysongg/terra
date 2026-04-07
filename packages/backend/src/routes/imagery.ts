import type { FastifyInstance } from "fastify";
import { GibsService } from "../services/gibs-service.js";
import { TtlCache } from "../services/cache.js";

const CACHE_TTL = 24 * 60 * 60 * 1000;

interface ImageryParams {
  layer: string;
}

interface ImageryQuerystring {
  date?: string;
  z?: string;
  x?: string;
  y?: string;
}

function parseNonNegativeInt(raw: string | undefined, name: string): number | string {
  if (raw === undefined) return `${name} is required`;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return `${name} must be a non-negative integer`;
  }
  return parsed;
}

export async function registerImageryRoute(app: FastifyInstance): Promise<void> {
  const cache = new TtlCache<string>(CACHE_TTL);
  const service = new GibsService(cache);

  app.get<{ Params: ImageryParams; Querystring: ImageryQuerystring }>(
    "/api/imagery/:layer",
    async (request, reply) => {
      const { layer } = request.params;
      const { date, z, x, y } = request.query;

      if (!date) {
        return reply.status(400).send({
          status: "error",
          code: "PARSE_FAILED",
          source: "gibs",
          message: "date is required",
        });
      }

      const parsedZ = parseNonNegativeInt(z, "z");
      if (typeof parsedZ === "string") {
        return reply.status(400).send({
          status: "error",
          code: "PARSE_FAILED",
          source: "gibs",
          message: parsedZ,
        });
      }

      const parsedX = parseNonNegativeInt(x, "x");
      if (typeof parsedX === "string") {
        return reply.status(400).send({
          status: "error",
          code: "PARSE_FAILED",
          source: "gibs",
          message: parsedX,
        });
      }

      const parsedY = parseNonNegativeInt(y, "y");
      if (typeof parsedY === "string") {
        return reply.status(400).send({
          status: "error",
          code: "PARSE_FAILED",
          source: "gibs",
          message: parsedY,
        });
      }

      const result = service.buildTileUrl(layer, date, parsedZ, parsedY, parsedX);

      if (result.status === "error") {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    },
  );
}
