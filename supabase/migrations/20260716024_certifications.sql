-- =============================================================================
-- Migration: 20260716024_certifications.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `certifications` table.
--            Master list of recognized industry credentials and licenses.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.certifications (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Core Details ──────────────────────────────────────────────────────────
  name                     TEXT          NOT NULL UNIQUE,
  issuing_authority        TEXT,
  validity_months          INT,                                -- Typical duration of validity (e.g. 24 for 2 years)
  description              TEXT,

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
CREATE INDEX IF NOT EXISTS idx_certifications_status
  ON public.certifications (status)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.certifications IS 'Master catalog of recognized industry certifications (e.g. OSHA 30, EPA 608).';
