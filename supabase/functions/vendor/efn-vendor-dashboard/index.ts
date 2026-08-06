/**
 * vendor/efn-vendor-dashboard/index.ts
 *
 * POST /vendor/dashboard
 * Roles: system_admin, vendor_admin, vendor_staff, org_admin, org_user
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { getVendorDashboard }             from "./handler.ts";
import { VendorDashboardSchema }          from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-dashboard";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "vendor_admin", "vendor_staff", "org_admin", "org_user"], correlationId);
    const body = await parseBody(req, VendorDashboardSchema, correlationId);

    const result = await getVendorDashboard(body, ctx.claims, correlationId);

    log.info({ correlationId, vendor_id: result.vendor_id, duration_ms: log.elapsed() }, "Dashboard fetch complete");
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
