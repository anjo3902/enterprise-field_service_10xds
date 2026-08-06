-- =============================================================================
-- Migration: 20260716079_ai_models.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_models` table.
--            Master registry of all AI models available on the platform.
--            Supports OpenRouter, Groq, and future providers.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_models (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  model_name               TEXT          NOT NULL,               -- e.g. "claude-3-5-sonnet", "llama-3.3-70b"
  provider                 TEXT          NOT NULL,               -- e.g. "openrouter", "groq", "google"
  version                  TEXT,

  -- ── Capabilities (for intelligent routing) ────────────────────────────────
  context_window           INT,                                  -- Max tokens supported
  supports_vision          BOOLEAN       NOT NULL DEFAULT false,
  supports_json_mode       BOOLEAN       NOT NULL DEFAULT false,
  supports_tool_calling    BOOLEAN       NOT NULL DEFAULT false,
  supports_streaming       BOOLEAN       NOT NULL DEFAULT false,

  -- ── Cost Metadata (for cost tracking) ─────────────────────────────────────
  cost_per_input_token     NUMERIC(12,8) DEFAULT 0,
  cost_per_output_token    NUMERIC(12,8) DEFAULT 0,
  currency                 TEXT          NOT NULL DEFAULT 'USD',

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_ai_model_provider UNIQUE (model_name, provider)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_status
  ON public.ai_models (provider, status)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.ai_models IS 'Registry of all AI models available on the platform (OpenRouter, Groq, Google, etc.).';
