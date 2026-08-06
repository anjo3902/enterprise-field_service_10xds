/**
 * auth/efn-auth-profile-sync/index.ts
 * ─────────────────────────────────────────────────────────────────
 * DB Webhook receiver — triggered by auth.users INSERT events.
 *
 * Trigger:  Supabase Dashboard → Database → Webhooks →
 *           Table: auth.users, Event: INSERT
 * Method:   POST
 * Auth:     Shared webhook secret (WEBHOOK_SECRET env var)
 *
 * Note: The DB trigger `fn_create_profile_on_signup` creates a minimal
 *       stub profile row immediately. This function enriches it with
 *       full user metadata from raw_user_meta_data.
 */

import { parseValue }                       from "../../shared/validation/schema-validator.ts";
import { createLogger }                     from "../../shared/logging/logger.ts";
import { handleError }                      from "../../shared/errors/error-handler.ts";
import { UnauthorizedError }                from "../../shared/errors/app-error.ts";
import { extractOrGenerateCorrelationId }   from "../../shared/logging/correlation.ts";
import { corsPreflightResponse }            from "../../shared/response/response-helpers.ts";
import { respond }                          from "../../shared/response/response-helpers.ts";
import { syncProfile }                      from "./handler.ts";
import { DbWebhookPayloadSchema }           from "./schema.ts";

const FUNCTION_NAME = "efn-auth-profile-sync";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);

  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    // ── Step 1: Validate webhook secret ──────────────────────────────
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
    const authHeader    = req.headers.get("Authorization") ?? "";

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      throw new UnauthorizedError("Invalid webhook secret", correlationId);
    }

    // ── Step 2: Parse + validate body ────────────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new UnauthorizedError("Request body must be valid JSON", correlationId);
    }

    const webhookPayload = parseValue(raw, DbWebhookPayloadSchema, correlationId);

    // ── Step 3: Only process INSERT events on auth.users ─────────────
    if (webhookPayload.type !== "INSERT" || !webhookPayload.record) {
      log.info({ correlationId, type: webhookPayload.type }, "Non-INSERT event — skipping");
      return respond.ok({ skipped: true });
    }

    // ── Step 4: Sync the profile ──────────────────────────────────────
    const result = await syncProfile(
      webhookPayload.record,
      correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, result, duration_ms: 0 }, "Profile sync complete");
    return respond.created(result, result.profile_id);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
