-- =============================================================================
-- Migration: 20260716056_technician_shifts.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `technician_shifts` table.
--            Defines recurring shift schedules for technicians, used to
--            constrain availability calculations and dispatch eligibility.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_shifts (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,

  -- ── Shift Definition ──────────────────────────────────────────────────────
  shift_name               TEXT          NOT NULL,               -- e.g. "Morning", "Night", "Weekend"
  
  -- Wall-clock times stored as TIME for cross-timezone flexibility
  start_time               TIME          NOT NULL,
  end_time                 TIME          NOT NULL,
  break_duration_mins      INT           NOT NULL DEFAULT 0,

  -- Array of ISO weekday numbers: 0=Sun, 1=Mon, ..., 6=Sat
  working_days             INT[]         NOT NULL DEFAULT '{1,2,3,4,5}',

  timezone                 TEXT          NOT NULL DEFAULT 'UTC',

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_shift_time_order CHECK (end_time > start_time)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_technician_shifts_tech_id
  ON public.technician_shifts (technician_id, status)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_technician_shifts_updated_at
  BEFORE UPDATE ON public.technician_shifts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.technician_shifts IS 'Recurring shift definitions for technicians used by the dispatch eligibility engine.';
