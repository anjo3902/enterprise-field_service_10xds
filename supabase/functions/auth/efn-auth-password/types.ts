/**
 * auth/efn-auth-password/types.ts
 * ─────────────────────────────────────────────────────────────────
 */

export type PasswordAction =
  | "reset_request"   // Public: request a password reset email
  | "update"          // Authenticated: change password
  | "verify_email"    // Public: resend email verification
  | "magic_link";     // Public: send a magic link login email

export interface PasswordActionResult {
  action:  PasswordAction;
  success: boolean;
  message: string;
}
