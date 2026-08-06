-- =============================================================================
-- Migration: 20260716045_work_order_labor.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create the `work_order_labor` table.
--            Tracks every technician's time contribution to a work order.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.work_order_labor (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,

  -- ── Time Breakdown ────────────────────────────────────────────────────────
  hours_worked             NUMERIC(6,2)  NOT NULL DEFAULT 0,
  travel_time_hours        NUMERIC(6,2)  NOT NULL DEFAULT 0,
  overtime_hours           NUMERIC(6,2)  NOT NULL DEFAULT 0,

  -- ── Cost ──────────────────────────────────────────────────────────────────
  labor_cost               NUMERIC(12,2),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  recorded_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_labor_hours_non_negative
    CHECK (hours_worked >= 0 AND travel_time_hours >= 0 AND overtime_hours >= 0),
  CONSTRAINT uq_wo_labor_technician
    UNIQUE (work_order_id, technician_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wo_labor_work_order_id
  ON public.work_order_labor (work_order_id);

CREATE INDEX IF NOT EXISTS idx_wo_labor_technician_id
  ON public.work_order_labor (technician_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_wo_labor_updated_at
  BEFORE UPDATE ON public.work_order_labor
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.work_order_labor IS 'Per-technician time and cost breakdown for a work order.';
