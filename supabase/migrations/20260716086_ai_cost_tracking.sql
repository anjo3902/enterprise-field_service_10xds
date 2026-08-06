-- =============================================================================
-- Migration: 20260716086_ai_cost_tracking.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_cost_tracking` table.
--            Monthly cost aggregation per provider/model/org for billing governance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_cost_tracking (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Dimensions ────────────────────────────────────────────────────────────
  provider                 TEXT          NOT NULL,
  model_id                 UUID          REFERENCES public.ai_models (id) ON DELETE SET NULL,
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,

  -- ── Aggregates ────────────────────────────────────────────────────────────
  request_count            INT           NOT NULL DEFAULT 0,
  input_tokens             BIGINT        NOT NULL DEFAULT 0,
  output_tokens            BIGINT        NOT NULL DEFAULT 0,
  estimated_cost           NUMERIC(14,6) NOT NULL DEFAULT 0,

  -- ── Billing Period ────────────────────────────────────────────────────────
  -- Stored as DATE truncated to first of month (e.g. 2026-07-01)
  billing_month            DATE          NOT NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_ai_cost_billing
    UNIQUE (provider, model_id, org_id, billing_month)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_org_month
  ON public.ai_cost_tracking (org_id, billing_month DESC);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_cost_tracking_updated_at
  BEFORE UPDATE ON public.ai_cost_tracking
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.ai_cost_tracking IS 'Monthly AI cost aggregates per provider/model/org for AI governance and billing.';
