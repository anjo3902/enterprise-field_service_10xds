-- =============================================================================
-- Migration: 20260716096_ai_analytics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `ai_analytics` table.
--            Aggregated performance, usage, and quality data for AI models.
--            (Complements ai_model_metrics and ai_cost_tracking by providing
--            a unified BI view with HITL metrics).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_analytics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  model_id                 UUID          NOT NULL
                             REFERENCES public.ai_models (id)
                             ON DELETE CASCADE,
  reporting_period         DATE          NOT NULL,

  -- ── Metrics ───────────────────────────────────────────────────────────────
  requests_count           INT           NOT NULL DEFAULT 0,
  avg_latency_ms           NUMERIC(10,2),
  avg_confidence_score     NUMERIC(4,3),
  avg_cost_per_request     NUMERIC(14,6),
  
  hitl_count               INT           NOT NULL DEFAULT 0,
  acceptance_rate_pct      NUMERIC(5,2)  CHECK (acceptance_rate_pct IS NULL OR (acceptance_rate_pct >= 0 AND acceptance_rate_pct <= 100)),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_ai_analytics_period UNIQUE (model_id, reporting_period)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_analytics_updated_at
  BEFORE UPDATE ON public.ai_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.ai_analytics IS 'Aggregated performance, usage, and quality data for AI models.';
