-- =============================================================================
-- Migration: 20260716098_platform_analytics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `platform_analytics` table.
--            System-wide metrics for platform admins (usage, scale, volume).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_analytics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Period ────────────────────────────────────────────────────────────────
  reporting_period         DATE          NOT NULL UNIQUE,

  -- ── Entity Counts ─────────────────────────────────────────────────────────
  total_organizations      INT           NOT NULL DEFAULT 0,
  total_vendors            INT           NOT NULL DEFAULT 0,
  total_technicians        INT           NOT NULL DEFAULT 0,
  total_assets             INT           NOT NULL DEFAULT 0,
  
  -- ── Volume Metrics ────────────────────────────────────────────────────────
  total_tickets            INT           NOT NULL DEFAULT 0,
  total_work_orders        INT           NOT NULL DEFAULT 0,
  total_pm_schedules       INT           NOT NULL DEFAULT 0,
  total_ai_requests        INT           NOT NULL DEFAULT 0,

  -- ── Infrastructure Metrics ────────────────────────────────────────────────
  storage_usage_mb         NUMERIC(14,2),
  api_usage_count          BIGINT,
  realtime_connections     INT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_platform_analytics_updated_at
  BEFORE UPDATE ON public.platform_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.platform_analytics IS 'System-wide metrics for platform administrators.';
