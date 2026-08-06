/* ────────────────────────────────────────────────────────────
 * API response & request types.
 *
 * Mirrors the backend contracts documented in api_inventory.md.
 * Only the types needed for Phase 1 (auth) are included;
 * remaining types will be added per-phase.
 * ──────────────────────────────────────────────────────────── */

// ── Auth ────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  technician_code?: string;
}

export interface TelegramClaimRequest {
  token: string;
}

export type UserRole = 'customer' | 'technician' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  /** Some backend responses use `token` instead of `access_token`. */
  token?: string;
}

// ── Generic error shape returned by the backend ─────────────

export interface ApiErrorDetail {
  detail?: string;
  error?: string;
  message?: string;
}
