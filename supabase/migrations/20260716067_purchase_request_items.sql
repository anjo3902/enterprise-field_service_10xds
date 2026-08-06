-- =============================================================================
-- Migration: 20260716067_purchase_request_items.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `purchase_request_items` table.
--            Line items for a purchase request.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_request_items (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  purchase_request_id      UUID          NOT NULL
                             REFERENCES public.purchase_requests (id)
                             ON DELETE CASCADE,
  inventory_item_id        UUID          NOT NULL
                             REFERENCES public.inventory_items (id)
                             ON DELETE CASCADE,

  -- ── Details ───────────────────────────────────────────────────────────────
  quantity                 NUMERIC(10,2) NOT NULL,
  unit_cost                NUMERIC(12,2),
  
  total_cost               NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- e.g. "pending", "ordered", "received"
  status                   TEXT          NOT NULL DEFAULT 'pending',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_pr_item_quantity CHECK (quantity > 0)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_pr_items_updated_at
  BEFORE UPDATE ON public.purchase_request_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.purchase_request_items IS 'Line items for a specific purchase request.';
