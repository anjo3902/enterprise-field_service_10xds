/**
 * vendor/efn-vendor-performance/index.ts
 *
 * POST /vendor/performance
 * Roles: system_admin, vendor_admin, org_admin, org_user
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { getVendorPerformance }           from "./handler.ts";
import { PerformanceQuerySchema }         from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-performance";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "vendor_admin", "org_admin", "org_user"], correlationId);
    const body = await parseBody(req, PerformanceQuerySchema, correlationId);

    const result = await getVendorPerformance(body, ctx.claims, correlationId);

    log.info({ correlationId, vendor_id: result.vendor_id, duration_ms: log.elapsed() }, "Performance fetch complete");
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
