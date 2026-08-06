-- =============================================================================
-- Migration: 20260716023_vendor_capabilities.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `vendor_service_capabilities` table.
--            Defines what services a vendor is authorized to perform.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_service_capabilities (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Linkages ──────────────────────────────────────────────────────────────
  vendor_id                UUID          NOT NULL
                             REFERENCES public.vendors (id)
                             ON DELETE CASCADE,
  service_category_id      UUID          NOT NULL
                             REFERENCES public.service_categories (id)
                             ON DELETE CASCADE,
  service_type_id          UUID          REFERENCES public.service_types (id) ON DELETE CASCADE,

  -- ── Capacity & Rules ──────────────────────────────────────────────────────
  coverage_region          TEXT,
  response_tier            TEXT,                               -- e.g. "Platinum", "Gold", "Standard"
  business_hours_id        UUID          REFERENCES public.business_hours (id) ON DELETE SET NULL,
  maximum_capacity         INT,                                -- e.g. Max active tickets allowed

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  -- Prevent duplicate capability definitions for the exact same granular combination
  CONSTRAINT uq_vendor_service_capability UNIQUE NULLS NOT DISTINCT (vendor_id, service_category_id, service_type_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendor_capabilities_vendor_id
  ON public.vendor_service_capabilities (vendor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_capabilities_category_id
  ON public.vendor_service_capabilities (service_category_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_vendor_capabilities_updated_at
  BEFORE UPDATE ON public.vendor_service_capabilities
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.vendor_service_capabilities IS 'Binds vendors to the specific services they are capable of delivering.';
