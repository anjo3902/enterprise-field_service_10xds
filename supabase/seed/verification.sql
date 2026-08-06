-- =============================================================================
-- Enterprise Seed Data Verification Script
-- Run this script to verify that the seed data was inserted correctly.
-- =============================================================================

-- 1. Check References & Enums
SELECT 
  (SELECT count(*) FROM public.service_categories) as service_category_count,
  (SELECT count(*) FROM public.service_types) as service_type_count,
  (SELECT count(*) FROM public.sla_policies) as sla_policy_count,
  (SELECT count(*) FROM public.certifications) as certification_count;

-- 2. Check Org & Hierarchy
SELECT 
  (SELECT count(*) FROM public.organizations) as org_count,
  (SELECT count(*) FROM public.sites) as site_count,
  (SELECT count(*) FROM public.buildings) as building_count,
  (SELECT count(*) FROM public.floors) as floor_count,
  (SELECT count(*) FROM public.rooms) as room_count,
  (SELECT count(*) FROM public.business_units) as bu_count,
  (SELECT count(*) FROM public.departments) as department_count;

-- 3. Check Vendors & Technicians
SELECT 
  (SELECT count(*) FROM public.vendors) as vendor_count,
  (SELECT count(*) FROM public.technicians) as technician_count;

-- 4. Check User Profiles
SELECT role, count(*) 
FROM public.profiles 
GROUP BY role;

-- 5. Check Assets & Inventory
SELECT 
  (SELECT count(*) FROM public.assets) as asset_count,
  (SELECT count(*) FROM public.warehouses) as warehouse_count,
  (SELECT count(*) FROM public.inventory_items) as inventory_item_count,
  (SELECT count(*) FROM public.warehouse_stock) as stock_record_count;

-- 6. Check Contracts & PM
SELECT
  (SELECT count(*) FROM public.amc_contracts) as amc_contract_count,
  (SELECT count(*) FROM public.amc_covered_assets) as covered_asset_count,
  (SELECT count(*) FROM public.pm_plans) as pm_plan_count;

-- 7. Check Tickets & Work Orders
SELECT 
  (SELECT count(*) FROM public.tickets) as ticket_count,
  (SELECT count(*) FROM public.work_orders) as work_order_count;

-- 8. Identify active high-priority issues
SELECT t.ticket_number, t.title, t.priority, t.status, w.status as wo_status
FROM public.tickets t
LEFT JOIN public.work_orders w ON w.ticket_id = t.id
WHERE t.status != 'closed' AND t.priority IN ('High', 'Critical')
ORDER BY t.created_at DESC;
