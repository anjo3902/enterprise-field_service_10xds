/**
 * maintenance/efn-pm-plan/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handlePmPlan }                   from "./handler.ts";
import { PmPlanSchema }                   from "./schema.ts";

const FUNCTION_NAME = "efn-pm-plan";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    
    // Only admins/managers can manage PM plans
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager", "maintenance_manager", "vendor_admin"
    ], correlationId);
    
    const body = await parseBody(req, PmPlanSchema, correlationId);

    const result = await handlePmPlan(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    return body.action === "create" ? respond.created(result, result.plan_id) : respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
