type LogLevel = "info" | "warn" | "error";

type CacheStatus = "hit" | "miss" | "stale" | "none";

interface LogContext {
  endpoint: string;
  status?: number | "error";
  cacheStatus?: CacheStatus;
  attempt?: number;
  durationMs?: number;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  endpoint: string;
  status: number | "error";
  cacheStatus: CacheStatus;
  message?: string;
  stack?: string;
  attempt?: number;
  durationMs?: number;
}

interface Logger {
  info: (message: string, context: LogContext) => void;
  warn: (message: string, context: LogContext) => void;
  error: (message: string, context: LogContext & { error?: unknown }) => void;
}

function buildEntry(
  level: LogLevel,
  source: string,
  message: string,
  context: LogContext,
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    endpoint: context.endpoint,
    status: context.status ?? "error",
    cacheStatus: context.cacheStatus ?? "none",
  };

  if (message) {
    entry.message = message;
  }

  if (context.attempt !== undefined) {
    entry.attempt = context.attempt;
  }

  if (context.durationMs !== undefined) {
    entry.durationMs = context.durationMs;
  }

  return entry;
}

function extractErrorDetails(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }

  return { message: String(err) };
}

export function createLogger(source: string): Logger {
  return {
    info(message: string, context: LogContext): void {
      const entry = buildEntry("info", source, message, context);
      console.log(JSON.stringify(entry));
    },

    warn(message: string, context: LogContext): void {
      const entry = buildEntry("warn", source, message, context);
      console.log(JSON.stringify(entry));
    },

    error(message: string, context: LogContext & { error?: unknown }): void {
      const entry = buildEntry("error", source, message, context);

      if (context.error !== undefined) {
        const details = extractErrorDetails(context.error);
        entry.message = details.message;
        entry.stack = details.stack;
      }

      console.error(JSON.stringify(entry));
    },
  };
}
