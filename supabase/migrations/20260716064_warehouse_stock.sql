-- =============================================================================
-- Migration: 20260716064_warehouse_stock.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `warehouse_stock` table.
--            Tracks the exact quantity of each item in each warehouse.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  warehouse_id             UUID          NOT NULL
                             REFERENCES public.warehouses (id)
                             ON DELETE CASCADE,
  inventory_item_id        UUID          NOT NULL
                             REFERENCES public.inventory_items (id)
                             ON DELETE CASCADE,

  -- ── Quantities ────────────────────────────────────────────────────────────
  current_quantity         NUMERIC(12,2) NOT NULL DEFAULT 0,
  reserved_quantity        NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Computed conceptually: current_quantity - reserved_quantity
  available_quantity       NUMERIC(12,2) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,

  -- ── Financials ────────────────────────────────────────────────────────────
  average_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_purchase_cost       NUMERIC(12,2),
  
  -- Computed conceptually: current_quantity * average_cost
  stock_value              NUMERIC(14,2) GENERATED ALWAYS AS (current_quantity * average_cost) STORED,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_warehouse_item UNIQUE (warehouse_id, inventory_item_id),
  CONSTRAINT chk_stock_quantities CHECK (current_quantity >= 0 AND reserved_quantity >= 0 AND current_quantity >= reserved_quantity)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse
  ON public.warehouse_stock (warehouse_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_item
  ON public.warehouse_stock (inventory_item_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_warehouse_stock_updated_at
  BEFORE UPDATE ON public.warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.warehouse_stock IS 'Real-time stock levels of inventory items within specific warehouses.';
