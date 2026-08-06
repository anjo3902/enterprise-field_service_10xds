-- =============================================================================
-- Migration: 20260716018_escalation_rules.sql
-- Phase:     1B.2 — Enterprise SLA Policy Engine
-- Purpose:   Create the `escalation_rules` table.
--            Defines the multi-level escalation matrix for SLA breaches.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  sla_policy_id            UUID          NOT NULL
                             REFERENCES public.sla_policies (id)
                             ON DELETE CASCADE,

  -- ── Escalation Trigger ────────────────────────────────────────────────────
  escalation_level         INT           NOT NULL,             -- e.g. 1 (First Warning), 2 (Manager), 3 (Executive)
  trigger_after_minutes    INT           NOT NULL,             -- Minutes past the SLA deadline to trigger this

  -- ── Escalation Action ─────────────────────────────────────────────────────
  notification_targets     TEXT[],                             -- e.g. ["vendor_manager", "org_admin", "email@example.com"]
  escalation_action        TEXT          NOT NULL,             -- e.g. "EMAIL", "SMS", "REASSIGN_TICKET"
  auto_escalation          BOOLEAN       NOT NULL DEFAULT true,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_escalation_level_positive CHECK (escalation_level > 0),
  CONSTRAINT uq_escalation_policy_level UNIQUE (sla_policy_id, escalation_level)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_escalation_rules_policy_id
  ON public.escalation_rules (sla_policy_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.escalation_rules IS 'Defines SLA breach escalation steps (L1, L2, L3) for a specific policy.';
