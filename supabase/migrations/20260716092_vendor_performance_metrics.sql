-- =============================================================================
-- Migration: 20260716092_vendor_performance_metrics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `vendor_performance_metrics` table.
--            Aggregated performance data for vendors.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_performance_metrics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  vendor_id                UUID          NOT NULL
                             REFERENCES public.vendors (id)
                             ON DELETE CASCADE,
  reporting_period         DATE          NOT NULL,

  -- ── Operational Metrics ───────────────────────────────────────────────────
  tickets_completed        INT           NOT NULL DEFAULT 0,
  avg_response_time_mins   NUMERIC(10,2),
  avg_resolution_time_mins NUMERIC(10,2),
  sla_compliance_pct       NUMERIC(5,2)  CHECK (sla_compliance_pct IS NULL OR (sla_compliance_pct >= 0 AND sla_compliance_pct <= 100)),
  
  -- ── Quality Metrics ───────────────────────────────────────────────────────
  customer_rating          NUMERIC(3,2)  CHECK (customer_rating IS NULL OR (customer_rating >= 0 AND customer_rating <= 5)),
  performance_score        NUMERIC(5,2)  CHECK (performance_score IS NULL OR (performance_score >= 0 AND performance_score <= 100)),

  -- ── Financial Metrics ─────────────────────────────────────────────────────
  revenue                  NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost                     NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_vendor_perf_period UNIQUE (vendor_id, reporting_period)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_vendor_perf_updated_at
  BEFORE UPDATE ON public.vendor_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.vendor_performance_metrics IS 'Aggregated performance data for vendors over specific reporting periods.';
