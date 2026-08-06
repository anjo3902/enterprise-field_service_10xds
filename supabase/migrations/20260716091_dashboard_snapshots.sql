-- =============================================================================
-- Migration: 20260716091_dashboard_snapshots.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `dashboard_snapshots` table.
--            Pre-computed JSON blobs for rendering complex dashboards instantly.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_snapshots (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  -- e.g. "org_executive", "vendor_performance", "system_admin"
  dashboard_type           TEXT          NOT NULL,
  
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Period ────────────────────────────────────────────────────────────────
  reporting_date           DATE          NOT NULL,

  -- ── Data ──────────────────────────────────────────────────────────────────
  summary_data             JSONB         NOT NULL DEFAULT '{}',
  widget_data              JSONB         NOT NULL DEFAULT '{}',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_dashboard_snapshot UNIQUE NULLS NOT DISTINCT (dashboard_type, org_id, vendor_id, reporting_date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_lookup
  ON public.dashboard_snapshots (dashboard_type, reporting_date DESC);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_dashboard_snapshots_updated_at
  BEFORE UPDATE ON public.dashboard_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.dashboard_snapshots IS 'Pre-computed JSON blobs for rendering complex dashboards instantly.';
