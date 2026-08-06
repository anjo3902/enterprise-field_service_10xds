/**
 * inventory/efn-inventory-movement/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handleStockMovement }            from "./handler.ts";
import { InventoryMovementSchema }        from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-movement";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager",
      "warehouse_manager", "inventory_manager", "vendor_admin", "vendor_supervisor",
      "technician" // Techs can report consumption/damage
    ], correlationId);
    
    const body = await parseBody(req, InventoryMovementSchema, correlationId);

    const result = await handleStockMovement(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    return respond.created(result, result.movement_id);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
