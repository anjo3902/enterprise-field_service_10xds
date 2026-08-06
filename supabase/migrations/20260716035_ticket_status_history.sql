-- =============================================================================
-- Migration: 20260716035_ticket_status_history.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `ticket_status_history` table.
--            Immutable audit log of every status transition on a ticket.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  ticket_id                UUID          NOT NULL
                             REFERENCES public.tickets (id)
                             ON DELETE CASCADE,

  -- ── Transition Details ────────────────────────────────────────────────────
  previous_status          public.ticket_status,
  new_status               public.ticket_status NOT NULL,
  changed_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  reason                   TEXT,

  -- ── Immutable Timestamp ───────────────────────────────────────────────────
  -- No updated_at — this table is append-only.
  changed_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ticket_status_hist_ticket_id
  ON public.ticket_status_history (ticket_id, changed_at DESC);

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.ticket_status_history IS 'Immutable append-only log of every status transition on a ticket.';
