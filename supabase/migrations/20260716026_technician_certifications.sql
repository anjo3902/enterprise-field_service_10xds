-- =============================================================================
-- Migration: 20260716026_technician_certifications.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `technician_certifications` table.
--            Tracks verified licenses and credentials held by a technician.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_certifications (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Linkages ──────────────────────────────────────────────────────────────
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,
  certification_id         UUID          NOT NULL
                             REFERENCES public.certifications (id)
                             ON DELETE CASCADE,

  -- ── Verification ──────────────────────────────────────────────────────────
  issue_date               DATE,
  expiry_date              DATE,
  certificate_number       TEXT,
  is_verified              BOOLEAN       NOT NULL DEFAULT false,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_technician_cert UNIQUE (technician_id, certification_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_technician_certifications_technician_id
  ON public.technician_certifications (technician_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_technician_certifications_updated_at
  BEFORE UPDATE ON public.technician_certifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.technician_certifications IS 'Verified licenses and credentials actually held by a technician.';
