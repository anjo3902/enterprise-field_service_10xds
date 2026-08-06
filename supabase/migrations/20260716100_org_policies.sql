-- =============================================================================
-- Migration: 20260716100_org_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS policies for core multi-tenant entities:
--            organizations, vendors, technicians, profiles,
--            organization_members, vendor_members, contracts.
--
-- Isolation Model:
--   organizations  → org users see ONLY their own org row
--   vendors        → vendor users see ONLY their own vendor row
--                    org users see vendors via active contracts
--   technicians    → vendor staff see all within vendor
--                    technicians see only their own record
--   profiles       → users see their own row + admins see their tenant members
--   organization_members → org_admin manages own org members
--   vendor_members       → vendor_admin manages own vendor members
--   contracts      → both parties see; no cross-org/vendor visibility
-- =============================================================================

-- ── HELPER MACRO (inline pattern used throughout all policy files) ─────────────
-- Policy expression shorthand reference:
--   Admin bypass:       public.fn_is_platform_admin()
--   Org user match:     org_id = public.fn_jwt_org_id()
--   Vendor user match:  vendor_id = public.fn_jwt_vendor_id()
--   Tech own match:     id = public.fn_jwt_tech_id()
--   Role check:         public.fn_jwt_role() IN ('org_admin', 'org_user')

-- =============================================================================
-- TABLE: organizations
-- =============================================================================
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (
    public.fn_is_platform_admin()
    OR id = public.fn_jwt_org_id()
  );

DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (
    public.fn_is_platform_admin()
  );

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    OR (
      id = public.fn_jwt_org_id()
      AND public.fn_jwt_role() = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;
CREATE POLICY "organizations_delete" ON public.organizations
  FOR DELETE USING (
    public.fn_is_platform_admin()
  );

-- =============================================================================
-- TABLE: vendors
-- =============================================================================
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
CREATE POLICY "vendors_select" ON public.vendors
  FOR SELECT USING (
    public.fn_is_platform_admin()
    -- Vendor users see their own vendor row
    OR id = public.fn_jwt_vendor_id()
    -- Org users see vendors they have an active contract with
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.vendor_id = vendors.id
        AND c.org_id = public.fn_jwt_org_id()
        AND c.status = 'active'
        AND c.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
CREATE POLICY "vendors_insert" ON public.vendors
  FOR INSERT WITH CHECK (
    public.fn_is_platform_admin()
  );

DROP POLICY IF EXISTS "vendors_update" ON public.vendors;
CREATE POLICY "vendors_update" ON public.vendors
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    OR (
      id = public.fn_jwt_vendor_id()
      AND public.fn_jwt_role() = 'vendor_admin'
    )
  );

DROP POLICY IF EXISTS "vendors_delete" ON public.vendors;
CREATE POLICY "vendors_delete" ON public.vendors
  FOR DELETE USING (
    public.fn_is_platform_admin()
  );

-- =============================================================================
-- TABLE: technicians
-- =============================================================================
DROP POLICY IF EXISTS "technicians_select" ON public.technicians;
CREATE POLICY "technicians_select" ON public.technicians
  FOR SELECT USING (
    public.fn_is_platform_admin()
    -- Vendor staff / admin see all technicians within their vendor
    OR vendor_id = public.fn_jwt_vendor_id()
    -- Technician sees only their own record
    OR id = public.fn_jwt_tech_id()
    -- Org users can see technicians dispatched to their org (via work orders)
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.technician_id = technicians.id
        AND wo.org_id = public.fn_jwt_org_id()
        AND wo.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "technicians_insert" ON public.technicians;
CREATE POLICY "technicians_insert" ON public.technicians
  FOR INSERT WITH CHECK (
    public.fn_is_platform_admin()
    OR public.fn_jwt_role() = 'vendor_admin'
  );

DROP POLICY IF EXISTS "technicians_update" ON public.technicians;
CREATE POLICY "technicians_update" ON public.technicians
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
    -- Technician can update their own profile fields (GPS, availability)
    OR id = public.fn_jwt_tech_id()
  );

DROP POLICY IF EXISTS "technicians_delete" ON public.technicians;
CREATE POLICY "technicians_delete" ON public.technicians
  FOR DELETE USING (
    public.fn_is_platform_admin()
    OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
  );

-- =============================================================================
-- TABLE: profiles
-- =============================================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    public.fn_is_platform_admin()
    -- Users always see their own profile
    OR id = auth.uid()
    -- Org admins see all profiles in their org
    OR (
      public.fn_jwt_role() = 'org_admin'
      AND org_id = public.fn_jwt_org_id()
    )
    -- Vendor admins see all profiles in their vendor
    OR (
      public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff')
      AND vendor_id = public.fn_jwt_vendor_id()
    )
  );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (
    -- Only the signup trigger (SECURITY DEFINER) or platform admin may insert
    public.fn_is_platform_admin()
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    -- Users update their own profile
    OR id = auth.uid()
    -- Org admin can update member profiles in their org
    OR (public.fn_jwt_role() = 'org_admin' AND org_id = public.fn_jwt_org_id())
    -- Vendor admin can update member profiles in their vendor
    OR (public.fn_jwt_role() = 'vendor_admin' AND vendor_id = public.fn_jwt_vendor_id())
  );

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (
    public.fn_is_platform_admin()
  );

-- =============================================================================
-- TABLE: organization_members
-- =============================================================================
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select" ON public.organization_members
  FOR SELECT USING (
    public.fn_is_platform_admin()
    OR org_id = public.fn_jwt_org_id()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert" ON public.organization_members
  FOR INSERT WITH CHECK (
    public.fn_is_platform_admin()
    OR (
      org_id = public.fn_jwt_org_id()
      AND public.fn_jwt_role() = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
CREATE POLICY "org_members_update" ON public.organization_members
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  );

DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
CREATE POLICY "org_members_delete" ON public.organization_members
  FOR DELETE USING (
    public.fn_is_platform_admin()
    OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  );

-- =============================================================================
-- TABLE: vendor_members
-- =============================================================================
DROP POLICY IF EXISTS "vendor_members_select" ON public.vendor_members;
CREATE POLICY "vendor_members_select" ON public.vendor_members
  FOR SELECT USING (
    public.fn_is_platform_admin()
    OR vendor_id = public.fn_jwt_vendor_id()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "vendor_members_insert" ON public.vendor_members;
CREATE POLICY "vendor_members_insert" ON public.vendor_members
  FOR INSERT WITH CHECK (
    public.fn_is_platform_admin()
    OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
  );

DROP POLICY IF EXISTS "vendor_members_update" ON public.vendor_members;
CREATE POLICY "vendor_members_update" ON public.vendor_members
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
  );

DROP POLICY IF EXISTS "vendor_members_delete" ON public.vendor_members;
CREATE POLICY "vendor_members_delete" ON public.vendor_members
  FOR DELETE USING (
    public.fn_is_platform_admin()
    OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
  );

-- =============================================================================
-- TABLE: contracts
-- =============================================================================
DROP POLICY IF EXISTS "contracts_select" ON public.contracts;
CREATE POLICY "contracts_select" ON public.contracts
  FOR SELECT USING (
    public.fn_is_platform_admin()
    OR org_id    = public.fn_jwt_org_id()
    OR vendor_id = public.fn_jwt_vendor_id()
  );

DROP POLICY IF EXISTS "contracts_insert" ON public.contracts;
CREATE POLICY "contracts_insert" ON public.contracts
  FOR INSERT WITH CHECK (
    public.fn_is_platform_admin()
    OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  );

DROP POLICY IF EXISTS "contracts_update" ON public.contracts;
CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE USING (
    public.fn_is_platform_admin()
    OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  );

DROP POLICY IF EXISTS "contracts_delete" ON public.contracts;
CREATE POLICY "contracts_delete" ON public.contracts
  FOR DELETE USING (
    public.fn_is_platform_admin()
  );
