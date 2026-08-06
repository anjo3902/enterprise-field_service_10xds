-- =============================================================================
-- Migration: 20260716090_kpi_snapshots.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `kpi_snapshots` table.
--            Stores computed KPI values for specific entities over time.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  kpi_id                   UUID          NOT NULL
                             REFERENCES public.kpi_definitions (id)
                             ON DELETE CASCADE,

  -- ── Scope ─────────────────────────────────────────────────────────────────
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,
  site_id                  UUID          REFERENCES public.sites (id) ON DELETE CASCADE,
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE CASCADE,
  asset_id                 UUID          REFERENCES public.assets (id) ON DELETE CASCADE,

  -- ── Period ────────────────────────────────────────────────────────────────
  -- Stored as DATE (e.g., first day of the month for monthly KPIs)
  reporting_period         DATE          NOT NULL,

  -- ── Values ────────────────────────────────────────────────────────────────
  metric_value             NUMERIC(14,2) NOT NULL,
  previous_value           NUMERIC(14,2),
  
  -- e.g. "up", "down", "flat"
  trend                    TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  calculated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Ensure we only have one snapshot per KPI + Scope + Period
  CONSTRAINT uq_kpi_snapshot UNIQUE NULLS NOT DISTINCT (kpi_id, org_id, vendor_id, site_id, technician_id, asset_id, reporting_period)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_lookup
  ON public.kpi_snapshots (kpi_id, reporting_period DESC);

COMMENT ON TABLE public.kpi_snapshots IS 'Computed KPI values for specific entities over reporting periods.';
