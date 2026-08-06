-- =============================================================================
-- Migration: 20260716101_facility_catalog_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS policies for:
--            • Facility Hierarchy (sites, buildings, floors, rooms)
--            • Assets, Healthscores, Asset History
--            • Organization Structure (business_units, departments,
--              cost_centers, employees, organization_contacts)
--            • Service Catalog (service_categories, service_types,
--              vendor_capabilities, certifications, technician_skills,
--              technician_certifications, vendor_coverage_areas)
--
-- Key Isolation Rules:
--   Facility data → scoped to org_id
--   Assets        → scoped to org_id (nullable; treated as visible to platform admin)
--   Service Catalog → read-only for all authenticated users; write for admin
--   Vendor Capabilities → vendor manages own; org sees their contracted vendors'
-- =============================================================================

-- =============================================================================
-- FACILITY HIERARCHY
-- =============================================================================

-- ── TABLE: sites ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sites_select" ON public.sites;
CREATE POLICY "sites_select" ON public.sites FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id()
  OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = sites.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active' AND c.deleted_at IS NULL)
);
DROP POLICY IF EXISTS "sites_insert" ON public.sites;
CREATE POLICY "sites_insert" ON public.sites FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);
DROP POLICY IF EXISTS "sites_update" ON public.sites;
CREATE POLICY "sites_update" ON public.sites FOR UPDATE USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);
DROP POLICY IF EXISTS "sites_delete" ON public.sites;
CREATE POLICY "sites_delete" ON public.sites FOR DELETE USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

-- ── TABLE: buildings ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "buildings_select" ON public.buildings;
CREATE POLICY "buildings_select" ON public.buildings FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = buildings.site_id AND (s.org_id = public.fn_jwt_org_id() OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = s.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active')))
);
DROP POLICY IF EXISTS "buildings_insert" ON public.buildings;
CREATE POLICY "buildings_insert" ON public.buildings FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR (public.fn_jwt_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.sites s WHERE s.id = buildings.site_id AND s.org_id = public.fn_jwt_org_id()))
);
DROP POLICY IF EXISTS "buildings_update" ON public.buildings;
CREATE POLICY "buildings_update" ON public.buildings FOR UPDATE USING (
  public.fn_is_platform_admin()
  OR (public.fn_jwt_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.sites s WHERE s.id = buildings.site_id AND s.org_id = public.fn_jwt_org_id()))
);
DROP POLICY IF EXISTS "buildings_delete" ON public.buildings;
CREATE POLICY "buildings_delete" ON public.buildings FOR DELETE USING (
  public.fn_is_platform_admin()
  OR (public.fn_jwt_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.sites s WHERE s.id = buildings.site_id AND s.org_id = public.fn_jwt_org_id()))
);

-- ── TABLE: floors ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "floors_select" ON public.floors;
CREATE POLICY "floors_select" ON public.floors FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.buildings b JOIN public.sites s ON s.id = b.site_id WHERE b.id = floors.building_id AND (s.org_id = public.fn_jwt_org_id() OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = s.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active')))
);
DROP POLICY IF EXISTS "floors_insert" ON public.floors;
CREATE POLICY "floors_insert" ON public.floors FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR (public.fn_jwt_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.buildings b JOIN public.sites s ON s.id = b.site_id WHERE b.id = floors.building_id AND s.org_id = public.fn_jwt_org_id()))
);
DROP POLICY IF EXISTS "floors_update" ON public.floors;
CREATE POLICY "floors_update" ON public.floors FOR UPDATE USING (
  public.fn_is_platform_admin()
  OR (public.fn_jwt_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.buildings b JOIN public.sites s ON s.id = b.site_id WHERE b.id = floors.building_id AND s.org_id = public.fn_jwt_org_id()))
);
DROP POLICY IF EXISTS "floors_delete" ON public.floors;
CREATE POLICY "floors_delete" ON public.floors FOR DELETE USING (
  public.fn_is_platform_admin()
);

-- ── TABLE: rooms ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.floors f JOIN public.buildings b ON b.id = f.building_id JOIN public.sites s ON s.id = b.site_id WHERE f.id = rooms.floor_id AND (s.org_id = public.fn_jwt_org_id() OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = s.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active')))
);
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (public.fn_is_platform_admin() OR public.fn_jwt_role() = 'org_admin');
DROP POLICY IF EXISTS "rooms_update" ON public.rooms;
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (public.fn_is_platform_admin() OR public.fn_jwt_role() = 'org_admin');
DROP POLICY IF EXISTS "rooms_delete" ON public.rooms;
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE USING (public.fn_is_platform_admin());

-- =============================================================================
-- ASSETS (Developer 2 table — org_id is nullable; vendor access via contracts)
-- =============================================================================
DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select" ON public.assets FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = assets.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active' AND c.deleted_at IS NULL)
);
DROP POLICY IF EXISTS "assets_insert" ON public.assets;
CREATE POLICY "assets_insert" ON public.assets FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);
DROP POLICY IF EXISTS "assets_update" ON public.assets;
CREATE POLICY "assets_update" ON public.assets FOR UPDATE USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() IN ('org_admin', 'org_user'))
  -- Vendor technician can update health fields during a work order
  OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = assets.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active')
);
DROP POLICY IF EXISTS "assets_delete" ON public.assets;
CREATE POLICY "assets_delete" ON public.assets FOR DELETE USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

-- ── TABLE: healthscores ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "healthscores_select" ON public.healthscores;
CREATE POLICY "healthscores_select" ON public.healthscores FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "healthscores_insert" ON public.healthscores;
CREATE POLICY "healthscores_insert" ON public.healthscores FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "healthscores_update" ON public.healthscores;
CREATE POLICY "healthscores_update" ON public.healthscores FOR UPDATE USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "healthscores_delete" ON public.healthscores;
CREATE POLICY "healthscores_delete" ON public.healthscores FOR DELETE USING (public.fn_is_platform_admin());

-- ── TABLE: asset_history ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "asset_history_select" ON public.asset_history;
CREATE POLICY "asset_history_select" ON public.asset_history FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "asset_history_insert" ON public.asset_history;
CREATE POLICY "asset_history_insert" ON public.asset_history FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);

-- =============================================================================
-- ORGANIZATION STRUCTURE
-- =============================================================================
-- Shared pattern for org-scoped tables: business_units, departments, cost_centers, employees, organization_contacts

DROP POLICY IF EXISTS "business_units_select" ON public.business_units;
CREATE POLICY "business_units_select" ON public.business_units FOR SELECT USING (public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id());
DROP POLICY IF EXISTS "business_units_insert" ON public.business_units;
CREATE POLICY "business_units_insert" ON public.business_units FOR INSERT WITH CHECK (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "business_units_update" ON public.business_units;
CREATE POLICY "business_units_update" ON public.business_units FOR UPDATE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "business_units_delete" ON public.business_units;
CREATE POLICY "business_units_delete" ON public.business_units FOR DELETE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));

DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments FOR SELECT USING (public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id());
DROP POLICY IF EXISTS "departments_insert" ON public.departments;
CREATE POLICY "departments_insert" ON public.departments FOR INSERT WITH CHECK (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "departments_update" ON public.departments;
CREATE POLICY "departments_update" ON public.departments FOR UPDATE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "departments_delete" ON public.departments;
CREATE POLICY "departments_delete" ON public.departments FOR DELETE USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "cost_centers_select" ON public.cost_centers;
CREATE POLICY "cost_centers_select" ON public.cost_centers FOR SELECT USING (public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id());
DROP POLICY IF EXISTS "cost_centers_insert" ON public.cost_centers;
CREATE POLICY "cost_centers_insert" ON public.cost_centers FOR INSERT WITH CHECK (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "cost_centers_update" ON public.cost_centers;
CREATE POLICY "cost_centers_update" ON public.cost_centers FOR UPDATE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "cost_centers_delete" ON public.cost_centers;
CREATE POLICY "cost_centers_delete" ON public.cost_centers FOR DELETE USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT USING (public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id());
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT WITH CHECK (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees FOR DELETE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));

DROP POLICY IF EXISTS "org_contacts_select" ON public.organization_contacts;
CREATE POLICY "org_contacts_select" ON public.organization_contacts FOR SELECT USING (public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id());
DROP POLICY IF EXISTS "org_contacts_insert" ON public.organization_contacts;
CREATE POLICY "org_contacts_insert" ON public.organization_contacts FOR INSERT WITH CHECK (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "org_contacts_update" ON public.organization_contacts;
CREATE POLICY "org_contacts_update" ON public.organization_contacts FOR UPDATE USING (public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin'));
DROP POLICY IF EXISTS "org_contacts_delete" ON public.organization_contacts;
CREATE POLICY "org_contacts_delete" ON public.organization_contacts FOR DELETE USING (public.fn_is_platform_admin());

-- =============================================================================
-- SERVICE CATALOG  (platform-wide; all authenticated users can read)
-- Writes restricted to system_admin and vendor_admin for own capabilities.
-- =============================================================================
DROP POLICY IF EXISTS "service_categories_select" ON public.service_categories;
CREATE POLICY "service_categories_select" ON public.service_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_categories_write" ON public.service_categories;
CREATE POLICY "service_categories_write" ON public.service_categories FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "service_types_select" ON public.service_types;
CREATE POLICY "service_types_select" ON public.service_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_types_write" ON public.service_types;
CREATE POLICY "service_types_write" ON public.service_types FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "certifications_select" ON public.certifications;
CREATE POLICY "certifications_select" ON public.certifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "certifications_write" ON public.certifications;
CREATE POLICY "certifications_write" ON public.certifications FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "vendor_capabilities_select" ON public.vendor_capabilities;
CREATE POLICY "vendor_capabilities_select" ON public.vendor_capabilities FOR SELECT USING (
  public.fn_is_platform_admin() OR vendor_id = public.fn_jwt_vendor_id()
  OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.vendor_id = vendor_capabilities.vendor_id AND c.org_id = public.fn_jwt_org_id() AND c.status = 'active')
);
DROP POLICY IF EXISTS "vendor_capabilities_write" ON public.vendor_capabilities;
CREATE POLICY "vendor_capabilities_write" ON public.vendor_capabilities FOR ALL USING (
  public.fn_is_platform_admin() OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "technician_skills_select" ON public.technician_skills;
CREATE POLICY "technician_skills_select" ON public.technician_skills FOR SELECT USING (
  public.fn_is_platform_admin() OR vendor_id = public.fn_jwt_vendor_id()
  OR technician_id = public.fn_jwt_tech_id()
);
DROP POLICY IF EXISTS "technician_skills_write" ON public.technician_skills;
CREATE POLICY "technician_skills_write" ON public.technician_skills FOR ALL USING (
  public.fn_is_platform_admin() OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "tech_certifications_select" ON public.technician_certifications;
CREATE POLICY "tech_certifications_select" ON public.technician_certifications FOR SELECT USING (
  public.fn_is_platform_admin() OR technician_id = public.fn_jwt_tech_id()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_certifications.technician_id AND t.vendor_id = public.fn_jwt_vendor_id())
);
DROP POLICY IF EXISTS "tech_certifications_write" ON public.technician_certifications;
CREATE POLICY "tech_certifications_write" ON public.technician_certifications FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_certifications.technician_id AND t.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "vendor_coverage_areas_select" ON public.vendor_coverage_areas;
CREATE POLICY "vendor_coverage_areas_select" ON public.vendor_coverage_areas FOR SELECT USING (
  public.fn_is_platform_admin() OR vendor_id = public.fn_jwt_vendor_id()
  OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.vendor_id = vendor_coverage_areas.vendor_id AND c.org_id = public.fn_jwt_org_id() AND c.status = 'active')
);
DROP POLICY IF EXISTS "vendor_coverage_areas_write" ON public.vendor_coverage_areas;
CREATE POLICY "vendor_coverage_areas_write" ON public.vendor_coverage_areas FOR ALL USING (
  public.fn_is_platform_admin() OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

-- =============================================================================
-- SLA ENGINE  (org-scoped; vendor sees via contract; global read for admins)
-- =============================================================================
DROP POLICY IF EXISTS "business_hours_select" ON public.business_hours;
CREATE POLICY "business_hours_select" ON public.business_hours FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR org_id IS NULL
);
DROP POLICY IF EXISTS "business_hours_write" ON public.business_hours;
CREATE POLICY "business_hours_write" ON public.business_hours FOR ALL USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "holiday_calendar_select" ON public.holiday_calendar;
CREATE POLICY "holiday_calendar_select" ON public.holiday_calendar FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR org_id IS NULL
);
DROP POLICY IF EXISTS "holiday_calendar_write" ON public.holiday_calendar;
CREATE POLICY "holiday_calendar_write" ON public.holiday_calendar FOR ALL USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "sla_policies_select" ON public.sla_policies;
CREATE POLICY "sla_policies_select" ON public.sla_policies FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id() OR org_id IS NULL
);
DROP POLICY IF EXISTS "sla_policies_write" ON public.sla_policies;
CREATE POLICY "sla_policies_write" ON public.sla_policies FOR ALL USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "escalation_rules_select" ON public.escalation_rules;
CREATE POLICY "escalation_rules_select" ON public.escalation_rules FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.sla_policies sp WHERE sp.id = escalation_rules.sla_policy_id AND (sp.org_id = public.fn_jwt_org_id() OR sp.vendor_id = public.fn_jwt_vendor_id() OR sp.org_id IS NULL))
);
DROP POLICY IF EXISTS "escalation_rules_write" ON public.escalation_rules;
CREATE POLICY "escalation_rules_write" ON public.escalation_rules FOR ALL USING (public.fn_is_platform_admin() OR public.fn_jwt_role() = 'org_admin');

DROP POLICY IF EXISTS "priority_matrix_select" ON public.priority_matrix;
CREATE POLICY "priority_matrix_select" ON public.priority_matrix FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "priority_matrix_write" ON public.priority_matrix;
CREATE POLICY "priority_matrix_write" ON public.priority_matrix FOR ALL USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "asset_sla_map_select" ON public.asset_category_sla_mapping;
CREATE POLICY "asset_sla_map_select" ON public.asset_category_sla_mapping FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR org_id IS NULL
);
DROP POLICY IF EXISTS "asset_sla_map_write" ON public.asset_category_sla_mapping;
CREATE POLICY "asset_sla_map_write" ON public.asset_category_sla_mapping FOR ALL USING (public.fn_is_platform_admin() OR public.fn_jwt_role() = 'org_admin');
