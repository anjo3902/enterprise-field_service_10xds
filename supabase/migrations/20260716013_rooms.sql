-- =============================================================================
-- Migration: 20260716013_rooms.sql
-- Phase:     1B.1 — Enterprise Facility Hierarchy
-- Purpose:   Create the `rooms` table (or zones). Precise asset locations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  floor_id                 UUID          NOT NULL
                             REFERENCES public.floors (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  room_code                TEXT          NOT NULL,
  name                     TEXT          NOT NULL,
  zone_type                TEXT          NOT NULL,
  capacity                 INT,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_rooms_floor_code UNIQUE (floor_id, room_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id
  ON public.rooms (floor_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.rooms IS 'Specific rooms or designated zones on a floor (e.g. Electrical Room, Pantry, Cubicle Zone C).';
COMMENT ON COLUMN public.rooms.room_code IS 'Unique code within the floor (e.g. 104A).';
COMMENT ON COLUMN public.rooms.zone_type IS 'Category of the space (e.g. Meeting Room, Server Room, Corridor).';
