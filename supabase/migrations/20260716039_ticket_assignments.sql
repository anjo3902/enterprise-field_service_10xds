-- =============================================================================
-- Migration: 20260716039_ticket_assignments.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `ticket_assignments` table.
--            Full assignment chain: AI-recommended → Human-approved → Accepted/Rejected.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_assignments (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  ticket_id                UUID          NOT NULL
                             REFERENCES public.tickets (id)
                             ON DELETE CASCADE,

  -- ── Dispatch Targets ──────────────────────────────────────────────────────
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE CASCADE,
  assigned_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- ── Timeline ──────────────────────────────────────────────────────────────
  assigned_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  accepted_at              TIMESTAMPTZ,
  rejected_at              TIMESTAMPTZ,

  -- e.g. "pending", "accepted", "rejected", "reassigned", "cancelled"
  assignment_status        TEXT          NOT NULL DEFAULT 'pending',
  reason                   TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_assignment_has_target
    CHECK (vendor_id IS NOT NULL OR technician_id IS NOT NULL)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket_id
  ON public.ticket_assignments (ticket_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_technician_id
  ON public.ticket_assignments (technician_id)
  WHERE technician_id IS NOT NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_ticket_assignments_updated_at
  BEFORE UPDATE ON public.ticket_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.ticket_assignments IS 'Full assignment history: AI-recommended, human-approved, and technician-accepted.';
