-- =============================================================================
-- Migration: 20260716057_technician_availability.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `technician_availability` table.
--            Real-time state of each technician for live dispatch decisions.
--            This is the "source of truth" for the Live Dispatch Board.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_availability (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── One row per technician (1:1 enforced) ─────────────────────────────────
  technician_id            UUID          NOT NULL UNIQUE
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,

  -- ── Live Availability ─────────────────────────────────────────────────────
  availability_status      public.tech_availability NOT NULL DEFAULT 'available',
  availability_reason      TEXT,                                  -- e.g. "On lunch", "Vehicle breakdown"

  -- ── Live Location ─────────────────────────────────────────────────────────
  -- Stored separately for quick spatial queries; a PostGIS extension can be added later
  current_latitude         NUMERIC(10,7),
  current_longitude        NUMERIC(10,7),
  last_location_update_at  TIMESTAMPTZ,

  -- ── Current Assignment ────────────────────────────────────────────────────
  current_work_order_id    UUID          REFERENCES public.work_orders (id) ON DELETE SET NULL,
  current_shift_id         UUID          REFERENCES public.technician_shifts (id) ON DELETE SET NULL,
  next_available_at        TIMESTAMPTZ,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tech_avail_status
  ON public.technician_availability (availability_status);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_tech_availability_updated_at
  BEFORE UPDATE ON public.technician_availability
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.technician_availability IS 'Real-time technician state (1:1 per technician) powering the Live Dispatch Board.';
