-- =============================================================================
-- Migration: 20260716082_ai_diagnosis_cache.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_diagnosis_cache` table.
--            Caches AI diagnoses for identical assets/images to reduce API costs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_diagnosis_cache (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Cache Key ─────────────────────────────────────────────────────────────
  asset_id                 UUID          REFERENCES public.assets (id) ON DELETE CASCADE,
  ticket_id                UUID          REFERENCES public.tickets (id) ON DELETE CASCADE,
  
  -- SHA-256 hash of the input image(s) for image diagnosis caching
  image_hash               TEXT,

  -- ── Cached Result ─────────────────────────────────────────────────────────
  diagnosis                TEXT          NOT NULL,
  severity                 TEXT,                                  -- e.g. "Low", "High", "Critical"
  confidence_score         NUMERIC(4,3)
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  recommended_action       TEXT,

  -- ── Expiry ────────────────────────────────────────────────────────────────
  expires_at               TIMESTAMPTZ   NOT NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_cache_asset
  ON public.ai_diagnosis_cache (asset_id, expires_at DESC)
  WHERE asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_cache_image_hash
  ON public.ai_diagnosis_cache (image_hash)
  WHERE image_hash IS NOT NULL;

COMMENT ON TABLE public.ai_diagnosis_cache IS 'Cached AI diagnoses keyed by asset or image hash to avoid redundant API calls.';
