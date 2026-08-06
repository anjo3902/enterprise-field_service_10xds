-- =============================================================================
-- SEED 02: Organization & Core Tenant
-- Enterprise: NexGen Facilities Management
-- Purpose:    Create the single enterprise organization + admin user profile
-- Idempotent: ON CONFLICT DO NOTHING / DO UPDATE
-- =============================================================================

BEGIN;

-- =============================================================================
-- ORGANIZATION: NexGen Facilities Management
-- A mid-to-large enterprise with 5 campuses across one city
-- =============================================================================
INSERT INTO public.organizations (
  id, name, industry, description, plan, status,
  admin_name, admin_email, admin_phone,
  region, city, country,
  license_seats_users, license_seats_vendors, license_seats_technicians,
  subscription_renewal, ticket_count, asset_count, sla_rate,
  last_activity_at, created_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'NexGen Facilities Management',
  'Integrated Facilities Management',
  'A leading provider of comprehensive facility management services across commercial, industrial, and healthcare properties. Managing 5 campuses with 300+ critical assets.',
  'enterprise',
  'active',
  'Arjun Mehta',
  'admin@nexgenfm.com',
  '+971-50-100-2001',
  'Middle East',
  'Dubai',
  'UAE',
  200,  -- users
  25,   -- vendors
  150,  -- technicians
  '2027-07-16',
  500,  -- ticket_count (will be populated)
  300,  -- asset_count (will be populated)
  91.2, -- sla_rate
  now(),
  now() - INTERVAL '18 months'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SITES (5 campuses across Dubai)
-- =============================================================================
INSERT INTO public.sites (id, org_id, site_code, name, description, address_line_1, address_line_2, city, state_province, country, postal_code, timezone, latitude, longitude, status, created_at) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'DXB-HQ',  'NexGen HQ Campus',          'Main headquarters with corporate towers and data center', 'Sheikh Zayed Road, Business Bay',  'Tower 1, Block A', 'Dubai', 'Dubai', 'UAE', '00000', 'Asia/Dubai', 25.1972, 55.2744, 'active', now() - INTERVAL '18 months'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'DXB-TEC', 'Tech Park Campus',          'Technology hub with R&D labs and server infrastructure',  'Dubai Internet City',              'Block 9',          'Dubai', 'Dubai', 'UAE', '00000', 'Asia/Dubai', 25.0975, 55.1601, 'active', now() - INTERVAL '18 months'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'DXB-MED', 'Medical Sciences Center',   'Private hospital and medical research facility',          'Al Barsha Health District',        'Block B',          'Dubai', 'Dubai', 'UAE', '00000', 'Asia/Dubai', 25.1153, 55.1996, 'active', now() - INTERVAL '18 months'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'DXB-MFG', 'Manufacturing & Logistics', 'Warehouse complex with manufacturing and cold storage',    'Jebel Ali Free Zone',             'Zone A, Gate 3',   'Dubai', 'Dubai', 'UAE', '00000', 'Asia/Dubai', 24.9857, 55.0599, 'active', now() - INTERVAL '15 months'),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'DXB-RET', 'Retail & Commercial Plaza', 'Mixed-use retail, office, and hospitality complex',        'Dubai Mall Vicinity, Downtown',    'Block D',          'Dubai', 'Dubai', 'UAE', '00000', 'Asia/Dubai', 25.1972, 55.2796, 'active', now() - INTERVAL '12 months')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BUILDINGS (5 per site = 25 total, using subset for clarity)
-- =============================================================================
INSERT INTO public.buildings (id, site_id, org_id, building_code, name, description, floors_count, year_built, gross_area_sqm, status, created_at) VALUES
  -- HQ Campus (3 buildings)
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'HQ-T1', 'HQ Tower 1 — Corporate',       'Main corporate tower with executive offices and board room',        35, 2015, 42000.0, 'active', now()),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'HQ-T2', 'HQ Tower 2 — Operations',      'Operations center, NOC, and FM command center',                    28, 2016, 33600.0, 'active', now()),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'HQ-DC', 'HQ Data Center',               'Tier III data center with UPS, CRAC units, and backup generators', 5,  2017, 8000.0,  'active', now()),
  -- Tech Park (2 buildings)
  ('cccccccc-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'TEC-A', 'Tech Park Block A',            'Software development and innovation labs',                          12, 2018, 18000.0, 'active', now()),
  ('cccccccc-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'TEC-B', 'Tech Park Block B',            'Hardware testing, prototyping, and clean room facilities',          8,  2019, 12000.0, 'active', now()),
  -- Medical (2 buildings)
  ('cccccccc-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'MED-H', 'Medical — Hospital Block',     'In-patient wards, ICU, and emergency department',                  10, 2014, 25000.0, 'active', now()),
  ('cccccccc-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'MED-R', 'Medical — Research Wing',      'Biomedical labs and clinical research center',                      6, 2016, 12000.0, 'active', now()),
  -- Manufacturing (2 buildings)
  ('cccccccc-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'MFG-W', 'Manufacturing Warehouse',      'Cold storage and manufacturing floor',                              3, 2019, 40000.0, 'active', now()),
  ('cccccccc-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'MFG-L', 'Logistics Control Tower',      'Dispatch management and logistics control',                          4, 2020, 5000.0,  'active', now()),
  -- Retail (2 buildings)
  ('cccccccc-0000-0000-0000-000000000010', 'bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'RET-M', 'Retail Mall Block',            'Multi-level retail space with food court and anchor stores',        5,  2020, 55000.0, 'active', now()),
  ('cccccccc-0000-0000-0000-000000000011', 'bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'RET-H', 'Retail — Hotel Tower',         '5-star hotel and serviced apartments',                             25, 2021, 32000.0, 'active', now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FLOORS (sample for key buildings)
-- =============================================================================
INSERT INTO public.floors (id, building_id, org_id, floor_number, floor_code, name, description, area_sqm, status, created_at) VALUES
  -- HQ Tower 1
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 0,  'HQT1-B1', 'Basement — Parking & Utilities', 'Parking, MV room, and main utility plant',                    5000.0, 'active', now()),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1,  'HQT1-G',  'Ground Floor — Lobby',           'Main lobby, reception, and security',                         1200.0, 'active', now()),
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 5,  'HQT1-5',  '5th Floor — FM Operations',      'FM NOC, helpdesk, and dispatch center',                       1200.0, 'active', now()),
  ('dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 35, 'HQT1-R',  'Rooftop — Mechanical Plant',     'Chiller plant, cooling towers, and AHUs',                     1200.0, 'active', now()),
  -- Data Center
  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 1,  'DC-G',    'Ground Floor — Server Hall A',   'Primary server hall with hot/cold aisle containment',         1600.0, 'active', now()),
  ('dddddddd-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 2,  'DC-2',    'Floor 2 — Power & Cooling',      'UPS room, CRAC units, and power distribution',                1600.0, 'active', now()),
  -- Medical Hospital
  ('dddddddd-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 1,  'MED-G',   'Ground — A&E / Emergency',       'Accident & emergency department',                             2500.0, 'active', now()),
  ('dddddddd-0000-0000-0000-000000000008', 'cccccccc-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 3,  'MED-3',   'Floor 3 — ICU',                  'Intensive care unit with critical life-support systems',       2500.0, 'active', now()),
  -- Manufacturing Warehouse
  ('dddddddd-0000-0000-0000-000000000009', 'cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 1,  'MFG-1',   'Floor 1 — Cold Storage',         'Refrigerated cold storage chambers at -20°C to +4°C',        13000.0, 'active', now()),
  ('dddddddd-0000-0000-0000-000000000010', 'cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 2,  'MFG-2',   'Floor 2 — Production Line',      'Automated production line with conveyor systems',             13000.0, 'active', now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ROOMS (representative sample)
-- =============================================================================
INSERT INTO public.rooms (id, floor_id, building_id, org_id, room_code, name, room_type, area_sqm, status, created_at) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'HQT1-B1-MV',  'MV Switchroom',          'electrical_room',  80.0,   'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'HQT1-B1-CH',  'Chiller Plant',          'mechanical_room',  400.0,  'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'HQT1-R-AHU',  'Rooftop AHU Area',       'mechanical_room',  600.0,  'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'DC-G-SH1',    'Server Hall A',          'server_room',      800.0,  'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000005', 'dddddddd-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'DC-2-UPS',    'UPS Room',               'electrical_room',  200.0,  'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000008', 'cccccccc-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'MED-3-ICU',   'ICU Ward A',             'medical_room',     300.0,  'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000007', 'dddddddd-0000-0000-0000-000000000009', 'cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 'MFG-1-CS1',   'Cold Storage Chamber 1', 'storage_room',     3000.0, 'active', now()),
  ('eeeeeeee-0000-0000-0000-000000000008', 'dddddddd-0000-0000-0000-000000000009', 'cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 'MFG-1-CS2',   'Cold Storage Chamber 2', 'storage_room',     3000.0, 'active', now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BUSINESS UNITS
-- =============================================================================
INSERT INTO public.business_units (id, org_id, name, code, description, is_active, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corporate Operations',      'CORP-OPS',  'Executive and corporate support functions',         true, now()),
  ('f0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Technology Division',       'TECH-DIV',  'IT infrastructure and digital transformation',      true, now()),
  ('f0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Healthcare Operations',     'HLTH-OPS',  'Medical and clinical facilities management',        true, now()),
  ('f0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Manufacturing & Logistics', 'MFG-LOG',   'Production, warehousing and supply chain',          true, now()),
  ('f0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Commercial Properties',     'COMM-PROP', 'Retail, hospitality, and commercial property',     true, now()),
  ('f0000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'Facility Management',       'FM-DEPT',   'Central FM operations and vendor management',       true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEPARTMENTS
-- =============================================================================
INSERT INTO public.departments (id, org_id, business_unit_id, name, code, description, is_active, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Executive Management',    'EXEC',     'C-suite and senior management',                        true, now()),
  ('a1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Finance & Accounting',    'FIN',      'Financial management and accounting',                   true, now()),
  ('a1000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'IT Infrastructure',       'IT-INF',   'Data centers, networking, and servers',                true, now()),
  ('a1000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'Clinical Engineering',    'CLIN-ENG', 'Medical equipment management',                         true, now()),
  ('a1000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'Production Engineering',  'PROD-ENG', 'Manufacturing equipment and process engineering',       true, now()),
  ('a1000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000006', 'FM Operations',           'FM-OPS',   'Central FM operations and helpdesk',                   true, now()),
  ('a1000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000006', 'Vendor Management',       'VEND-MGT', 'Vendor contracts, SLAs, and performance',               true, now()),
  ('a1000000-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 'Retail Operations',       'RET-OPS',  'Retail property management and tenant relations',       true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- COST CENTERS
-- =============================================================================
INSERT INTO public.cost_centers (id, org_id, department_id, code, name, budget_annual, currency, is_active, created_at) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'CC-FM-OPS',    'FM Operations Budget',    2500000.00, 'USD', true, now()),
  ('a2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'CC-IT-INF',    'IT Infrastructure',       1800000.00, 'USD', true, now()),
  ('a2000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'CC-CLIN-ENG',  'Clinical Engineering',    900000.00,  'USD', true, now()),
  ('a2000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'CC-PROD-ENG',  'Production Engineering',  1200000.00, 'USD', true, now()),
  ('a2000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', 'CC-VEND-MGT',  'Vendor Management',       750000.00,  'USD', true, now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
