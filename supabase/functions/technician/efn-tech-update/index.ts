/**
 * technician/efn-tech-update/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { updateTechnician }               from "./handler.ts";
import { UpdateTechnicianSchema }         from "./schema.ts";

const FUNCTION_NAME = "efn-tech-update";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "vendor_admin", "technician"], correlationId);
    const body = await parseBody(req, UpdateTechnicianSchema, correlationId);

    const result = await updateTechnician(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, technician_id: result.technician_id, duration_ms: log.elapsed() }, "Technician update complete");
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
