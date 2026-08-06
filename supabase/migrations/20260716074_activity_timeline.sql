-- =============================================================================
-- Migration: 20260716074_activity_timeline.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `activity_timeline` table.
--            User-facing timeline of events for Tickets, Assets, etc.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.activity_timeline (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Target Entity ─────────────────────────────────────────────────────────
  -- e.g. "ticket", "asset", "work_order"
  entity_type              TEXT          NOT NULL,
  entity_id                UUID          NOT NULL,

  -- ── Event Details ─────────────────────────────────────────────────────────
  -- e.g. "status_change", "comment_added", "part_consumed"
  activity_type            TEXT          NOT NULL,
  description              TEXT          NOT NULL,
  
  -- ── Actor ─────────────────────────────────────────────────────────────────
  performed_by_id          UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  role                     TEXT,                                  -- Role of actor at the time of the event

  -- ── Context ───────────────────────────────────────────────────────────────
  metadata                 JSONB,                                 -- e.g. {"old_status": "open", "new_status": "assigned"}

  -- ── Immutable Timestamp ───────────────────────────────────────────────────
  occurred_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_timeline_entity
  ON public.activity_timeline (entity_type, entity_id, occurred_at DESC);

COMMENT ON TABLE  public.activity_timeline IS 'User-facing chronological feed of events for specific entities (like the Ticket Timeline). Append-only.';
