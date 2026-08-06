-- =============================================================================
-- Migration: 20260716097_revenue_analytics.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `revenue_analytics` table.
--            Aggregated financial metrics for Orgs/Vendors.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.revenue_analytics (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,
  reporting_period         DATE          NOT NULL,

  -- ── Financial Metrics ─────────────────────────────────────────────────────
  revenue                  NUMERIC(14,2) NOT NULL DEFAULT 0,
  maintenance_cost         NUMERIC(14,2) NOT NULL DEFAULT 0,
  labor_cost               NUMERIC(14,2) NOT NULL DEFAULT 0,
  parts_cost               NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  -- Computed conceptually: revenue - (maintenance_cost + labor_cost + parts_cost)
  profit                   NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_revenue_analytics_period UNIQUE NULLS NOT DISTINCT (org_id, vendor_id, reporting_period)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_revenue_analytics_updated_at
  BEFORE UPDATE ON public.revenue_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.revenue_analytics IS 'Aggregated financial metrics and profitability tracking.';
