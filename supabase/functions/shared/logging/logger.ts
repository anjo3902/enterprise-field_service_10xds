/**
 * logging/logger.ts
 * ─────────────────────────────────────────────────────────────────
 * Structured JSON logger for all Edge Functions.
 * Output is ingested by Supabase Log Drains (Logflare / Axiom).
 *
 * Every log line is a single-line JSON object containing:
 *   timestamp, level, function_name, correlation_id, duration_ms?, ...fields
 *
 * Usage:
 *   const log = createLogger("efn-ticket-create", correlationId);
 *   log.info({ ticket_id: "...", action: "created" }, "Ticket created");
 *   log.error({ error: err.message }, "DB write failed");
 */

import { config } from "../config/config.ts";

// ── Types ─────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
  correlationId?: string;
}

export interface Logger {
  debug(ctx: LogContext, message?: string): void;
  info(ctx: LogContext, message?: string): void;
  warn(ctx: LogContext, message?: string): void;
  error(ctx: LogContext, message?: string): void;
  /** Returns the elapsed ms since logger was created. */
  elapsed(): number;
}

// ── Log Level Priority ─────────────────────────────────────────────

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

// ── Factory ───────────────────────────────────────────────────────

/**
 * Creates a logger bound to a specific Edge Function name
 * and an optional default correlation ID.
 *
 * @param functionName  e.g. "efn-ticket-create"
 * @param correlationId Propagated correlation ID (optional)
 */
export function createLogger(
  functionName: string,
  correlationId?: string,
): Logger {
  const startedAt = Date.now();
  const minLevel  = LEVEL_PRIORITY[config.logLevel ?? "info"];

  function write(level: LogLevel, ctx: LogContext, message?: string): void {
    if (LEVEL_PRIORITY[level] < minLevel) return;

    const entry = {
      timestamp:       new Date().toISOString(),
      level,
      function:        functionName,
      correlation_id:  ctx.correlationId ?? correlationId,
      duration_ms:     Date.now() - startedAt,
      message:         message ?? "",
      ...ctx,
      // Don't leak JWT secrets
      correlationId:   undefined,
    };

    // Remove undefined fields
    const clean = Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined),
    );

    // Supabase reads stdout
    console.log(JSON.stringify(clean));
  }

  return {
    debug: (ctx, msg) => write("debug", ctx, msg),
    info:  (ctx, msg) => write("info",  ctx, msg),
    warn:  (ctx, msg) => write("warn",  ctx, msg),
    error: (ctx, msg) => write("error", ctx, msg),
    elapsed: () => Date.now() - startedAt,
  };
}
