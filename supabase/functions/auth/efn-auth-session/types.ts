/**
 * auth/efn-auth-session/types.ts
 * ─────────────────────────────────────────────────────────────────
 */

export interface SessionInfo {
  user_id:       string;
  email:         string | null;
  role:          string;
  org_id:        string | null;
  vendor_id:     string | null;
  tech_id:       string | null;
  tenant_type:   string;
  full_name:     string | null;
  avatar_url:    string | null;
  last_login_at: string | null;
  permissions:   string[];
}

export interface RevokeSessionInput {
  /** Revoke all sessions or just the current one */
  all?: boolean;
}
