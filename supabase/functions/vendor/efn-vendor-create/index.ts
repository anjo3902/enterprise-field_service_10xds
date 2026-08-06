/**
 * vendor/efn-vendor-create/index.ts
 *
 * POST /vendor/create
 * Roles: system_admin only
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { createVendor }                   from "./handler.ts";
import { CreateVendorSchema }             from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-create";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin"], correlationId);
    const body = await parseBody(req, CreateVendorSchema, correlationId);

    const result = await createVendor(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, vendor_id: result.vendor_id, duration_ms: log.elapsed() }, "Vendor created");
    return respond.created(result, result.vendor_id);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
