/**
 * auth/efn-auth-profile-sync/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Types for the profile sync DB webhook handler.
 * Receives the Supabase DB Webhook INSERT payload from auth.users.
 */

export interface AuthUserRecord {
  id:                  string;
  email:               string | null;
  phone:               string | null;
  created_at:          string;
  raw_user_meta_data:  Record<string, unknown>;
  raw_app_meta_data:   Record<string, unknown>;
}

export interface DbWebhookPayload {
  type:       "INSERT" | "UPDATE" | "DELETE";
  table:      string;
  schema:     string;
  record:     AuthUserRecord | null;
  old_record: AuthUserRecord | null;
}

export interface ProfileSyncResult {
  profile_id: string;
  action:     "created" | "already_exists" | "skipped";
}
