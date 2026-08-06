-- =============================================================================
-- Migration: 20260716069_parts_consumption.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `parts_consumption` table.
--            Records actual usage of tracked enterprise inventory on a job.
--            Differs from `work_order_parts_used` which can handle free-text/untracked parts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.parts_consumption (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,
  inventory_item_id        UUID          NOT NULL
                             REFERENCES public.inventory_items (id)
                             ON DELETE CASCADE,
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,

  -- ── Details ───────────────────────────────────────────────────────────────
  quantity_used            NUMERIC(10,2) NOT NULL,
  cost                     NUMERIC(12,2),

  consumed_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- e.g. "consumed", "returned"
  status                   TEXT          NOT NULL DEFAULT 'consumed',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_parts_consumed_quantity CHECK (quantity_used > 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_parts_consumption_wo_id
  ON public.parts_consumption (work_order_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_parts_consumption_updated_at
  BEFORE UPDATE ON public.parts_consumption
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.parts_consumption IS 'Actual usage of tracked enterprise inventory on a work order.';
