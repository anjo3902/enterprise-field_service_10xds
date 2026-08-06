/**
 * reporting/efn-report-export/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handleExport }                   from "./handler.ts";
import { ExportSchema }                   from "./schema.ts";

const FUNCTION_NAME = "efn-report-export";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager", "vendor_admin", "finance_manager", "maintenance_manager", "dispatcher", "read_only"
    ], correlationId);
    
    const body = await parseBody(req, ExportSchema, correlationId);

    // If financial export, enforce role
    if (body.report_type === "financial") {
      assertRole(ctx.claims, ["system_admin", "org_admin", "finance_manager", "vendor_admin"], correlationId);
    }

    const result = await handleExport(body, ctx.claims, correlationId);
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
