-- =============================================================================
-- Migration: 20260716095_sla_analytics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `sla_analytics` table.
--            Aggregated SLA compliance and breach data per policy.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sla_analytics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  sla_policy_id            UUID          NOT NULL
                             REFERENCES public.sla_policies (id)
                             ON DELETE CASCADE,
  reporting_period         DATE          NOT NULL,

  -- ── Metrics ───────────────────────────────────────────────────────────────
  breaches_count           INT           NOT NULL DEFAULT 0,
  escalations_count        INT           NOT NULL DEFAULT 0,
  
  compliance_pct           NUMERIC(5,2)  CHECK (compliance_pct IS NULL OR (compliance_pct >= 0 AND compliance_pct <= 100)),
  
  avg_response_mins        NUMERIC(10,2),
  avg_resolution_mins      NUMERIC(10,2),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_sla_analytics_period UNIQUE (sla_policy_id, reporting_period)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_sla_analytics_updated_at
  BEFORE UPDATE ON public.sla_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.sla_analytics IS 'Aggregated SLA compliance and breach data per SLA policy.';
