/**
 * _template/index.ts
 * ─────────────────────────────────────────────────────────────────
 * BASE EDGE FUNCTION TEMPLATE
 *
 * Every new Edge Function MUST be built from this template.
 * It enforces the standard 7-step request lifecycle:
 *
 *   Step 1: CORS preflight
 *   Step 2: Verify JWT + extract claims
 *   Step 3: Assert role
 *   Step 4: Parse + validate body
 *   Step 5: Assert tenant isolation
 *   Step 6: Execute business logic
 *   Step 7: Publish platform event
 *   Step 8: Log + respond
 *
 * HOW TO USE:
 *   1. Copy this file to your new function: supabase/functions/efn-{domain}-{action}/index.ts
 *   2. Rename TODO markers with your domain/action names
 *   3. Implement the handler() function in handler.ts
 *   4. Define the input schema in schema.ts
 *   5. Remove this comment block
 *
 * ─────────────────────────────────────────────────────────────────
 */

import {
  // Infrastructure
  verifyRequest,
  assertRole,
  parseBody,
  assertOrgTenant,
  respond,
  handleError,
  createLogger,
  extractOrGenerateCorrelationId,
  corsPreflightResponse,
  // Event
  publishEvent,
  EVENTS,
} from "../shared/index.ts";

// ── TODO: Import your function-specific schema and handler ─────────
// import { handler }    from "./handler.ts";
// import { InputSchema } from "./schema.ts";
// import type { HandlerInput } from "./types.ts";

// ── Function Name (for logging) ────────────────────────────────────
const FUNCTION_NAME = "efn-todo-domain-action"; // TODO: rename

// ── Allowed Roles ──────────────────────────────────────────────────
// TODO: update for your function
const ALLOWED_ROLES = ["org_admin", "org_user"] as const;

// ── Main Handler ───────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Step 1: CORS preflight ───────────────────────────────────────
  if (req.method === "OPTIONS") return corsPreflightResponse();

  // ── Setup ────────────────────────────────────────────────────────
  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);

  log.info({ method: req.method, url: req.url }, `${FUNCTION_NAME} invoked`);

  try {
    // ── Step 2: Verify JWT ─────────────────────────────────────────
    const ctx = await verifyRequest(req, correlationId);

    // ── Step 3: Assert role ────────────────────────────────────────
    assertRole(ctx.claims, [...ALLOWED_ROLES], correlationId);

    // ── Step 4: Parse + validate body ──────────────────────────────
    // TODO: Replace `InputSchema` with your Zod schema
    // const body = await parseBody(req, InputSchema, correlationId);
    const body = await req.json(); // remove this line once schema is defined

    // ── Step 5: Assert tenant isolation ────────────────────────────
    // TODO: Uncomment and adapt. Use assertVendorTenant for vendor functions.
    // assertOrgTenant(ctx.claims, body.org_id, correlationId);

    // ── Step 6: Execute business logic ─────────────────────────────
    // TODO: Replace with your domain handler
    // const result = await handler(body, ctx);
    const result = { message: "TODO: implement handler" };

    // ── Step 7: Publish platform event ─────────────────────────────
    // TODO: Replace with the appropriate event
    // await publishEvent({
    //   event_name:      EVENTS.TICKET_CREATED, // TODO: use correct event
    //   payload:         { ...result },
    //   org_id:          ctx.claims.org_id,
    //   correlation_id:  correlationId,
    //   source_function: FUNCTION_NAME,
    // });

    // ── Step 8: Log + respond ───────────────────────────────────────
    log.info({ duration_ms: log.elapsed(), status: "success" }, "Request completed");

    return respond.created(result);

  } catch (err) {
    // Central error handler: logs + serialises to safe HTTP response
    return handleError(err, correlationId, log);
  }
});
