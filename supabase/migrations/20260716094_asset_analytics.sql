-- =============================================================================
-- Migration: 20260716094_asset_analytics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `asset_analytics` table.
--            Aggregated health, downtime, and cost data for assets.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.asset_analytics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  asset_id                 UUID          NOT NULL
                             REFERENCES public.assets (id)
                             ON DELETE CASCADE,
  reporting_period         DATE          NOT NULL,

  -- ── Operational Metrics ───────────────────────────────────────────────────
  downtime_hours           NUMERIC(10,2) NOT NULL DEFAULT 0,
  failure_count            INT           NOT NULL DEFAULT 0,
  
  -- ── Financial Metrics ─────────────────────────────────────────────────────
  maintenance_cost         NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- ── Health & Risk ─────────────────────────────────────────────────────────
  health_score             NUMERIC(5,2)  CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  risk_score               NUMERIC(5,2)  CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  remaining_useful_life    NUMERIC(10,2), -- could be years, months, etc.

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_asset_analytics_period UNIQUE (asset_id, reporting_period)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_asset_analytics_updated_at
  BEFORE UPDATE ON public.asset_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.asset_analytics IS 'Aggregated health, downtime, and cost data for assets.';
