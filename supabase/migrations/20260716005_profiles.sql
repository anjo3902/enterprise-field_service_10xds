-- =============================================================================
-- Migration: 20260716005_profiles.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `profiles` table — one row per authenticated user.
--            This table extends auth.users (managed by Supabase GoTrue).
--
-- Relationship summary:
--   profiles  *──1 organizations  (org user belongs to one org, NULL for vendor/admin)
--   profiles  *──1 vendors        (vendor user belongs to one vendor, NULL for org/admin)
--   profiles  1──1 technicians    (tech_id set only when role = 'technician')
--   profiles  *──* (audit_logs, notifications, tickets, etc.)
--
-- Why it exists:
--   Supabase Auth (GoTrue) manages authentication in the auth.users table.
--   We must not modify auth.users directly. The profiles table is the
--   application-layer user record — it carries role, org/vendor assignment,
--   preferences, and device tokens.
--
--   The custom JWT hook (efn-auth-hooks) reads this table to inject:
--     app_role, org_id, vendor_id, tech_id → into JWT claims.
--   Every RLS policy then uses these JWT claims — no extra JOIN needed.
--
-- Circular FK resolution:
--   vendors.manager_id → profiles.id    (forward reference solved by ALTER TABLE in this file)
--   technicians.user_id → profiles.id   (forward reference solved by ALTER TABLE in this file)
--   profiles.org_id → organizations.id  (backward reference — organizations already exists)
--   profiles.vendor_id → vendors.id     (backward reference — vendors already exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  -- ── Identity — mirrors auth.users.id exactly ───────────────────────────────
  id                       UUID          PRIMARY KEY,          -- = auth.users.id (no gen_random_uuid here)

  -- ── Personal Details ──────────────────────────────────────────────────────
  full_name                TEXT,
  first_name               TEXT,
  last_name                TEXT,
  email                    TEXT          NOT NULL,
  phone                    TEXT,
  avatar_url               TEXT,                               -- Supabase Storage: avatars/{user_id}

  -- ── Role & Tenant Assignment ───────────────────────────────────────────────
  role                     public.user_role   NOT NULL,

  -- Only one of org_id / vendor_id should be non-NULL:
  --   system_admin  → both NULL
  --   org_admin     → org_id set, vendor_id NULL
  --   org_user      → org_id set, vendor_id NULL
  --   vendor_admin  → vendor_id set, org_id NULL
  --   vendor_staff  → vendor_id set, org_id NULL
  --   technician    → vendor_id set, org_id NULL, tech_id set
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE SET NULL,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,

  -- Denormalized polymorphic fields (convenience for display + JWT)
  assigned_entity_id       UUID,                               -- = org_id OR vendor_id (whichever is set)
  assigned_entity_type     TEXT          CHECK (assigned_entity_type IN ('org', 'vendor', 'system')),

  -- Linked technician record (set only when role = 'technician')
  tech_id                  UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,

  -- ── Account Status ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Security ──────────────────────────────────────────────────────────────
  two_factor_enabled       BOOLEAN        NOT NULL DEFAULT false,
  two_factor_secret        TEXT,                               -- AES-256 encrypted TOTP secret
  last_login_at            TIMESTAMPTZ,
  failed_login_count       SMALLINT       NOT NULL DEFAULT 0,
  locked_until             TIMESTAMPTZ,                        -- Account lockout expiry

  -- ── Preferences ───────────────────────────────────────────────────────────
  theme                    TEXT           DEFAULT 'system',    -- 'light' | 'dark' | 'system'
  language                 TEXT           DEFAULT 'en',
  notification_preferences JSONB,                             -- {push: true, email: true, sms: false}

  -- ── Push Notifications ────────────────────────────────────────────────────
  fcm_token                TEXT,                               -- Firebase Cloud Messaging device token (mobile)

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ    DEFAULT NULL,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_profiles_email UNIQUE (email),

  -- Only one tenant context allowed at a time
  CONSTRAINT chk_profiles_single_tenant
    CHECK (
      (org_id IS NULL OR vendor_id IS NULL)                   -- Cannot be both org AND vendor user
    ),

  CONSTRAINT chk_profiles_tech_requires_vendor
    CHECK (
      tech_id IS NULL OR vendor_id IS NOT NULL                -- Technician must have a vendor
    ),

  CONSTRAINT chk_profiles_entity_type
    CHECK (
      assigned_entity_type IS NULL OR
      assigned_entity_type IN ('org', 'vendor', 'system')
    )
);

-- ── Now close the circular FK dependencies ────────────────────────────────────
-- vendors.manager_id was created without a FK (NULL allowed) to break the cycle.
-- Now that profiles exists, add the FK constraint.
ALTER TABLE public.vendors
  ADD CONSTRAINT fk_vendors_manager_id
    FOREIGN KEY (manager_id)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- technicians.user_id similarly deferred — close it now.
ALTER TABLE public.technicians
  ADD CONSTRAINT fk_technicians_user_id
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- organizations.created_by / updated_by — now safe to add
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_organizations_created_by
    FOREIGN KEY (created_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

ALTER TABLE public.organizations
  ADD CONSTRAINT fk_organizations_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- vendors.created_by / updated_by
ALTER TABLE public.vendors
  ADD CONSTRAINT fk_vendors_created_by
    FOREIGN KEY (created_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

ALTER TABLE public.vendors
  ADD CONSTRAINT fk_vendors_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- technicians.created_by / updated_by
ALTER TABLE public.technicians
  ADD CONSTRAINT fk_technicians_created_by
    FOREIGN KEY (created_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

ALTER TABLE public.technicians
  ADD CONSTRAINT fk_technicians_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_profiles_org_id
  ON public.profiles (org_id)
  WHERE org_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_vendor_id
  ON public.profiles (vendor_id)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tech_id
  ON public.profiles (tech_id)
  WHERE tech_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles (status)
  WHERE deleted_at IS NULL;

-- ── Supabase Auth trigger: auto-create profile on new user signup ──────────────
-- Inserts a minimal profile row when auth.users gets a new record.
-- Edge Function invitation flow will UPDATE this row with full details.
CREATE OR REPLACE FUNCTION public.fn_create_profile_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'org_user'::public.user_role
    ),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate to be idempotent
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_profile_on_signup();

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.profiles                  IS 'Application-layer user record extending auth.users. One row per authenticated user. JWT hook reads this to inject app_role, org_id, vendor_id, tech_id.';
COMMENT ON COLUMN public.profiles.id               IS 'Primary key = auth.users.id. Not auto-generated — mirrors the GoTrue user ID.';
COMMENT ON COLUMN public.profiles.role             IS 'user_role ENUM. Injected into JWT claims by efn-auth-hooks. Drives all RLS policies.';
COMMENT ON COLUMN public.profiles.org_id           IS 'Set for org_admin and org_user roles. NULL for vendor users and system_admin.';
COMMENT ON COLUMN public.profiles.vendor_id        IS 'Set for vendor_admin, vendor_staff, technician roles. NULL for org users and system_admin.';
COMMENT ON COLUMN public.profiles.tech_id          IS 'Only set when role = technician. Links to technicians.id for dispatch and GPS.';
COMMENT ON COLUMN public.profiles.fcm_token        IS 'Firebase Cloud Messaging token for push notifications to mobile app.';
COMMENT ON COLUMN public.profiles.two_factor_secret IS 'Encrypted TOTP secret. Encrypted at application layer before storage.';
