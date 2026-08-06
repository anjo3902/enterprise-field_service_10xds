-- =============================================================================
-- Migration: 20260716075_audit_logs.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `audit_logs` table.
--            System-level, tamper-evident security and data-change log.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Actor (Who) ───────────────────────────────────────────────────────────
  actor_id                 UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  actor_role               TEXT,
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Target (What) ─────────────────────────────────────────────────────────
  entity_type              TEXT          NOT NULL,
  entity_id                UUID          NOT NULL,

  -- ── Action (How) ──────────────────────────────────────────────────────────
  -- e.g. "CREATE", "UPDATE", "DELETE", "LOGIN_SUCCESS", "EXPORT"
  action                   TEXT          NOT NULL,

  -- ── Data Diff ─────────────────────────────────────────────────────────────
  old_value                JSONB,
  new_value                JSONB,

  -- ── Network Context ───────────────────────────────────────────────────────
  ip_address               TEXT,
  user_agent               TEXT,

  -- ── Immutable Timestamp ───────────────────────────────────────────────────
  timestamp                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs (actor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org
  ON public.audit_logs (org_id, timestamp DESC)
  WHERE org_id IS NOT NULL;

COMMENT ON TABLE  public.audit_logs IS 'System-level audit and security log. Highly sensitive, append-only.';
