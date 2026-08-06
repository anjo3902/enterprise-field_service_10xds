-- =============================================================================
-- Migration: 20260716007_vendor_members.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `vendor_members` junction table.
--
-- Why this table exists separately from profiles.vendor_id:
--   Same reasoning as organization_members. profiles.vendor_id = primary JWT claim.
--   vendor_members = invitation audit trail + role management within the vendor.
--
-- Relationship:
--   vendors  *──*  profiles   (many-to-many with role + invitation metadata)
--
-- Note: Technician profiles are included here when role = 'technician'.
--   Their vendor_id in profiles already isolates their data.
--   vendor_members lets the vendor_admin see all staff + their invitation states.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_members (
  -- ── Composite PK ──────────────────────────────────────────────────────────
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                UUID          NOT NULL REFERENCES public.vendors (id) ON DELETE CASCADE,
  user_id                  UUID          NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  -- ── Role within this vendor ───────────────────────────────────────────────
  role                     public.user_role   NOT NULL,       -- vendor_admin | vendor_staff | technician

  -- ── Linked Technician (only when role = 'technician') ────────────────────
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,

  -- ── Invitation Lifecycle ──────────────────────────────────────────────────
  invited_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  invited_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  accepted_at              TIMESTAMPTZ,
  invitation_token         TEXT,
  invitation_expires_at    TIMESTAMPTZ,

  -- ── Membership Status ─────────────────────────────────────────────────────
  status                   TEXT          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('active', 'pending', 'suspended', 'inactive')),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_vendor_members_user_vendor UNIQUE (vendor_id, user_id),

  -- Only vendor-scoped roles allowed in this table
  CONSTRAINT chk_vendor_member_role
    CHECK (role IN ('vendor_admin', 'vendor_staff', 'technician')),

  -- Technician FK only valid when role is technician
  CONSTRAINT chk_vendor_member_tech_role
    CHECK (
      (role = 'technician' AND technician_id IS NOT NULL)
      OR (role != 'technician' AND technician_id IS NULL)
    )
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendor_members_vendor_id
  ON public.vendor_members (vendor_id, status);

CREATE INDEX IF NOT EXISTS idx_vendor_members_user_id
  ON public.vendor_members (user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_members_technician_id
  ON public.vendor_members (technician_id)
  WHERE technician_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_members_invitation_expiry
  ON public.vendor_members (invitation_expires_at)
  WHERE status = 'pending';

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_vendor_members_updated_at
  BEFORE UPDATE ON public.vendor_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.vendor_members                  IS 'Junction table: tracks which profiles are members of which vendors, with role, invitation lifecycle, and technician linkage.';
COMMENT ON COLUMN public.vendor_members.technician_id    IS 'Only non-NULL when role = technician. Links vendor_members to the operational technicians record.';
COMMENT ON COLUMN public.vendor_members.role             IS 'Only vendor_admin, vendor_staff, or technician are valid. Enforced by CHECK constraint.';
