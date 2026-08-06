-- =============================================================================
-- Migration: 20260716021_service_categories.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `service_categories` table.
--            High-level classification of services (e.g. Electrical, HVAC, IT).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.service_categories (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Core Details ──────────────────────────────────────────────────────────
  category_code            TEXT          NOT NULL UNIQUE,
  name                     TEXT          NOT NULL,
  description              TEXT,
  display_order            INT           DEFAULT 0,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_categories_status
  ON public.service_categories (status)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.service_categories IS 'High-level groupings of services available in the platform (e.g. Electrical, HVAC).';
