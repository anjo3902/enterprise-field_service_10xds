-- =============================================================================
-- Migration: 20260716062_warehouses.sql
-- Phase:     2.5 — Enterprise Inventory & Spare Parts Management
-- Purpose:   Create the `warehouses` table.
--            Physical or logical locations where spare parts and inventory are stored.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.warehouses (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  warehouse_code           TEXT          NOT NULL UNIQUE,
  name                     TEXT          NOT NULL,

  -- ── Ownership & Linkages ──────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,
  
  -- Optional linkage to the Facility Hierarchy
  site_id                  UUID          REFERENCES public.sites (id) ON DELETE SET NULL,
  building_id              UUID          REFERENCES public.buildings (id) ON DELETE SET NULL,

  -- ── Configuration ─────────────────────────────────────────────────────────
  warehouse_type           TEXT          NOT NULL,               -- e.g. "Main", "Regional", "Van", "Virtual"
  address                  TEXT,
  manager_id               UUID          REFERENCES public.employees (id) ON DELETE SET NULL,

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
CREATE INDEX IF NOT EXISTS idx_warehouses_org_id
  ON public.warehouses (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_vendor_id
  ON public.warehouses (vendor_id)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.warehouses IS 'Physical or logical locations where spare parts are stored.';
