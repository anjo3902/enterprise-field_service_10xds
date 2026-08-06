-- =============================================================================
-- Migration: 20260716073_notifications.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `notifications` table.
--            In-app notification instances delivered to users.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  notification_number      TEXT          NOT NULL UNIQUE,

  -- ── Recipient ─────────────────────────────────────────────────────────────
  recipient_profile_id     UUID          NOT NULL
                             REFERENCES public.profiles (id)
                             ON DELETE CASCADE,
                             
  -- Context roles for scoping or aggregation
  recipient_role           TEXT,         -- e.g. "org_admin", "technician", "vendor_manager"
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE CASCADE,

  -- ── Content ───────────────────────────────────────────────────────────────
  notification_type        TEXT          NOT NULL,               -- e.g. "ticket_assigned", "sla_warning"
  priority                 public.ticket_priority NOT NULL DEFAULT 'Medium',
  
  title                    TEXT          NOT NULL,
  message                  TEXT          NOT NULL,
  
  -- Structured data for deep linking in the app (e.g. {"ticket_id": "..."})
  payload                  JSONB,

  -- ── State ─────────────────────────────────────────────────────────────────
  is_read                  BOOLEAN       NOT NULL DEFAULT false,
  read_at                  TIMESTAMPTZ,
  
  -- For channels outside in-app (if this table is used as a global queue)
  delivery_status          TEXT          NOT NULL DEFAULT 'delivered',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications (recipient_profile_id, is_read, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.notifications IS 'Individual notification instances delivered to users.';
