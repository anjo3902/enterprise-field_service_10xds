-- =============================================================================
-- Migration: 20260716054_dispatch_queues.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `dispatch_queues` table.
--            Named, priority-ordered queues that bucket incoming work for
--            vendor dispatch operators and the future AI dispatch engine.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dispatch_queues (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  queue_number             TEXT          NOT NULL UNIQUE,        -- e.g. DQ-2026-001

  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Configuration ─────────────────────────────────────────────────────────
  name                     TEXT          NOT NULL,
  priority_level           INT           NOT NULL DEFAULT 5 CHECK (priority_level >= 1 AND priority_level <= 10),

  -- Determines how items are pulled from this queue:
  -- e.g. "FIFO", "Priority_Score", "AI_Optimized", "Nearest_Technician"
  dispatch_strategy        TEXT          NOT NULL DEFAULT 'Priority_Score',

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT uq_dispatch_queues_org_name UNIQUE (org_id, vendor_id, name)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dispatch_queues_org_id
  ON public.dispatch_queues (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_queues_vendor_id
  ON public.dispatch_queues (vendor_id)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_dispatch_queues_updated_at
  BEFORE UPDATE ON public.dispatch_queues
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.dispatch_queues IS 'Named, strategy-driven queues for organizing incoming work items for vendor dispatch.';
