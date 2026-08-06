-- =============================================================================
-- Migration: 20260716010_sites.sql
-- Phase:     1B.1 — Enterprise Facility Hierarchy
-- Purpose:   Create the `sites` table, representing physical customer campuses
--            owned by an organization.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sites (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE RESTRICT,

  -- ── Core Details ──────────────────────────────────────────────────────────
  site_code                TEXT          NOT NULL,
  name                     TEXT          NOT NULL,
  description              TEXT,

  -- ── Location & Address ────────────────────────────────────────────────────
  address_line_1           TEXT,
  address_line_2           TEXT,
  city                     TEXT,
  state_province           TEXT,
  country                  TEXT,
  postal_code              TEXT,
  timezone                 TEXT          NOT NULL DEFAULT 'UTC',
  latitude                 FLOAT,
  longitude                FLOAT,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_sites_org_code UNIQUE (org_id, site_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_org_id
  ON public.sites (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sites_status
  ON public.sites (status)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.sites IS 'Enterprise physical locations/campuses owned by an organization.';
COMMENT ON COLUMN public.sites.site_code IS 'Unique code within the organization for the site (e.g. BLR-01).';
