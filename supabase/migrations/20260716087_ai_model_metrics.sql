-- =============================================================================
-- Migration: 20260716087_ai_model_metrics.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_model_metrics` table.
--            Aggregated performance metrics per model for model governance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_model_metrics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Dimensions ────────────────────────────────────────────────────────────
  model_id                 UUID          NOT NULL UNIQUE
                             REFERENCES public.ai_models (id)
                             ON DELETE CASCADE,

  -- ── Aggregated Performance ────────────────────────────────────────────────
  avg_latency_ms           NUMERIC(10,2),
  avg_confidence_score     NUMERIC(4,3),
  avg_cost_per_request     NUMERIC(12,8),

  failure_rate             NUMERIC(5,2)  CHECK (failure_rate IS NULL OR (failure_rate >= 0 AND failure_rate <= 100)),
  success_rate             NUMERIC(5,2)  CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  last_computed_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_model_metrics_updated_at
  BEFORE UPDATE ON public.ai_model_metrics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.ai_model_metrics IS 'Aggregated performance metrics per AI model for model governance and selection.';
