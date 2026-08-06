-- =============================================================================
-- Migration: 20260716044_work_order_parts.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create the `work_order_parts_used` table.
--            Tracks every spare part or material consumed during a job.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.work_order_parts_used (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,

  -- ── Part Details ──────────────────────────────────────────────────────────
  part_name                TEXT          NOT NULL,
  part_number              TEXT,
  quantity                 NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost                NUMERIC(12,2),
  total_cost               NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

  -- The vendor who supplied this part (may differ from the work order vendor)
  supplier_vendor_id       UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  recorded_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_parts_quantity_positive CHECK (quantity > 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wo_parts_work_order_id
  ON public.work_order_parts_used (work_order_id);

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.work_order_parts_used IS 'Spare parts and materials consumed during a work order job.';
COMMENT ON COLUMN public.work_order_parts_used.total_cost IS 'Auto-computed as quantity * unit_cost via generated stored column.';
