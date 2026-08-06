-- =============================================================================
-- Migration: 20260716080_ai_prompt_library.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_prompt_library` table.
--            Centrally managed, version-controlled prompt repository.
--            All AI calls must reference a prompt from this library.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_library (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  prompt_code              TEXT          NOT NULL,               -- e.g. "TICKET_DIAGNOSIS_V2"
  name                     TEXT          NOT NULL,

  -- e.g. "diagnosis", "dispatch", "vendor_recommendation", "root_cause"
  prompt_type              TEXT          NOT NULL,

  -- ── Content ───────────────────────────────────────────────────────────────
  system_prompt            TEXT          NOT NULL,
  user_prompt_template     TEXT          NOT NULL,
  
  -- Names of the variables this template expects: e.g. ["asset_type", "fault_code"]
  variables                TEXT[]        DEFAULT '{}',

  -- ── Versioning ────────────────────────────────────────────────────────────
  version                  INT           NOT NULL DEFAULT 1,
  language                 TEXT          NOT NULL DEFAULT 'en',

  -- ── Default Model ─────────────────────────────────────────────────────────
  default_model_id         UUID          REFERENCES public.ai_models (id) ON DELETE SET NULL,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_ai_prompt_code_version UNIQUE (prompt_code, version)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_type
  ON public.ai_prompt_library (prompt_type, status)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_prompt_library_updated_at
  BEFORE UPDATE ON public.ai_prompt_library
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.ai_prompt_library IS 'Version-controlled central repository of all AI prompts used across the platform.';
