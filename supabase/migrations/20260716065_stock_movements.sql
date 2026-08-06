-- =============================================================================
-- Migration: 20260716065_stock_movements.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `stock_movements` table.
--            Immutable ledger for all inventory adjustments (in/out/transfer).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  inventory_item_id        UUID          NOT NULL
                             REFERENCES public.inventory_items (id)
                             ON DELETE CASCADE,
  warehouse_id             UUID          NOT NULL
                             REFERENCES public.warehouses (id)
                             ON DELETE CASCADE,

  -- ── Movement Details ──────────────────────────────────────────────────────
  -- e.g. "receipt", "issue", "transfer", "adjustment", "return"
  movement_type            TEXT          NOT NULL,
  
  -- Positive for in, negative for out
  quantity                 NUMERIC(12,2) NOT NULL,
  
  -- ── Reference Context ─────────────────────────────────────────────────────
  -- e.g. "work_order", "purchase_order", "manual"
  reference_type           TEXT,
  reference_id             UUID,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  performed_by             UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  remarks                  TEXT,
  movement_date            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  
  -- Intentionally no updated_at -- append-only ledger
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_movements_item
  ON public.stock_movements (inventory_item_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse
  ON public.stock_movements (warehouse_id, movement_date DESC);

COMMENT ON TABLE  public.stock_movements IS 'Immutable ledger of all inventory quantity changes.';
