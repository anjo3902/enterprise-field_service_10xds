-- =============================================================================
-- Migration: 20260716051_warranty_records.sql
-- Phase:     2.3 — Enterprise PM, AMC, & Warranty Engine
-- Purpose:   Create the `warranty_records` table.
--            Tracks manufacturer and extended warranties on specific assets.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.warranty_records (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  asset_id                 UUID          NOT NULL
                             REFERENCES public.assets (id)
                             ON DELETE CASCADE,

  -- ── Warranty Details ──────────────────────────────────────────────────────
  warranty_number          TEXT          NOT NULL,
  manufacturer             TEXT          NOT NULL,
  warranty_type            TEXT          NOT NULL,               -- e.g. "OEM", "Extended", "Parts Only"
  
  start_date               DATE          NOT NULL,
  end_date                 DATE          NOT NULL,
  
  coverage_details         TEXT,
  
  -- The vendor fulfilling the warranty (may be the OEM or an authorized service provider)
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.warranty_status NOT NULL DEFAULT 'activated',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_warranty_dates CHECK (end_date >= start_date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_warranty_records_asset_id
  ON public.warranty_records (asset_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_warranty_records_updated_at
  BEFORE UPDATE ON public.warranty_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.warranty_records IS 'Warranty tracking for assets, enabling automated coverage checks during ticket creation.';
