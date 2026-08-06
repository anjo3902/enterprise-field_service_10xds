-- =============================================================================
-- Migration: 20260716059_route_assignments.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `route_assignments` table.
--            Stores the computed route metadata for a dispatched technician.
--            Designed for future Google Maps / OR-Tools integration.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.route_assignments (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  -- 1:1 with dispatch_schedule (one confirmed route per scheduled dispatch)
  dispatch_schedule_id     UUID          NOT NULL UNIQUE
                             REFERENCES public.dispatch_schedules (id)
                             ON DELETE CASCADE,

  -- ── Origin ────────────────────────────────────────────────────────────────
  origin_latitude          NUMERIC(10,7),
  origin_longitude         NUMERIC(10,7),

  -- ── Destination ───────────────────────────────────────────────────────────
  destination_latitude     NUMERIC(10,7),
  destination_longitude    NUMERIC(10,7),

  -- ── Route Metrics ─────────────────────────────────────────────────────────
  distance_km              NUMERIC(8,2),
  estimated_duration_mins  INT,

  -- ── Provider & Optimization ───────────────────────────────────────────────
  -- e.g. "Google Maps", "OR-Tools", "Manual"
  route_provider           TEXT,
  -- Optimization quality score (0.0–1.0), useful for comparing routes
  optimization_score       NUMERIC(4,3)
    CHECK (optimization_score IS NULL OR (optimization_score >= 0 AND optimization_score <= 1)),

  -- ── Status ────────────────────────────────────────────────────────────────
  -- e.g. "computed", "in_progress", "completed", "cancelled"
  status                   TEXT          NOT NULL DEFAULT 'computed',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_route_assignments_updated_at
  BEFORE UPDATE ON public.route_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.route_assignments IS 'Computed route metadata per dispatch. Ready for Google Maps/OR-Tools integration.';
