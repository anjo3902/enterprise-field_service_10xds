-- =============================================================================
-- Migration: 20260716060_technician_workload.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `technician_workload` table.
--            Daily capacity and utilization snapshot per technician.
--            Powers the "Workload Balancing" view on the Vendor Dispatch Board.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_workload (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Key Dimensions ────────────────────────────────────────────────────────
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,
  workload_date            DATE          NOT NULL,

  -- ── Job Counts ────────────────────────────────────────────────────────────
  assigned_jobs            INT           NOT NULL DEFAULT 0,
  completed_jobs           INT           NOT NULL DEFAULT 0,
  pending_jobs             INT           NOT NULL DEFAULT 0,

  -- ── Time Breakdown (hours, stored as NUMERIC for fractions) ───────────────
  travel_hours             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  work_hours               NUMERIC(5,2)  NOT NULL DEFAULT 0,
  overtime_hours           NUMERIC(5,2)  NOT NULL DEFAULT 0,

  -- ── Capacity & Utilization Scores (0.0–100.0) ─────────────────────────────
  -- capacity_score:    How much of the technician's available capacity is booked
  -- utilization_score: Actual productive work as a % of total shift time
  capacity_score           NUMERIC(5,2)  CHECK (capacity_score >= 0 AND capacity_score <= 100),
  utilization_score        NUMERIC(5,2)  CHECK (utilization_score >= 0 AND utilization_score <= 100),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_technician_workload_date UNIQUE (technician_id, workload_date),
  CONSTRAINT chk_workload_jobs_non_negative
    CHECK (assigned_jobs >= 0 AND completed_jobs >= 0 AND pending_jobs >= 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tech_workload_date
  ON public.technician_workload (workload_date, technician_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_tech_workload_updated_at
  BEFORE UPDATE ON public.technician_workload
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.technician_workload IS 'Daily capacity and utilization snapshot per technician. Powers workload balancing on the dispatch board.';
