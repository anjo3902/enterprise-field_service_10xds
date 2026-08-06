-- =============================================================================
-- Migration: 20260716066_purchase_requests.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `purchase_requests` table.
--            Allows vendors or orgs to request new stock or specific parts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  request_number           TEXT          NOT NULL UNIQUE,

  -- ── Linkages ──────────────────────────────────────────────────────────────
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,
  requested_by             UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- ── Details ───────────────────────────────────────────────────────────────
  priority                 public.ticket_priority NOT NULL DEFAULT 'Medium',
  
  -- e.g. "draft", "submitted", "approved", "rejected", "fulfilled", "cancelled"
  approval_status          TEXT          NOT NULL DEFAULT 'draft',
  
  expected_delivery        DATE,
  remarks                  TEXT,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_purchase_requests_updated_at
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.purchase_requests IS 'Requests to procure new inventory or spare parts.';
