-- =============================================================================
-- Migration: 20260716055_dispatch_queue_items.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `dispatch_queue_items` table.
--            Individual work items waiting in a dispatch queue with scoring data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dispatch_queue_items (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  queue_id                 UUID          NOT NULL
                             REFERENCES public.dispatch_queues (id)
                             ON DELETE CASCADE,
  ticket_id                UUID          REFERENCES public.tickets (id) ON DELETE CASCADE,
  work_order_id            UUID          REFERENCES public.work_orders (id) ON DELETE CASCADE,

  -- ── Scoring ───────────────────────────────────────────────────────────────
  priority_score           NUMERIC(5,2)  NOT NULL DEFAULT 0,     -- Computed composite score
  ai_recommendation_score  NUMERIC(5,2),                         -- AI confidence score (0.0–1.0)

  -- ── Timestamps ────────────────────────────────────────────────────────────
  queued_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  scheduled_at             TIMESTAMPTZ,
  assigned_at              TIMESTAMPTZ,

  -- ── State ─────────────────────────────────────────────────────────────────
  -- e.g. "waiting", "scheduled", "assigned", "dispatched", "completed", "cancelled"
  status                   TEXT          NOT NULL DEFAULT 'waiting',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_queue_item_has_source
    CHECK (ticket_id IS NOT NULL OR work_order_id IS NOT NULL),
  CONSTRAINT chk_ai_score_range
    CHECK (ai_recommendation_score IS NULL OR (ai_recommendation_score >= 0 AND ai_recommendation_score <= 1))
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dq_items_queue_status
  ON public.dispatch_queue_items (queue_id, status, priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_dq_items_ticket_id
  ON public.dispatch_queue_items (ticket_id)
  WHERE ticket_id IS NOT NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_dq_items_updated_at
  BEFORE UPDATE ON public.dispatch_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.dispatch_queue_items IS 'Individual work items in a dispatch queue with priority and AI scoring data.';
