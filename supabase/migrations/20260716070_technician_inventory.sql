-- =============================================================================
-- Migration: 20260716070_technician_inventory.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `technician_inventory` table.
--            Tracks tools or parts checked out to a specific technician.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_inventory (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,
  inventory_item_id        UUID          NOT NULL
                             REFERENCES public.inventory_items (id)
                             ON DELETE CASCADE,

  -- ── Details ───────────────────────────────────────────────────────────────
  quantity                 NUMERIC(10,2) NOT NULL,
  
  assigned_date            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  returned_date            TIMESTAMPTZ,

  -- e.g. "assigned", "consumed", "returned", "lost"
  status                   TEXT          NOT NULL DEFAULT 'assigned',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_tech_inv_quantity CHECK (quantity > 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tech_inv_tech_id
  ON public.technician_inventory (technician_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_tech_inventory_updated_at
  BEFORE UPDATE ON public.technician_inventory
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.technician_inventory IS 'Tracks tools and parts checked out to specific technicians.';
