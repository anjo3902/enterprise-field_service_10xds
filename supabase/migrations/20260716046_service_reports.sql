-- =============================================================================
-- Migration: 20260716046_service_reports.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create the `service_reports` table.
--            The formal sign-off document generated at work order completion.
--            Captures technician summary, approval chain, and signatures.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.service_reports (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  -- 1:1 relationship — one service report per work order
  work_order_id            UUID          NOT NULL UNIQUE
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,

  -- ── Content ───────────────────────────────────────────────────────────────
  summary                  TEXT,
  resolution_description   TEXT,
  recommendations          TEXT,

  -- ── Digital Signatures (storage paths or base64 tokens) ───────────────────
  technician_signature     TEXT,                                  -- Supabase storage path
  customer_signature       TEXT,                                  -- Supabase storage path

  -- ── Approval Chain ────────────────────────────────────────────────────────
  vendor_approved_by       UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  vendor_approved_at       TIMESTAMPTZ,

  org_approved_by          UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  org_approved_at          TIMESTAMPTZ,

  -- ── Generation ────────────────────────────────────────────────────────────
  generated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_service_reports_updated_at
  BEFORE UPDATE ON public.service_reports
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.service_reports IS 'Formal sign-off document at work order completion. Captures summary, signatures, and dual approval chain.';
