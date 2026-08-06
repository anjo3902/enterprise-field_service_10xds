-- =============================================================================
-- Migration: 20260716017_sla_policies.sql
-- Phase:     1B.2 — Enterprise SLA Policy Engine
-- Purpose:   Create the `sla_policies` table.
--            The core definitions for target response and resolution times.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sla_policies (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership & Scope ─────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,
  
  -- If vendor_id is set, this SLA is specifically enforced for this vendor.
  -- If NULL, it is an organization-wide default policy.
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  name                     TEXT          NOT NULL,
  description              TEXT,
  asset_category           TEXT,                               -- E.g. "HVAC", "Electrical"
  priority                 public.ticket_priority,             -- E.g. "Critical", "High", "Medium", "Low"

  -- ── SLA Targets ───────────────────────────────────────────────────────────
  response_target_hours    NUMERIC(6,2)  NOT NULL,             -- Max hours to acknowledge/dispatch
  resolution_target_hours  NUMERIC(6,2)  NOT NULL,             -- Max hours to complete the job
  
  -- ── Calendar & Logic ──────────────────────────────────────────────────────
  business_hours_id        UUID          REFERENCES public.business_hours (id) ON DELETE SET NULL,
  escalation_strategy      TEXT,                               -- E.g. "Linear", "Aggressive"
  penalty_rules            JSONB,                              -- E.g. {"missed_response_fee": 100, "missed_resolution_fee": 500}

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_sla_response_target CHECK (response_target_hours > 0),
  CONSTRAINT chk_sla_resolution_target CHECK (resolution_target_hours >= response_target_hours)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sla_policies_org_id
  ON public.sla_policies (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sla_policies_vendor_id
  ON public.sla_policies (vendor_id)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_sla_policies_updated_at
  BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.sla_policies IS 'Enterprise SLA Policies determining response and resolution targets.';
