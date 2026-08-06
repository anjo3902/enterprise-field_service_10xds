-- =============================================================================
-- Migration: 20260716011_buildings.sql
-- Phase:     1B.1 — Enterprise Facility Hierarchy
-- Purpose:   Create the `buildings` table. Every site contains multiple buildings.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.buildings (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  site_id                  UUID          NOT NULL
                             REFERENCES public.sites (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  building_code            TEXT          NOT NULL,
  name                     TEXT          NOT NULL,
  description              TEXT,
  number_of_floors         INT,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_buildings_site_code UNIQUE (site_id, building_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_buildings_site_id
  ON public.buildings (site_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.buildings IS 'Specific buildings within a physical site/campus.';
COMMENT ON COLUMN public.buildings.building_code IS 'Unique code within the site (e.g. BLK-A).';
