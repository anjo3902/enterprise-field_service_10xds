-- =============================================================================
-- Migration: 20260716088_ai_feature_flags.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_feature_flags` table.
--            Per-org/vendor feature toggles to enable/disable AI capabilities.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_feature_flags (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Scope ─────────────────────────────────────────────────────────────────
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Feature Definition ────────────────────────────────────────────────────
  -- e.g. "ai_ticket_diagnosis", "ai_dispatch_recommendation", "ai_vision_analysis"
  feature_name             TEXT          NOT NULL,
  is_enabled               BOOLEAN       NOT NULL DEFAULT false,
  
  -- Additional configuration (e.g. {"max_requests_per_day": 100})
  configuration            JSONB         DEFAULT '{}',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_ai_feature_flag_scope
    CHECK (org_id IS NOT NULL OR vendor_id IS NOT NULL),
  CONSTRAINT uq_ai_feature_flag_org
    UNIQUE (org_id, feature_name),
  CONSTRAINT uq_ai_feature_flag_vendor
    UNIQUE (vendor_id, feature_name)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_feature_flags_org
  ON public.ai_feature_flags (org_id, feature_name)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_feature_flags_vendor
  ON public.ai_feature_flags (vendor_id, feature_name)
  WHERE vendor_id IS NOT NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_feature_flags_updated_at
  BEFORE UPDATE ON public.ai_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.ai_feature_flags IS 'Per-org/vendor feature flags to enable/disable individual AI capabilities.';
