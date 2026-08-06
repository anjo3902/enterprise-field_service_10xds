-- =============================================================================
-- Migration: 20260716025_technician_skills.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `technician_skills` table.
--            Maps technicians directly to the services they are qualified for.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technician_skills (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Linkages ──────────────────────────────────────────────────────────────
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,
  service_category_id      UUID          NOT NULL
                             REFERENCES public.service_categories (id)
                             ON DELETE CASCADE,
  service_type_id          UUID          REFERENCES public.service_types (id) ON DELETE CASCADE,

  -- ── Skill Details ─────────────────────────────────────────────────────────
  skill_level              INT           CHECK (skill_level >= 1 AND skill_level <= 5), -- 1=Novice, 5=Expert
  years_experience         NUMERIC(4,1),
  is_primary               BOOLEAN       NOT NULL DEFAULT false,
  
  -- Legacy certification tracking (will be migrated to technician_certifications, but kept for compatibility)
  is_certified             BOOLEAN       DEFAULT false,
  certification_number     TEXT,
  expiry_date              DATE,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_technician_skill UNIQUE NULLS NOT DISTINCT (technician_id, service_category_id, service_type_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_technician_skills_technician_id
  ON public.technician_skills (technician_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_technician_skills_updated_at
  BEFORE UPDATE ON public.technician_skills
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.technician_skills IS 'Maps individual technicians to specific operational skills and experience levels.';
