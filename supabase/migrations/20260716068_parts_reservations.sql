-- =============================================================================
-- Migration: 20260716068_parts_reservations.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `parts_reservations` table.
--            Reserves stock for a specific work order to prevent double-booking.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.parts_reservations (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,
  inventory_item_id        UUID          NOT NULL
                             REFERENCES public.inventory_items (id)
                             ON DELETE CASCADE,
  warehouse_id             UUID          NOT NULL
                             REFERENCES public.warehouses (id)
                             ON DELETE CASCADE,

  -- ── Details ───────────────────────────────────────────────────────────────
  reserved_quantity        NUMERIC(10,2) NOT NULL,

  reserved_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  reserved_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  released_at              TIMESTAMPTZ,

  -- e.g. "active", "consumed", "released"
  status                   TEXT          NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_parts_reserved_quantity CHECK (reserved_quantity > 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_parts_res_wo_id
  ON public.parts_reservations (work_order_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_parts_reservations_updated_at
  BEFORE UPDATE ON public.parts_reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.parts_reservations IS 'Reserves inventory for a specific work order prior to consumption.';
