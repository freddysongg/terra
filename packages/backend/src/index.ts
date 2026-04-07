import Fastify, { type FastifyInstance } from "fastify";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerEventsRoute } from "./routes/events.js";

const PORT = 3001;

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await registerCors(app);
  await registerRateLimit(app);
  await registerHealthRoute(app);
  await registerEventsRoute(app);

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
