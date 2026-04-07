import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerEventsRoute } from "./routes/events.js";
import { registerFiresRoute } from "./routes/fires.js";
import { registerEarthquakesRoute } from "./routes/earthquakes.js";
import { registerAlertsRoute } from "./routes/alerts.js";
import { registerSpaceWeatherRoute } from "./routes/space-weather.js";
import { registerImageryRoute } from "./routes/imagery.js";

const PORT = Number(process.env.PORT ?? 3001);

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await registerCors(app);
  await registerRateLimit(app);
  await registerHealthRoute(app);
  await registerEventsRoute(app);
  await registerFiresRoute(app);
  await registerEarthquakesRoute(app);
  await registerAlertsRoute(app);
  await registerSpaceWeatherRoute(app);
  await registerImageryRoute(app);

  if (process.env.NODE_ENV === "production") {
    const staticPlugin = await import("@fastify/static");
    const frontendDist = path.resolve(
      fileURLToPath(import.meta.url),
      "../../../frontend/dist",
    );
    await app.register(staticPlugin.default, {
      root: frontendDist,
      wildcard: false,
    });

    /* SPA fallback — unmatched routes serve index.html so client-side routing works */
    app.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile("index.html");
    });
  }

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

const isDirectRun = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isDirectRun) {
  start().catch((err) => {
    console.error("failed to start server:", err);
    process.exit(1);
  });
}
