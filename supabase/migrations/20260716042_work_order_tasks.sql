-- =============================================================================
-- Migration: 20260716042_work_order_tasks.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create the `work_order_tasks` table.
--            Ordered list of discrete sub-tasks the technician must complete.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.work_order_tasks (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,

  -- ── Task Details ──────────────────────────────────────────────────────────
  task_name                TEXT          NOT NULL,
  description              TEXT,
  sequence                 INT           NOT NULL DEFAULT 0,     -- Display order
  is_mandatory             BOOLEAN       NOT NULL DEFAULT true,

  -- ── Completion ────────────────────────────────────────────────────────────
  is_completed             BOOLEAN       NOT NULL DEFAULT false,
  completed_by             UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  completed_at             TIMESTAMPTZ,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_wo_id
  ON public.work_order_tasks (work_order_id, sequence);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_work_order_tasks_updated_at
  BEFORE UPDATE ON public.work_order_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.work_order_tasks IS 'Ordered discrete sub-tasks within a work order. Powers the mobile technician checklist.';
