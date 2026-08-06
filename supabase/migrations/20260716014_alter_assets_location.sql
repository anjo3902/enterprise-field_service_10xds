-- =============================================================================
-- Migration: 20260716014_alter_assets_location.sql
-- Phase:     1B.1 — Enterprise Facility Hierarchy
-- Purpose:   Link the `assets` table to the new Facility Hierarchy.
--            Preserves Developer 2's existing data and existing `location` column.
-- =============================================================================

-- 1. `site_id` was previously added in migration 009, but without a foreign key
--    because the `sites` table did not exist yet. We now add the constraint.
--    Use IF NOT EXISTS on the constraint to ensure idempotency if run multiple times.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_name = 'fk_assets_site_id'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT fk_assets_site_id 
      FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 2. Add `building_id`
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings (id) ON DELETE RESTRICT;

-- 3. Add `floor_id`
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors (id) ON DELETE RESTRICT;

-- 4. Add `room_id`
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms (id) ON DELETE RESTRICT;

-- 5. Add `location_description` (Specific desk, corner, or instruction)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS location_description TEXT;

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- (Index for site_id was already added in 009)

CREATE INDEX IF NOT EXISTS idx_assets_building_id
  ON public.assets (building_id)
  WHERE building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_floor_id
  ON public.assets (floor_id)
  WHERE floor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_room_id
  ON public.assets (room_id)
  WHERE room_id IS NOT NULL;

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.assets.site_id              IS 'Enterprise Facility Hierarchy: Campus level.';
COMMENT ON COLUMN public.assets.building_id          IS 'Enterprise Facility Hierarchy: Building level.';
COMMENT ON COLUMN public.assets.floor_id             IS 'Enterprise Facility Hierarchy: Floor level.';
COMMENT ON COLUMN public.assets.room_id              IS 'Enterprise Facility Hierarchy: Room/Zone level.';
COMMENT ON COLUMN public.assets.location_description IS 'Additional descriptive location details (e.g. Desk 4, near the window).';
