-- =============================================================================
-- Migration: 20260716006_organization_members.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `organization_members` junction table.
--
-- Why this table exists separately from profiles.org_id:
--   profiles.org_id handles the PRIMARY tenant assignment (one org per user).
--   organization_members handles ROLE-SCOPED access management — e.g. auditors,
--   cross-org admins, or users with multiple org access rights.
--   It also stores the invitation metadata, which is not appropriate in profiles.
--
-- Relationship:
--   organizations  *──*  profiles   (many-to-many with role + status metadata)
--
-- Important: This table does NOT replace profiles.org_id.
--   profiles.org_id = primary assignment (for JWT / RLS / dispatch)
--   organization_members = granular access control & invitation audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  -- ── Composite PK ──────────────────────────────────────────────────────────
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id                  UUID          NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  -- ── Role within this organization ─────────────────────────────────────────
  role                     public.user_role   NOT NULL,       -- org_admin | org_user

  -- ── Invitation Lifecycle ──────────────────────────────────────────────────
  -- Invitation flow: System Admin invites org admin → org admin invites org users
  invited_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  invited_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  accepted_at              TIMESTAMPTZ,                       -- NULL = pending
  invitation_token         TEXT,                              -- Signed token (stored hashed)
  invitation_expires_at    TIMESTAMPTZ,

  -- ── Membership Status ─────────────────────────────────────────────────────
  -- 'active' = accepted and can log in
  -- 'pending' = invitation sent, not yet accepted
  -- 'suspended' = access revoked without removal
  -- 'inactive' = deactivated (soft equivalent of delete)
  status                   TEXT          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('active', 'pending', 'suspended', 'inactive')),

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  -- One active membership record per user per org
  CONSTRAINT uq_org_members_user_org UNIQUE (org_id, user_id),

  -- Only org-scoped roles allowed in this table
  CONSTRAINT chk_org_member_role
    CHECK (role IN ('org_admin', 'org_user'))
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Most common query: "all members of this org"
CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON public.organization_members (org_id, status);

-- Reverse: "all orgs this user belongs to"
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON public.organization_members (user_id);

-- Expiry check for cron job that cancels stale invitations
CREATE INDEX IF NOT EXISTS idx_org_members_invitation_expiry
  ON public.organization_members (invitation_expires_at)
  WHERE status = 'pending';

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_org_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.organization_members                   IS 'Junction table: tracks which profiles are members of which organizations, with role, invitation lifecycle, and status.';
COMMENT ON COLUMN public.organization_members.role              IS 'Only org_admin and org_user are valid. Enforced by CHECK constraint.';
COMMENT ON COLUMN public.organization_members.invitation_token  IS 'Hashed invitation token. Original token is emailed. Compared using pgcrypto or application-layer hash.';
COMMENT ON COLUMN public.organization_members.status            IS 'pending → active (on accept). System Admin or org_admin can set to suspended or inactive.';
