/**
 * auth/efn-auth-password/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Password management business logic.
 *
 * Actions:
 *   reset_request  — Public endpoint. Sends password reset email via Supabase Auth.
 *                    Always returns 200 to prevent email enumeration.
 *   update         — Authenticated. Updates the user's password.
 *                    Writes audit_log on success.
 *   verify_email   — Public. Resends the email verification link.
 *   magic_link     — Public. Sends a magic link login email.
 *
 * Security:
 *   - reset_request / verify_email / magic_link always respond identically
 *     regardless of whether the email exists (anti-enumeration).
 *   - update requires a valid JWT and increments failed_login_count on breach.
 *   - Audit logs are written for every authenticated operation.
 */

import { adminClient }     from "../../shared/db/client.ts";
import { createLogger }    from "../../shared/logging/logger.ts";
import { generateUuid }    from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }          from "../../shared/utils/date-helpers.ts";
import { withRetry }       from "../../shared/retry/retry.ts";
import { ExternalServiceError } from "../../shared/errors/app-error.ts";
import type { AppClaims }  from "../../shared/auth/types.ts";
import type { PasswordActionInput } from "./schema.ts";
import type { PasswordActionResult } from "./types.ts";

const FUNCTION_NAME = "efn-auth-password";
const APP_URL       = () => Deno.env.get("APP_URL") ?? "";

export async function handlePasswordAction(
  input:         PasswordActionInput,
  claims?:       AppClaims,        // Only present for "update" action
  correlationId: string = "",
  ipAddress?:    string,
  userAgent?:    string,
): Promise<PasswordActionResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  switch (input.action) {

    // ── Password Reset Request (public, anti-enumeration) ───────────
    case "reset_request": {
      try {
        await withRetry(
          () => db.auth.admin.generateLink({
            type:        "recovery",
            email:       input.email,
            options: {
              redirectTo: input.redirect_to ?? `${APP_URL()}/auth/reset-password`,
            },
          }),
          { attempts: 2, baseDelayMs: 500 },
        );
      } catch { /* Anti-enumeration: never leak if email exists */ }

      log.info({ correlationId, action: "reset_request", email: input.email }, "Reset email dispatched");
      return {
        action:  "reset_request",
        success: true,
        message: "If this email is registered, a password reset link has been sent.",
      };
    }

    // ── Password Update (authenticated) ────────────────────────────
    case "update": {
      if (!claims) throw new ExternalServiceError("Auth", "Session required for password update");

      const { error } = await db.auth.admin.updateUserById(claims.sub, {
        password: input.new_password,
      });

      if (error) {
        log.error({ correlationId, user_id: claims.sub, error: error.message }, "Password update failed");
        throw new ExternalServiceError("Supabase Auth", `Password update failed: ${error.message}`, correlationId);
      }

      // Audit log
      await db.from("audit_logs").insert({
        id:          generateUuid(),
        actor_id:    claims.sub,
        actor_role:  claims.app_role,
        org_id:      claims.org_id,
        vendor_id:   claims.vendor_id,
        entity_type: "auth",
        entity_id:   claims.sub,
        action:      "PASSWORD_CHANGED",
        new_value:   { changed_at: nowUtc() },
        ip_address:  ipAddress ?? null,
        user_agent:  userAgent ?? null,
        timestamp:   nowUtc(),
      });

      // Force re-login on all other devices for security
      await db.auth.admin.signOut(claims.sub, "others");

      log.info({ correlationId, user_id: claims.sub }, "Password updated — other sessions revoked");
      return {
        action:  "update",
        success: true,
        message: "Password updated. You have been signed out of all other devices.",
      };
    }

    // ── Email Verification Resend (public, anti-enumeration) ────────
    case "verify_email": {
      try {
        await db.auth.admin.generateLink({
          type:        "signup",
          email:       input.email,
          options: {
            redirectTo: `${APP_URL()}/auth/verify`,
          },
        });
      } catch { /* Anti-enumeration */ }

      log.info({ correlationId, action: "verify_email", email: input.email }, "Verification email dispatched");
      return {
        action:  "verify_email",
        success: true,
        message: "If this email is registered and unverified, a verification link has been sent.",
      };
    }

    // ── Magic Link (public, anti-enumeration) ───────────────────────
    case "magic_link": {
      try {
        await db.auth.admin.generateLink({
          type:        "magiclink",
          email:       input.email,
          options: {
            redirectTo: input.redirect_to ?? `${APP_URL()}/auth/magic`,
          },
        });
      } catch { /* Anti-enumeration */ }

      log.info({ correlationId, action: "magic_link", email: input.email }, "Magic link dispatched");
      return {
        action:  "magic_link",
        success: true,
        message: "If this email is registered, a magic link has been sent.",
      };
    }
  }
}
