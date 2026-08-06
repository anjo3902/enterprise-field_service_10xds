-- =============================================================================
-- Migration: 20260716012_floors.sql
-- Phase:     1B.1 — Enterprise Facility Hierarchy
-- Purpose:   Create the `floors` table. Every building contains multiple floors.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.floors (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  building_id              UUID          NOT NULL
                             REFERENCES public.buildings (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  floor_number             TEXT          NOT NULL,
  display_name             TEXT          NOT NULL,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_floors_building_number UNIQUE (building_id, floor_number)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_floors_building_id
  ON public.floors (building_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_floors_updated_at
  BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.floors IS 'Logical floors within a building (e.g. Ground, F1, Basement).';
COMMENT ON COLUMN public.floors.floor_number IS 'Unique identifier for the floor within the building (e.g. 1, 2, B1, G).';
