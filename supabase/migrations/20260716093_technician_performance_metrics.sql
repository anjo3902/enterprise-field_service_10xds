-- =============================================================================
-- Migration: 20260716093_technician_performance_metrics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `technician_performance_metrics` table.
--            Aggregated performance data for technicians.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_performance_metrics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,
  reporting_period         DATE          NOT NULL,

  -- ── Operational Metrics ───────────────────────────────────────────────────
  jobs_completed           INT           NOT NULL DEFAULT 0,
  avg_travel_time_mins     NUMERIC(10,2),
  avg_resolution_time_mins NUMERIC(10,2),
  
  -- ── Quality Metrics ───────────────────────────────────────────────────────
  customer_rating          NUMERIC(3,2)  CHECK (customer_rating IS NULL OR (customer_rating >= 0 AND customer_rating <= 5)),
  performance_score        NUMERIC(5,2)  CHECK (performance_score IS NULL OR (performance_score >= 0 AND performance_score <= 100)),

  -- ── Utilization & Efficiency ──────────────────────────────────────────────
  utilization_pct          NUMERIC(5,2)  CHECK (utilization_pct IS NULL OR (utilization_pct >= 0 AND utilization_pct <= 100)),
  efficiency_pct           NUMERIC(5,2)  CHECK (efficiency_pct IS NULL OR (efficiency_pct >= 0 AND efficiency_pct <= 100)),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_tech_perf_period UNIQUE (technician_id, reporting_period)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_tech_perf_updated_at
  BEFORE UPDATE ON public.technician_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.technician_performance_metrics IS 'Aggregated performance data for technicians over specific reporting periods.';
