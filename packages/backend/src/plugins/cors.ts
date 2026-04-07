import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export async function registerCors(app: FastifyInstance): Promise<void> {
  /* Same-origin in production — CORS only needed for split dev servers */
  if (process.env.NODE_ENV === "production") {
    return;
  }

  await app.register(cors, {
    origin: [process.env.CORS_ORIGIN ?? "http://localhost:5173"],
    methods: ["GET"],
  });
}
