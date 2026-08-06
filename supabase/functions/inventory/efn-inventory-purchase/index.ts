/**
 * inventory/efn-inventory-purchase/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handlePurchaseRequest }          from "./handler.ts";
import { InventoryPurchaseSchema }        from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-purchase";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager",
      "warehouse_manager", "inventory_manager", "vendor_admin", "vendor_supervisor"
    ], correlationId);
    
    const body = await parseBody(req, InventoryPurchaseSchema, correlationId);

    const result = await handlePurchaseRequest(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    return body.action === "create" ? respond.created(result, result.purchase_request_id) : respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
