-- =============================================================================
-- Migration: 20260716027_vendor_coverage_areas.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `vendor_coverage_areas` table.
--            Spatial mapping of where a vendor operates for dispatch logic.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_coverage_areas (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Linkages ──────────────────────────────────────────────────────────────
  vendor_id                UUID          NOT NULL
                             REFERENCES public.vendors (id)
                             ON DELETE CASCADE,
  
  -- Optional precise mapping to existing hierarchy
  site_id                  UUID          REFERENCES public.sites (id) ON DELETE CASCADE,
  building_id              UUID          REFERENCES public.buildings (id) ON DELETE CASCADE,

  -- ── Broad Geographic Mapping ──────────────────────────────────────────────
  region                   TEXT,
  city                     TEXT,
  state_province           TEXT,
  country                  TEXT,
  coverage_radius_km       NUMERIC(6,2),

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  -- Ensure that if building_id is provided, site_id must also be conceptually linked
  -- (Can be enforced at app level, but here we just ensure a vendor isn't mapped to exact same building twice)
  CONSTRAINT uq_vendor_building_coverage UNIQUE NULLS NOT DISTINCT (vendor_id, site_id, building_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendor_coverage_vendor_id
  ON public.vendor_coverage_areas (vendor_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_vendor_coverage_updated_at
  BEFORE UPDATE ON public.vendor_coverage_areas
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.vendor_coverage_areas IS 'Spatial and geographic operating areas for vendors, used by Dispatch Engine.';
