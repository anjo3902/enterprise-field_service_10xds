-- =============================================================================
-- Migration: 20260716063_inventory_items.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `inventory_items` table.
--            Master catalog of all trackable spare parts and consumables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  item_code                TEXT          NOT NULL UNIQUE,
  name                     TEXT          NOT NULL,
  description              TEXT,
  
  category                 TEXT          NOT NULL,               -- e.g. "Electrical", "HVAC", "Consumable"
  manufacturer             TEXT,
  part_number              TEXT,
  
  -- ── Tracking Rules ────────────────────────────────────────────────────────
  unit                     TEXT          NOT NULL DEFAULT 'pcs', -- e.g. "pcs", "liters", "boxes"
  minimum_stock            NUMERIC(10,2) NOT NULL DEFAULT 0,
  maximum_stock            NUMERIC(10,2),
  reorder_level            NUMERIC(10,2),

  -- ── Barcode/QR ────────────────────────────────────────────────────────────
  barcode                  TEXT          UNIQUE,
  qr_code                  TEXT          UNIQUE,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_items_category
  ON public.inventory_items (category)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.inventory_items IS 'Master catalog of all trackable spare parts and consumables.';
