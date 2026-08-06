-- =============================================================================
-- SEED 08: AMC Contracts & PM Plans
-- Enterprise: NexGen Facilities Management
-- Purpose:    Populate Maintenance Contracts and Preventive Maintenance Schedules
-- Idempotent: ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- AMC CONTRACTS (Annual Maintenance Contracts)
-- =============================================================================
INSERT INTO public.amc_contracts (
  id, contract_number, org_id, vendor_id, coverage_type,
  start_date, end_date, contract_value, currency, visit_frequency,
  response_sla_policy_id, resolution_sla_policy_id, status, created_at
) VALUES
  -- 1. Comprehensive HVAC AMC with Apex Climate Control
  (
    '77777777-0000-0000-0000-000000000001', 'AMC-2026-HVAC-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
    'Comprehensive',
    '2026-01-01', '2027-12-31', 450000.00, 'USD', 'Monthly',
    '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
    'active', now() - INTERVAL '6 months'
  ),

  -- 2. Non-Comprehensive Electrical AMC with PowerSafe
  (
    '77777777-0000-0000-0000-000000000002', 'AMC-2026-ELEC-02',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
    'Non-Comprehensive (Labor + Consumables)',
    '2025-07-01', '2026-12-31', 280000.00, 'USD', 'Quarterly',
    '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
    'active', now() - INTERVAL '12 months'
  ),

  -- 3. Elevator Maintenance with LiftTech
  (
    '77777777-0000-0000-0000-000000000003', 'AMC-2026-ELEV-03',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005',
    'Comprehensive',
    '2026-04-01', '2028-03-31', 320000.00, 'USD', 'Monthly',
    '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
    'active', now() - INTERVAL '3 months'
  ),

  -- 4. Fire Safety AMC with FireGuard
  (
    '77777777-0000-0000-0000-000000000004', 'AMC-2026-FIRE-04',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004',
    'Comprehensive (Spares Included)',
    '2026-01-01', '2028-12-31', 150000.00, 'USD', 'Bi-Annual',
    '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
    'active', now() - INTERVAL '6 months'
  )
ON CONFLICT (contract_number) DO NOTHING;

-- =============================================================================
-- AMC COVERED ASSETS
-- Linking specific assets to the contracts
-- =============================================================================
INSERT INTO public.amc_covered_assets (
  amc_contract_id, asset_id, coverage_level, included_services, exclusions, created_at
) VALUES
  -- HVAC Contract (Apex) -> Chillers, Cooling Towers, AHUs, VRF, CRAC
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-001'), 'Platinum', ARRAY['Monthly PM', 'Breakdown Repair', 'Compressor Overhaul'], ARRAY['Refrigerant Gas Replenishment'], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-002'), 'Platinum', ARRAY['Monthly PM', 'Breakdown Repair', 'Compressor Overhaul'], ARRAY['Refrigerant Gas Replenishment'], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-003'), 'Gold', ARRAY['Quarterly PM', 'Breakdown Repair'], ARRAY['Fill Packing Replacement'], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-004'), 'Gold', ARRAY['Quarterly PM', 'Breakdown Repair'], ARRAY['Fill Packing Replacement'], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-008'), 'Platinum', ARRAY['Monthly PM', 'Breakdown Repair'], ARRAY[]::TEXT[], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-DC-001'), 'Platinum 24/7', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Compressor Replacements'], ARRAY[]::TEXT[], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-DC-002'), 'Platinum 24/7', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Compressor Replacements'], ARRAY[]::TEXT[], now()),
  ('77777777-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-MED-001'), 'Platinum 24/7', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Compressor Replacements'], ARRAY[]::TEXT[], now()),
  
  -- Electrical Contract (PowerSafe) -> Switchgear, Transformers, Generators, UPS
  ('77777777-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-009'), 'Gold', ARRAY['Annual Thermal Imaging', 'Quarterly Inspection'], ARRAY['Switchgear Parts'], now()),
  ('77777777-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-010'), 'Gold', ARRAY['Annual Oil Analysis', 'Quarterly Inspection'], ARRAY['Transformer Core Repairs'], now()),
  ('77777777-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-011'), 'Platinum', ARRAY['Monthly Load Test', 'Bi-Annual Oil/Filter Change'], ARRAY[]::TEXT[], now()),
  ('77777777-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-012'), 'Platinum', ARRAY['Quarterly PM', 'Battery Health Check'], ARRAY['Battery Replacement'], now()),
  ('77777777-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-DC-003'), 'Platinum', ARRAY['Quarterly PM', 'Battery Health Check'], ARRAY['Battery Replacement'], now()),
  ('77777777-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-DC-004'), 'Platinum', ARRAY['Monthly Load Test', 'Bi-Annual Oil/Filter Change'], ARRAY[]::TEXT[], now()),

  -- Elevator Contract (LiftTech)
  ('77777777-0000-0000-0000-000000000003', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-014'), 'Comprehensive', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Parts Replacement'], ARRAY['Cabin Interior Finishes'], now()),
  ('77777777-0000-0000-0000-000000000003', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-015'), 'Comprehensive', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Parts Replacement'], ARRAY['Cabin Interior Finishes'], now()),
  ('77777777-0000-0000-0000-000000000003', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-016'), 'Comprehensive', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Parts Replacement'], ARRAY['Cabin Interior Finishes'], now()),
  ('77777777-0000-0000-0000-000000000003', (SELECT id FROM public.assets WHERE asset_id = 'AST-RET-001'), 'Comprehensive', ARRAY['Monthly PM', '24/7 Breakdown Response', 'Parts Replacement', 'Step Chain Lubrication'], ARRAY['Handrail Damages'], now()),

  -- Fire Safety Contract (FireGuard)
  ('77777777-0000-0000-0000-000000000004', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-017'), 'Comprehensive', ARRAY['Bi-Annual PM', 'Annual Authority Certification'], ARRAY[]::TEXT[], now()),
  ('77777777-0000-0000-0000-000000000004', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-018'), 'Comprehensive', ARRAY['Bi-Annual PM', 'Cylinder Weighing'], ARRAY['Cylinder Refilling After Discharge'], now()),
  ('77777777-0000-0000-0000-000000000004', (SELECT id FROM public.assets WHERE asset_id = 'AST-MFG-003'), 'Comprehensive', ARRAY['Bi-Annual PM', 'Flow Switch Testing'], ARRAY[]::TEXT[], now())
ON CONFLICT (amc_contract_id, asset_id) DO NOTHING;

-- =============================================================================
-- PM PLANS (Preventive Maintenance Templates)
-- =============================================================================
INSERT INTO public.pm_plans (
  id, plan_number, org_id, vendor_id, asset_id,
  service_category_id, service_type_id, frequency,
  start_date, next_due_date, estimated_duration_mins, priority, status, created_at
) VALUES
  -- HVAC PM Plans
  (
    '88888888-0000-0000-0000-000000000001', 'PM-HVAC-CH-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-001'),
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'monthly',
    '2026-01-01', '2026-08-01', 180, 'High', 'active', now() - INTERVAL '6 months'
  ),
  (
    '88888888-0000-0000-0000-000000000002', 'PM-HVAC-CRAC-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-DC-002'),
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'monthly',
    '2026-01-01', '2026-08-10', 120, 'Critical', 'active', now() - INTERVAL '6 months'
  ),
  (
    '88888888-0000-0000-0000-000000000003', 'PM-HVAC-AHU-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-005'),
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'quarterly',
    '2026-01-01', '2026-10-01', 90, 'Medium', 'active', now() - INTERVAL '6 months'
  ),

  -- Electrical PM Plans
  (
    '88888888-0000-0000-0000-000000000004', 'PM-ELEC-GEN-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-011'),
    '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007', 'monthly',
    '2026-01-01', '2026-08-15', 60, 'High', 'active', now() - INTERVAL '6 months'
  ),
  (
    '88888888-0000-0000-0000-000000000005', 'PM-ELEC-UPS-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', (SELECT id FROM public.assets WHERE asset_id = 'AST-DC-003'),
    '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000008', 'quarterly',
    '2026-01-01', '2026-09-15', 120, 'Critical', 'active', now() - INTERVAL '6 months'
  ),

  -- Elevator PM Plans
  (
    '88888888-0000-0000-0000-000000000006', 'PM-ELEV-HQ-01',
    'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', (SELECT id FROM public.assets WHERE asset_id = 'AST-HQ-014'),
    '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000019', 'monthly',
    '2026-01-01', '2026-08-15', 180, 'High', 'active', now() - INTERVAL '6 months'
  )
ON CONFLICT (plan_number) DO NOTHING;

COMMIT;
