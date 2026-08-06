-- =============================================================================
-- Migration: 20260716036_ticket_tags.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `ticket_tags` master table and `ticket_tag_map` junction.
--            Enables flexible labeling (e.g. "warranty-related", "follow-up").
-- =============================================================================

-- ── 1. Master Tags ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_tags (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  name                     TEXT          NOT NULL UNIQUE,
  color                    TEXT,                                  -- e.g. "#E53E3E"
  description              TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ticket_tags IS 'Platform-wide label catalog for ticket classification.';

-- ── 2. Ticket ↔ Tag Junction ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_tag_map (
  ticket_id                UUID          NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  tag_id                   UUID          NOT NULL REFERENCES public.ticket_tags (id) ON DELETE CASCADE,
  tagged_by                UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  tagged_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),

  PRIMARY KEY (ticket_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_tag_map_tag_id
  ON public.ticket_tag_map (tag_id);

COMMENT ON TABLE public.ticket_tag_map IS 'Many-to-many mapping of tickets to their labels.';
