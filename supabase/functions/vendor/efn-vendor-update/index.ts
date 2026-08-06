/**
 * vendor/efn-vendor-update/index.ts
 *
 * PATCH /vendor/update
 * Roles: system_admin, vendor_admin
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { updateVendor }                   from "./handler.ts";
import { UpdateVendorSchema }             from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-update";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "vendor_admin"], correlationId);
    const body = await parseBody(req, UpdateVendorSchema, correlationId);

    const result = await updateVendor(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, vendor_id: result.vendor_id, duration_ms: log.elapsed() }, "Vendor update complete");
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
