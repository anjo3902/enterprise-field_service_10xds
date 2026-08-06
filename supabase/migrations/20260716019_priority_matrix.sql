-- =============================================================================
-- Migration: 20260716019_priority_matrix.sql
-- Phase:     1B.2 — Enterprise SLA Policy Engine
-- Purpose:   Create the `priority_matrix` table.
--            Calculates dynamic ticket priorities based on multiple risk factors.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.priority_matrix (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,

  -- ── Input Criteria ────────────────────────────────────────────────────────
  severity                 TEXT          NOT NULL,             -- e.g. "Total Failure", "Degraded", "Cosmetic"
  business_impact          TEXT          NOT NULL,             -- e.g. "High", "Medium", "Low"
  asset_criticality        TEXT          NOT NULL,             -- e.g. "Critical", "Essential", "Standard"
  
  -- ── Optional Numerical Score ──────────────────────────────────────────────
  risk_score               INT           CHECK (risk_score >= 0 AND risk_score <= 100),

  -- ── Output Mapping ────────────────────────────────────────────────────────
  calculated_priority      public.ticket_priority NOT NULL,
  suggested_sla_policy_id  UUID          REFERENCES public.sla_policies (id) ON DELETE SET NULL,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_priority_matrix_criteria UNIQUE (org_id, severity, business_impact, asset_criticality)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_priority_matrix_org_id
  ON public.priority_matrix (org_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_priority_matrix_updated_at
  BEFORE UPDATE ON public.priority_matrix
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.priority_matrix IS 'Auto-calculates ticket priority based on severity, impact, and criticality.';
