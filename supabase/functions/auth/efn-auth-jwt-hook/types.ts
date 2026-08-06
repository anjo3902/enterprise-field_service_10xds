/**
 * auth/efn-auth-jwt-hook/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Type definitions for the JWT Custom Claims Hook.
 * Supabase calls this hook on every token mint/refresh.
 */

// ── Supabase Hook Payload (received from GoTrue) ──────────────────

export interface JwtHookClaims {
  aud:            string;
  exp:            number;
  iat:            number;
  iss:            string;
  sub:            string;
  email?:         string;
  phone?:         string;
  role:           string;
  session_id?:    string;
  app_metadata:   Record<string, unknown>;
  user_metadata:  Record<string, unknown>;
}

export interface JwtHookPayload {
  user_id: string;
  claims:  JwtHookClaims;
}

export interface JwtHookResponse {
  claims: JwtHookClaims;
}

// ── Profile row shape returned from DB query ──────────────────────

export interface ProfileRow {
  id:                    string;
  role:                  string;
  org_id:                string | null;
  vendor_id:             string | null;
  tech_id:               string | null;
  assigned_entity_type:  string | null;
  status:                string;
  locked_until:          string | null;
  last_login_at:         string | null;
}

// ── Organization row (for license_type) ──────────────────────────

export interface OrganizationRow {
  id:   string;
  plan: string;
}
