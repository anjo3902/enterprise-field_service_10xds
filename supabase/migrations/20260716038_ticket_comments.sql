-- =============================================================================
-- Migration: 20260716038_ticket_comments.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `ticket_comments` table.
--            Threaded communication log for all ticket stakeholders.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  ticket_id                UUID          NOT NULL
                             REFERENCES public.tickets (id)
                             ON DELETE CASCADE,

  -- ── Content ───────────────────────────────────────────────────────────────
  body                     TEXT          NOT NULL,
  
  -- e.g. "update", "internal_note", "customer_visible", "system_event"
  comment_type             TEXT          NOT NULL DEFAULT 'update',

  -- e.g. "all" (public), "internal" (org+vendor only), "private" (author only)
  visibility               TEXT          NOT NULL DEFAULT 'all',

  -- ── Author & Attachments ──────────────────────────────────────────────────
  author_id                UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id
  ON public.ticket_comments (ticket_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.ticket_comments IS 'Threaded communication log on a ticket. Supports internal notes and customer-visible updates.';
