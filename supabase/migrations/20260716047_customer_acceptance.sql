-- =============================================================================
-- Migration: 20260716047_customer_acceptance.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create the `customer_acceptance` table.
--            Captures the organization's final acceptance (or rejection) of work.
--            Also records the satisfaction rating and CSAT feedback.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_acceptance (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  -- 1:1 relationship — one acceptance record per work order
  work_order_id            UUID          NOT NULL UNIQUE
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,

  -- ── Acceptance ────────────────────────────────────────────────────────────
  is_accepted              BOOLEAN,
  accepted_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  accepted_at              TIMESTAMPTZ,

  -- ── Satisfaction ──────────────────────────────────────────────────────────
  rating                   INT           CHECK (rating >= 1 AND rating <= 5),
  feedback                 TEXT,

  -- ── Reopening ─────────────────────────────────────────────────────────────
  is_reopened              BOOLEAN       NOT NULL DEFAULT false,
  reopen_reason            TEXT,
  reopened_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  reopened_at              TIMESTAMPTZ,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_customer_acceptance_updated_at
  BEFORE UPDATE ON public.customer_acceptance
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.customer_acceptance IS 'Organization final acceptance of completed work — captures rating, CSAT, and reopen logic.';
