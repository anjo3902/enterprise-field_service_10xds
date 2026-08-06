/**
 * shared/observability/health.ts
 * ─────────────────────────────────────────────────────────────────
 * Standardized health check endpoint for Kubernetes/Docker Liveness/Readiness probes.
 */

import { adminClient } from "../db/client.ts";
import { createLogger } from "../logging/logger.ts";
import { respond } from "../response/response-helpers.ts";

export async function handleHealthCheck(req: Request) {
  const log = createLogger("health-check", "system");
  
  try {
    const db = adminClient();
    
    // Quick readiness check: ping the DB
    const { error } = await db.from("organizations").select("id").limit(1);
    
    if (error) {
      log.error({ error: error.message }, "Health check failed: DB Unreachable");
      return new Response(JSON.stringify({ status: "unhealthy", reason: "database_error" }), { 
        status: 503, headers: { "Content-Type": "application/json" } 
      });
    }

    return respond.ok({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: performance.now(),
      version: Deno.env.get("APP_VERSION") || "1.0.0"
    });
  } catch (err: any) {
    log.error({ error: err.message }, "Health check failed: Exception");
    return new Response(JSON.stringify({ status: "unhealthy", reason: "exception" }), { 
      status: 503, headers: { "Content-Type": "application/json" } 
    });
  }
}
