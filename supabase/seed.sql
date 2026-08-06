-- =============================================================================
-- SEED 01: Reference Data
-- Enterprise: NexGen Facilities Management
-- Purpose:    Populate all reference/lookup tables first (no FK dependencies)
-- Idempotent: All inserts use ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- SERVICE CATEGORIES
-- =============================================================================
INSERT INTO public.service_categories (id, name, domain, description, is_active, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'HVAC Maintenance',        'HVAC',             'Heating, ventilation, and air conditioning maintenance services',      true, now()),
  ('10000000-0000-0000-0000-000000000002', 'Electrical Services',     'ELECTRICAL',       'Electrical installation, repair, and maintenance services',            true, now()),
  ('10000000-0000-0000-0000-000000000003', 'Plumbing Services',       'PLUMBING',         'Water supply, drainage, and plumbing maintenance',                    true, now()),
  ('10000000-0000-0000-0000-000000000004', 'Fire Safety Systems',     'FIRE_SAFETY',      'Fire detection, suppression, and evacuation system maintenance',       true, now()),
  ('10000000-0000-0000-0000-000000000005', 'Mechanical Systems',      'MECHANICAL',       'Pumps, compressors, and mechanical equipment servicing',               true, now()),
  ('10000000-0000-0000-0000-000000000006', 'IT Infrastructure',       'IT_SYSTEMS',       'Servers, networking, and IT infrastructure support',                  true, now()),
  ('10000000-0000-0000-0000-000000000007', 'Security Systems',        'SECURITY_SYSTEMS', 'CCTV, access control, and alarm system maintenance',                  true, now()),
  ('10000000-0000-0000-0000-000000000008', 'Civil & Structural Works','CIVIL_WORKS',       'Building structure, facade, and civil maintenance',                   true, now()),
  ('10000000-0000-0000-0000-000000000009', 'Elevator & Escalator',    'ELEVATORS',        'Lift, escalator, and dumbwaiter maintenance',                         true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SERVICE TYPES (under each category)
-- =============================================================================
INSERT INTO public.service_types (id, service_category_id, name, description, estimated_duration_mins, is_active, created_at) VALUES
  -- HVAC
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Preventive Maintenance',     'Scheduled filter cleaning, coil inspection, refrigerant check',      180, true, now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Corrective Repair',          'Diagnosis and repair of HVAC faults and breakdowns',                 240, true, now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Refrigerant Top-Up',         'Refrigerant gas recharge and leak testing',                          120, true, now()),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Chiller Service',            'Full chiller servicing including tube cleaning and vibration check',  480, true, now()),
  -- Electrical
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Electrical Inspection',      'Thermal imaging, load testing, switchgear inspection',               120, true, now()),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Circuit Repair',             'Circuit breaker replacement, wiring fault rectification',            180, true, now()),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Generator Maintenance',      'Diesel generator load testing and oil change',                       360, true, now()),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'UPS Maintenance',            'UPS battery health check, load test and calibration',                180, true, now()),
  -- Plumbing
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'Leak Detection & Repair',    'Water leak detection using acoustic sensors and repair',              120, true, now()),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', 'Drain Cleaning',             'High-pressure jetting and drain unblocking',                         90,  true, now()),
  -- Fire Safety
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000004', 'Fire Alarm Testing',         'Annual fire alarm panel inspection and detector testing',             240, true, now()),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000004', 'Sprinkler Inspection',       'Fire sprinkler head replacement and pressure testing',               180, true, now()),
  -- Mechanical
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000005', 'Pump Maintenance',           'Centrifugal pump bearing replacement and alignment check',            240, true, now()),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', 'Compressor Overhaul',        'Air compressor full overhaul including valve and piston service',     480, true, now()),
  -- IT
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000006', 'Network Infrastructure',     'Switch, router, and cabling maintenance and upgrade',                180, true, now()),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000006', 'Server Room Maintenance',    'Server hardware, cooling, and power maintenance',                    240, true, now()),
  -- Security
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000007', 'CCTV Maintenance',           'Camera cleaning, alignment, and recording system check',             120, true, now()),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000007', 'Access Control Service',     'Card reader, biometric, and door controller maintenance',            180, true, now()),
  -- Elevators
  ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000009', 'Elevator PM Service',        'Monthly lift inspection, lubrication, and safety checks',            240, true, now()),
  ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000009', 'Emergency Breakdown',        'Emergency lift rescue and immediate breakdown repair',                60,  true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SLA POLICIES
-- =============================================================================
INSERT INTO public.sla_policies (id, org_id, name, description, priority, response_hours, resolution_hours, business_hours_only, is_default, is_active, created_at) VALUES
  -- Critical SLA
  ('30000000-0000-0000-0000-000000000001', NULL, 'Critical SLA — 24/7', 'Emergency response for business-critical failures', 'Critical', 1,  4,  false, false, true, now()),
  -- High SLA
  ('30000000-0000-0000-0000-000000000002', NULL, 'High Priority SLA',   'High priority faults requiring same-day response',   'High',     4,  8,  true,  false, true, now()),
  -- Medium SLA
  ('30000000-0000-0000-0000-000000000003', NULL, 'Standard SLA',        'Standard facility management service level',         'Medium',   8,  24, true,  true,  true, now()),
  -- Low SLA
  ('30000000-0000-0000-0000-000000000004', NULL, 'Low Priority SLA',    'Planned maintenance and minor issues',               'Low',      24, 72, true,  false, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CERTIFICATIONS
-- =============================================================================
INSERT INTO public.certifications (id, name, domain, issuing_authority, validity_years, description, is_active, created_at) VALUES
  ('40000000-0000-0000-0000-000000000001', 'HVAC Technician Level 3',  'HVAC',             'ASHRAE',             3, 'Advanced HVAC installation and maintenance certification',        true, now()),
  ('40000000-0000-0000-0000-000000000002', 'Refrigeration Engineer',   'HVAC',             'RSES',               3, 'Commercial refrigeration systems engineering certificate',         true, now()),
  ('40000000-0000-0000-0000-000000000003', 'Electrical Safety — BS7671','ELECTRICAL',      'City & Guilds',      5, 'UK wiring regulations 18th edition certification',                true, now()),
  ('40000000-0000-0000-0000-000000000004', 'High Voltage Operations',  'ELECTRICAL',       'BEI',                2, 'Safe operation of HV electrical equipment',                       true, now()),
  ('40000000-0000-0000-0000-000000000005', 'Fire Systems Inspector',   'FIRE_SAFETY',      'FIA',                3, 'Fire alarm and suppression system inspection certification',       true, now()),
  ('40000000-0000-0000-0000-000000000006', 'Elevator Mechanic License','ELEVATORS',        'MEW',                2, 'Licensed elevator mechanic for passenger and freight lifts',       true, now()),
  ('40000000-0000-0000-0000-000000000007', 'Plumbing NVQ Level 3',     'PLUMBING',         'CITB',               5, 'Advanced plumbing and pipefitting qualification',                 true, now()),
  ('40000000-0000-0000-0000-000000000008', 'CCTV Installation City & Guilds', 'SECURITY_SYSTEMS', 'City & Guilds', 3, 'Professional CCTV systems installation and maintenance', true, now()),
  ('40000000-0000-0000-0000-000000000009', 'ISO 45001 Health & Safety','MECHANICAL',       'BSI',                3, 'Occupational health and safety management certification',          true, now()),
  ('40000000-0000-0000-0000-000000000010', 'CompTIA Network+',         'IT_SYSTEMS',       'CompTIA',            3, 'Network infrastructure installation and support',                 true, now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
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
-- =============================================================================
-- SEED 03: Vendors & Technicians
-- Enterprise: NexGen Facilities Management
-- Purpose:    Create 8 vendors across all service domains + 30 technicians
-- NOTE:       profiles are created SEPARATELY in seed_04_profiles.sql
--             This script inserts vendor/technician rows with NULL user_id
--             (to be linked after auth users are created)
-- Idempotent: ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- VENDORS (8 specialized service providers)
-- =============================================================================
INSERT INTO public.vendors (
  id, name, trade_domains, service_regions, status,
  manager_name, manager_email, manager_phone,
  rating, sla_compliance, sla_target, technician_count,
  license_number, license_expiry,
  certifications, created_at
) VALUES

  -- V1: Apex Climate Control (HVAC specialist)
  (
    '11111111-0000-0000-0000-000000000001',
    'Apex Climate Control LLC',
    ARRAY['HVAC']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi', 'Sharjah'],
    'active',
    'Samer Al-Rashidi', 'samer@apexclimate.ae', '+971-50-201-0011',
    4.7, 94.2, 90.0, 8,
    'MOHRE-2024-HVAC-0041', '2026-12-31',
    '[{"name":"ISO 9001:2015","expiry":"2027-01-01","authority":"BSI","doc_url":"storage/vendors/v1/iso9001.pdf"},{"name":"ASHRAE Member","expiry":"2026-12-31","authority":"ASHRAE","doc_url":"storage/vendors/v1/ashrae.pdf"}]'::jsonb,
    now() - INTERVAL '24 months'
  ),

  -- V2: PowerSafe Electrical (Electrical specialist)
  (
    '11111111-0000-0000-0000-000000000002',
    'PowerSafe Electrical Services',
    ARRAY['ELECTRICAL']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi'],
    'active',
    'Ravi Kumar', 'ravi@powersafe.ae', '+971-50-202-0022',
    4.5, 91.8, 90.0, 7,
    'MOHRE-2024-ELEC-0089', '2026-06-30',
    '[{"name":"BS7671 18th Edition","expiry":"2027-06-01","authority":"City & Guilds","doc_url":"storage/vendors/v2/bs7671.pdf"},{"name":"ISO 45001","expiry":"2026-08-01","authority":"BSI","doc_url":"storage/vendors/v2/iso45001.pdf"}]'::jsonb,
    now() - INTERVAL '20 months'
  ),

  -- V3: AquaFlow Plumbing (Plumbing specialist)
  (
    '11111111-0000-0000-0000-000000000003',
    'AquaFlow Plumbing & Drainage',
    ARRAY['PLUMBING']::public.service_domain[],
    ARRAY['Dubai', 'Sharjah', 'Ajman'],
    'active',
    'Ahmed Al-Mahmoud', 'ahmed@aquaflow.ae', '+971-50-203-0033',
    4.3, 88.5, 85.0, 5,
    'MOHRE-2024-PLMB-0056', '2027-03-31',
    '[{"name":"CIPHE Member","expiry":"2026-12-31","authority":"CIPHE","doc_url":"storage/vendors/v3/ciphe.pdf"}]'::jsonb,
    now() - INTERVAL '18 months'
  ),

  -- V4: FireGuard Systems (Fire Safety)
  (
    '11111111-0000-0000-0000-000000000004',
    'FireGuard Safety Systems',
    ARRAY['FIRE_SAFETY']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    'active',
    'James Okonkwo', 'james@fireguard.ae', '+971-50-204-0044',
    4.8, 96.1, 92.0, 6,
    'MOHRE-2024-FIRE-0023', '2027-06-30',
    '[{"name":"FIA Approved","expiry":"2027-01-01","authority":"FIA","doc_url":"storage/vendors/v4/fia.pdf"},{"name":"NFPA Member","expiry":"2026-12-31","authority":"NFPA","doc_url":"storage/vendors/v4/nfpa.pdf"}]'::jsonb,
    now() - INTERVAL '22 months'
  ),

  -- V5: LiftTech Engineers (Elevators)
  (
    '11111111-0000-0000-0000-000000000005',
    'LiftTech Engineering Services',
    ARRAY['ELEVATORS', 'MECHANICAL']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi'],
    'active',
    'Maria Santos', 'maria@lifttech.ae', '+971-50-205-0055',
    4.6, 93.4, 90.0, 5,
    'MOHRE-2024-LIFT-0012', '2026-09-30',
    '[{"name":"MEW Certified Lift Engineers","expiry":"2026-09-01","authority":"MEW","doc_url":"storage/vendors/v5/mew.pdf"}]'::jsonb,
    now() - INTERVAL '16 months'
  ),

  -- V6: NetSec IT Services (IT Systems)
  (
    '11111111-0000-0000-0000-000000000006',
    'NetSec IT Infrastructure Services',
    ARRAY['IT_SYSTEMS', 'SECURITY_SYSTEMS']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi', 'Sharjah'],
    'active',
    'Priya Krishnamurthy', 'priya@netsec.ae', '+971-50-206-0066',
    4.4, 89.7, 88.0, 6,
    'MOHRE-2024-IT-0067', '2027-01-31',
    '[{"name":"Cisco Premier Partner","expiry":"2027-01-01","authority":"Cisco","doc_url":"storage/vendors/v6/cisco.pdf"},{"name":"CompTIA MSP","expiry":"2026-12-31","authority":"CompTIA","doc_url":"storage/vendors/v6/comptia.pdf"}]'::jsonb,
    now() - INTERVAL '14 months'
  ),

  -- V7: MechMaster Engineering (Mechanical + Civil)
  (
    '11111111-0000-0000-0000-000000000007',
    'MechMaster Engineering & Civil Works',
    ARRAY['MECHANICAL', 'CIVIL_WORKS']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi', 'Ajman'],
    'active',
    'Daniel Adeyemi', 'daniel@mechmaster.ae', '+971-50-207-0077',
    4.2, 86.3, 85.0, 7,
    'MOHRE-2024-MECH-0034', '2026-08-31',
    '[{"name":"ISO 9001:2015","expiry":"2026-12-31","authority":"BSI","doc_url":"storage/vendors/v7/iso9001.pdf"}]'::jsonb,
    now() - INTERVAL '10 months'
  ),

  -- V8: MultiTech FM Solutions (Multi-domain)
  (
    '11111111-0000-0000-0000-000000000008',
    'MultiTech FM Solutions',
    ARRAY['HVAC','ELECTRICAL','PLUMBING','MECHANICAL']::public.service_domain[],
    ARRAY['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
    'active',
    'Tariq Al-Falasi', 'tariq@multitech.ae', '+971-50-208-0088',
    4.1, 83.6, 85.0, 12,
    'MOHRE-2024-FM-0098', '2026-11-30',
    '[{"name":"ISO 9001:2015","expiry":"2026-12-31","authority":"BSI","doc_url":"storage/vendors/v8/iso9001.pdf"},{"name":"LEED Green Associate","expiry":"2027-06-01","authority":"USGBC","doc_url":"storage/vendors/v8/leed.pdf"}]'::jsonb,
    now() - INTERVAL '8 months'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TECHNICIANS (30 field technicians across all 8 vendors)
-- NOTE: user_id is NULL — to be linked after auth signup flow
-- =============================================================================
INSERT INTO public.technicians (
  id, vendor_id, full_name, first_name, last_name, email, phone, employee_id,
  primary_domain, secondary_domains, skills, experience_level, years_experience,
  availability_state, active_job_count, jobs_completed,
  avg_resolution_hours, customer_rating, sla_compliance, first_time_fix_rate,
  working_hours_start, working_hours_end, working_days, status, created_at
) VALUES

  -- APEX CLIMATE CONTROL — 8 HVAC technicians
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Rahul Sharma',   'Rahul',   'Sharma',   'rahul.sharma@apexclimate.ae',   '+971-55-301-0001', 'EMP-AC-001',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['Chiller Systems','VRF/VRV','AHU Maintenance','Refrigerant Handling'],
   'senior_technician', 8, 'available', 1, 312, 3.2, 4.8, 96.1, 87.4, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '24 months'),

  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'Priya Nair',     'Priya',   'Nair',     'priya.nair@apexclimate.ae',     '+971-55-301-0002', 'EMP-AC-002',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['Split AC Systems','DOAS','Exhaust Systems'],
   'technician', 5, 'on_job', 1, 198, 4.1, 4.5, 91.2, 82.1, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '20 months'),

  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'Suresh Babu',    'Suresh',  'Babu',     'suresh.babu@apexclimate.ae',    '+971-55-301-0003', 'EMP-AC-003',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['Chiller Systems','Cooling Towers','CRAC Units'],
   'specialist', 12, 'available', 0, 487, 2.8, 4.9, 98.3, 91.0, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '24 months'),

  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   'Mohammed Al-Amri','Mohammed','Al-Amri', 'mohammed.alamri@apexclimate.ae','+971-55-301-0004', 'EMP-AC-004',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['FCU Maintenance','Duct Cleaning','IAQ Testing'],
   'technician', 3, 'available', 0, 156, 5.2, 4.2, 87.5, 79.3, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '12 months'),

  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   'Vijay Krishnan',  'Vijay', 'Krishnan', 'vijay.krishnan@apexclimate.ae', '+971-55-301-0005', 'EMP-AC-005',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['BMS Integration','Energy Optimization','Chiller Systems'],
   'field_engineer', 10, 'unavailable', 0, 398, 3.0, 4.7, 95.6, 89.2, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '22 months'),

  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001',
   'Anita Desai',     'Anita',  'Desai',   'anita.desai@apexclimate.ae',    '+971-55-301-0006', 'EMP-AC-006',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['Split AC Systems','VRF/VRV'],
   'junior_technician', 1, 'available', 0, 42, 6.8, 3.9, 78.4, 71.2, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '6 months'),

  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001',
   'Hassan Al-Jabri', 'Hassan', 'Al-Jabri','hassan.aljabri@apexclimate.ae', '+971-55-301-0007', 'EMP-AC-007',
   'HVAC', ARRAY['MECHANICAL']::public.service_domain[], ARRAY['AHU Maintenance','DOAS','Refrigerant Handling','Pumps'],
   'senior_technician', 7, 'on_job', 1, 267, 3.8, 4.6, 93.7, 85.4, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '18 months'),

  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001',
   'Ritu Sharma',     'Ritu',   'Sharma',  'ritu.sharma@apexclimate.ae',    '+971-55-301-0008', 'EMP-AC-008',
   'HVAC', ARRAY[]::public.service_domain[], ARRAY['Cooling Towers','Chiller Systems'],
   'technician', 4, 'break', 0, 178, 4.5, 4.3, 89.1, 81.7, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '14 months'),

  -- POWERSAFE ELECTRICAL — 7 Electrical technicians
  ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000002',
   'John David',      'John',   'David',   'john.david@powersafe.ae',       '+971-55-302-0009', 'EMP-PS-001',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['HV Switchgear','Transformer Maintenance','Earthing Systems'],
   'specialist', 15, 'available', 0, 521, 2.9, 4.9, 97.8, 93.2, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '36 months'),

  ('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000002',
   'Vikram Das',      'Vikram', 'Das',     'vikram.das@powersafe.ae',       '+971-55-302-0010', 'EMP-PS-002',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['UPS Systems','Battery Replacement','Power Distribution'],
   'senior_technician', 9, 'on_job', 1, 334, 3.4, 4.7, 94.6, 88.5, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '26 months'),

  ('22222222-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000002',
   'Faisal Al-Omari', 'Faisal', 'Al-Omari','faisal.alomari@powersafe.ae',  '+971-55-302-0011', 'EMP-PS-003',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['Generator Maintenance','Load Testing','Emergency Systems'],
   'technician', 6, 'available', 0, 231, 4.2, 4.4, 90.3, 83.6, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '20 months'),

  ('22222222-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000002',
   'Lena Popova',     'Lena',   'Popova',  'lena.popova@powersafe.ae',      '+971-55-302-0012', 'EMP-PS-004',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['LV Panel Maintenance','Circuit Breakers','Cable Testing'],
   'technician', 4, 'available', 0, 167, 5.1, 4.1, 86.4, 79.8, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '15 months'),

  ('22222222-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000002',
   'Arjun Reddy',     'Arjun',  'Reddy',   'arjun.reddy@powersafe.ae',      '+971-55-302-0013', 'EMP-PS-005',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['Thermal Imaging','Power Quality Analysis','BMS Electrical'],
   'field_engineer', 11, 'unavailable', 0, 412, 3.1, 4.8, 96.4, 90.1, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '28 months'),

  ('22222222-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000002',
   'Nadia Hassan',    'Nadia',  'Hassan',  'nadia.hassan@powersafe.ae',     '+971-55-302-0014', 'EMP-PS-006',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['Lighting Systems','Emergency Lighting','PV Solar'],
   'junior_technician', 2, 'available', 0, 78, 7.2, 3.8, 75.1, 68.9, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '8 months'),

  ('22222222-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000002',
   'Khalid Al-Sayed', 'Khalid', 'Al-Sayed','khalid.alsayed@powersafe.ae',  '+971-55-302-0015', 'EMP-PS-007',
   'ELECTRICAL', ARRAY[]::public.service_domain[], ARRAY['HV Switchgear','Transformer Maintenance','Power Distribution'],
   'senior_technician', 8, 'on_job', 1, 298, 3.7, 4.6, 93.2, 86.7, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '22 months'),

  -- AQUAFLOW PLUMBING — 5 Plumbing technicians
  ('22222222-0000-0000-0000-000000000016', '11111111-0000-0000-0000-000000000003',
   'Carlos Mendez',   'Carlos', 'Mendez',  'carlos.mendez@aquaflow.ae',     '+971-55-303-0016', 'EMP-AQ-001',
   'PLUMBING', ARRAY[]::public.service_domain[], ARRAY['Leak Detection','Drain Jetting','Pipe Repair'],
   'senior_technician', 7, 'available', 0, 234, 3.9, 4.5, 91.7, 84.2, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '18 months'),

  ('22222222-0000-0000-0000-000000000017', '11111111-0000-0000-0000-000000000003',
   'Amara Osei',      'Amara',  'Osei',    'amara.osei@aquaflow.ae',        '+971-55-303-0017', 'EMP-AQ-002',
   'PLUMBING', ARRAY[]::public.service_domain[], ARRAY['Water Treatment','Pump Maintenance','Tank Cleaning'],
   'technician', 5, 'on_job', 1, 187, 4.4, 4.2, 88.3, 80.6, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '14 months'),

  ('22222222-0000-0000-0000-000000000018', '11111111-0000-0000-0000-000000000003',
   'Deepak Joshi',    'Deepak', 'Joshi',   'deepak.joshi@aquaflow.ae',      '+971-55-303-0018', 'EMP-AQ-003',
   'PLUMBING', ARRAY[]::public.service_domain[], ARRAY['Backflow Prevention','Valve Replacement','Pressure Testing'],
   'technician', 3, 'available', 0, 142, 5.0, 4.0, 85.9, 77.4, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '10 months'),

  ('22222222-0000-0000-0000-000000000019', '11111111-0000-0000-0000-000000000003',
   'Yasmin Al-Nuri',  'Yasmin', 'Al-Nuri', 'yasmin.alnuri@aquaflow.ae',     '+971-55-303-0019', 'EMP-AQ-004',
   'PLUMBING', ARRAY[]::public.service_domain[], ARRAY['Sanitary Systems','Drainage Design'],
   'junior_technician', 1, 'available', 0, 56, 7.5, 3.7, 74.6, 67.1, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '5 months'),

  ('22222222-0000-0000-0000-000000000020', '11111111-0000-0000-0000-000000000003',
   'Samuel Achebe',   'Samuel', 'Achebe',  'samuel.achebe@aquaflow.ae',     '+971-55-303-0020', 'EMP-AQ-005',
   'PLUMBING', ARRAY[]::public.service_domain[], ARRAY['Leak Detection','CCTV Drain Survey','Pipe Bursting'],
   'senior_technician', 9, 'available', 0, 312, 3.6, 4.6, 92.4, 86.1, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '20 months'),

  -- FIREGUARD SAFETY SYSTEMS — 6 Fire Safety technicians
  ('22222222-0000-0000-0000-000000000021', '11111111-0000-0000-0000-000000000004',
   'Emeka Okonkwo',   'Emeka',  'Okonkwo', 'emeka.okonkwo@fireguard.ae',    '+971-55-304-0021', 'EMP-FG-001',
   'FIRE_SAFETY', ARRAY[]::public.service_domain[], ARRAY['Fire Alarm Systems','Suppression Systems','Evacuation'],
   'specialist', 13, 'available', 0, 456, 2.7, 4.9, 98.1, 92.7, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '30 months'),

  ('22222222-0000-0000-0000-000000000022', '11111111-0000-0000-0000-000000000004',
   'Liu Wei',         'Liu',    'Wei',     'liu.wei@fireguard.ae',          '+971-55-304-0022', 'EMP-FG-002',
   'FIRE_SAFETY', ARRAY[]::public.service_domain[], ARRAY['Sprinkler Systems','Suppression Systems'],
   'senior_technician', 7, 'on_job', 1, 267, 3.3, 4.7, 95.3, 88.9, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '22 months'),

  ('22222222-0000-0000-0000-000000000023', '11111111-0000-0000-0000-000000000004',
   'Kemi Adeyemi',    'Kemi',   'Adeyemi', 'kemi.adeyemi@fireguard.ae',     '+971-55-304-0023', 'EMP-FG-003',
   'FIRE_SAFETY', ARRAY[]::public.service_domain[], ARRAY['Fire Alarm Systems','BMS Fire Integration'],
   'technician', 5, 'available', 0, 198, 4.0, 4.4, 90.7, 83.5, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '16 months'),

  -- LIFTTECH ENGINEERS — 5 Elevator technicians
  ('22222222-0000-0000-0000-000000000024', '11111111-0000-0000-0000-000000000005',
   'Fernando Costa',  'Fernando','Costa',  'fernando.costa@lifttech.ae',    '+971-55-305-0024', 'EMP-LT-001',
   'ELEVATORS', ARRAY['MECHANICAL']::public.service_domain[], ARRAY['Passenger Lifts','Freight Elevators','Escalators'],
   'specialist', 16, 'available', 0, 534, 2.5, 4.9, 98.6, 94.3, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '36 months'),

  ('22222222-0000-0000-0000-000000000025', '11111111-0000-0000-0000-000000000005',
   'Layla Khalil',    'Layla',  'Khalil',  'layla.khalil@lifttech.ae',      '+971-55-305-0025', 'EMP-LT-002',
   'ELEVATORS', ARRAY[]::public.service_domain[], ARRAY['Passenger Lifts','Safety Gear Inspection'],
   'technician', 4, 'on_job', 1, 178, 4.3, 4.3, 89.6, 82.1, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '15 months'),

  -- NETSEC IT SERVICES — 6 IT technicians
  ('22222222-0000-0000-0000-000000000026', '11111111-0000-0000-0000-000000000006',
   'Ivan Petrov',     'Ivan',   'Petrov',  'ivan.petrov@netsec.ae',         '+971-55-306-0026', 'EMP-NS-001',
   'IT_SYSTEMS', ARRAY['SECURITY_SYSTEMS']::public.service_domain[], ARRAY['Network Infrastructure','Cisco Systems','Server Hardware'],
   'specialist', 14, 'available', 0, 489, 2.6, 4.8, 97.4, 91.8, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '28 months'),

  ('22222222-0000-0000-0000-000000000027', '11111111-0000-0000-0000-000000000006',
   'Aisha Rashidi',   'Aisha',  'Rashidi', 'aisha.rashidi@netsec.ae',       '+971-55-306-0027', 'EMP-NS-002',
   'SECURITY_SYSTEMS', ARRAY['IT_SYSTEMS']::public.service_domain[], ARRAY['CCTV Systems','Access Control','Alarm Systems'],
   'senior_technician', 8, 'available', 0, 301, 3.5, 4.6, 93.1, 86.4, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '20 months'),

  -- MECHMASTER ENGINEERING — 7 Mechanical technicians
  ('22222222-0000-0000-0000-000000000028', '11111111-0000-0000-0000-000000000007',
   'Oluwole Babatunde','Oluwole','Babatunde','oluwole.babatunde@mechmaster.ae','+971-55-307-0028','EMP-MM-001',
   'MECHANICAL', ARRAY['CIVIL_WORKS']::public.service_domain[], ARRAY['Centrifugal Pumps','Compressors','Hydraulics','Civil Repairs'],
   'specialist', 11, 'available', 0, 412, 3.1, 4.7, 95.8, 89.6, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '24 months'),

  ('22222222-0000-0000-0000-000000000029', '11111111-0000-0000-0000-000000000007',
   'Sara Al-Mansoori','Sara','Al-Mansoori','sara.almansoori@mechmaster.ae', '+971-55-307-0029', 'EMP-MM-002',
   'MECHANICAL', ARRAY[]::public.service_domain[], ARRAY['Pump Maintenance','Bearing Replacement','Alignment'],
   'technician', 5, 'on_job', 1, 201, 4.1, 4.4, 90.2, 83.7, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '16 months'),

  -- MULTITECH FM — 4 Multi-domain technicians
  ('22222222-0000-0000-0000-000000000030', '11111111-0000-0000-0000-000000000008',
   'Brendan Murphy',  'Brendan','Murphy',  'brendan.murphy@multitech.ae',   '+971-55-308-0030', 'EMP-MT-001',
   'HVAC', ARRAY['ELECTRICAL','PLUMBING']::public.service_domain[], ARRAY['HVAC Generalist','Electrical Basics','Plumbing Basics'],
   'field_engineer', 10, 'available', 0, 387, 3.3, 4.5, 91.6, 85.2, '08:00', '18:00', ARRAY['Mon','Tue','Wed','Thu','Fri'], 'active', now() - INTERVAL '18 months')

ON CONFLICT (id) DO NOTHING;

COMMIT;
-- =============================================================================
-- SEED 04: User Profiles (Demo Login Accounts)
-- Enterprise: NexGen Facilities Management
-- Purpose:    Create profiles for all demo users
--
-- CRITICAL: Profiles.id must match auth.users.id in Supabase.
-- These are placeholder UUIDs that must be linked to real auth.users rows.
-- Run the Auth setup SQL in Supabase Dashboard → SQL Editor after this seed.
--
-- DEMO ACCOUNTS:
--   admin@nexgenfm.com          / Demo@1234!  (org_admin)
--   fm.manager@nexgenfm.com     / Demo@1234!  (org_user)
--   helpdesk@nexgenfm.com       / Demo@1234!  (org_user)
--   samer@apexclimate.ae        / Demo@1234!  (vendor_admin)
--   ravi@powersafe.ae           / Demo@1234!  (vendor_admin)
--   rahul.sharma@apexclimate.ae / Demo@1234!  (technician)
--   john.david@powersafe.ae     / Demo@1234!  (technician)
--   emeka.okonkwo@fireguard.ae  / Demo@1234!  (technician)
-- =============================================================================

BEGIN;

-- =============================================================================
-- ORG ADMIN PROFILES
-- =============================================================================
INSERT INTO public.profiles (
  id, full_name, first_name, last_name, email, phone, role,
  org_id, vendor_id, tech_id, assigned_entity_id, assigned_entity_type,
  status, last_login_at, notification_preferences, theme, language, created_at
) VALUES

  -- Primary Org Admin
  (
    'ffffffff-0000-0000-0000-000000000001',
    'Arjun Mehta', 'Arjun', 'Mehta', 'admin@nexgenfm.com', '+971-50-100-2001',
    'org_admin',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '2 hours',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '18 months'
  ),

  -- FM Manager
  (
    'ffffffff-0000-0000-0000-000000000002',
    'Riya Patel', 'Riya', 'Patel', 'fm.manager@nexgenfm.com', '+971-50-100-2002',
    'org_user',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '1 hour',
    '{"push": true, "email": true, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '15 months'
  ),

  -- Helpdesk Agent
  (
    'ffffffff-0000-0000-0000-000000000003',
    'Sameer Al-Hajj', 'Sameer', 'Al-Hajj', 'helpdesk@nexgenfm.com', '+971-50-100-2003',
    'org_user',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '30 minutes',
    '{"push": true, "email": false, "sms": false}'::jsonb, 'system', 'en', now() - INTERVAL '10 months'
  ),

  -- Building Manager
  (
    'ffffffff-0000-0000-0000-000000000004',
    'Lina Johansson', 'Lina', 'Johansson', 'building.mgr@nexgenfm.com', '+971-50-100-2004',
    'org_user',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '3 hours',
    '{"push": true, "email": true, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '8 months'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VENDOR ADMIN PROFILES
-- =============================================================================
INSERT INTO public.profiles (
  id, full_name, first_name, last_name, email, phone, role,
  org_id, vendor_id, tech_id, assigned_entity_id, assigned_entity_type,
  status, last_login_at, notification_preferences, theme, language, created_at
) VALUES

  -- Apex Climate Control admin
  (
    'ffffffff-0000-0000-0000-000000000011',
    'Samer Al-Rashidi', 'Samer', 'Al-Rashidi', 'samer@apexclimate.ae', '+971-50-201-0011',
    'vendor_admin',
    NULL, '11111111-0000-0000-0000-000000000001', NULL,
    '11111111-0000-0000-0000-000000000001', 'vendor',
    'active', now() - INTERVAL '4 hours',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '24 months'
  ),

  -- PowerSafe Electrical admin
  (
    'ffffffff-0000-0000-0000-000000000012',
    'Ravi Kumar', 'Ravi', 'Kumar', 'ravi@powersafe.ae', '+971-50-202-0022',
    'vendor_admin',
    NULL, '11111111-0000-0000-0000-000000000002', NULL,
    '11111111-0000-0000-0000-000000000002', 'vendor',
    'active', now() - INTERVAL '6 hours',
    '{"push": true, "email": true, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '20 months'
  ),

  -- FireGuard admin
  (
    'ffffffff-0000-0000-0000-000000000013',
    'James Okonkwo', 'James', 'Okonkwo', 'james@fireguard.ae', '+971-50-204-0044',
    'vendor_admin',
    NULL, '11111111-0000-0000-0000-000000000004', NULL,
    '11111111-0000-0000-0000-000000000004', 'vendor',
    'active', now() - INTERVAL '2 hours',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'system', 'en', now() - INTERVAL '22 months'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TECHNICIAN PROFILES (linked to technicians table)
-- =============================================================================
INSERT INTO public.profiles (
  id, full_name, first_name, last_name, email, phone, role,
  org_id, vendor_id, tech_id, assigned_entity_id, assigned_entity_type,
  status, last_login_at, notification_preferences, theme, language, created_at
) VALUES

  -- Rahul Sharma — Apex HVAC Senior Tech
  (
    'ffffffff-0000-0000-0000-000000000021',
    'Rahul Sharma', 'Rahul', 'Sharma', 'rahul.sharma@apexclimate.ae', '+971-55-301-0001',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001', 'vendor',
    'active', now() - INTERVAL '30 minutes',
    '{"push": true, "email": false, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '24 months'
  ),

  -- John David — PowerSafe Electrical Specialist
  (
    'ffffffff-0000-0000-0000-000000000022',
    'John David', 'John', 'David', 'john.david@powersafe.ae', '+971-55-302-0009',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009',
    '11111111-0000-0000-0000-000000000002', 'vendor',
    'active', now() - INTERVAL '1 hour',
    '{"push": true, "email": false, "sms": true}'::jsonb, 'system', 'en', now() - INTERVAL '36 months'
  ),

  -- Emeka Okonkwo — FireGuard Fire Safety Specialist
  (
    'ffffffff-0000-0000-0000-000000000023',
    'Emeka Okonkwo', 'Emeka', 'Okonkwo', 'emeka.okonkwo@fireguard.ae', '+971-55-304-0021',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000021',
    '11111111-0000-0000-0000-000000000004', 'vendor',
    'active', now() - INTERVAL '2 hours',
    '{"push": true, "email": false, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '30 months'
  ),

  -- Suresh Babu — Apex Chiller Specialist
  (
    'ffffffff-0000-0000-0000-000000000024',
    'Suresh Babu', 'Suresh', 'Babu', 'suresh.babu@apexclimate.ae', '+971-55-301-0003',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001', 'vendor',
    'active', now() - INTERVAL '45 minutes',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '24 months'
  ),

  -- Fernando Costa — LiftTech Elevator Specialist
  (
    'ffffffff-0000-0000-0000-000000000025',
    'Fernando Costa', 'Fernando', 'Costa', 'fernando.costa@lifttech.ae', '+971-55-305-0024',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000024',
    '11111111-0000-0000-0000-000000000005', 'vendor',
    'active', now() - INTERVAL '90 minutes',
    '{"push": true, "email": false, "sms": true}'::jsonb, 'system', 'en', now() - INTERVAL '36 months'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Link vendor.manager_id to profile IDs
-- =============================================================================
UPDATE public.vendors SET manager_id = 'ffffffff-0000-0000-0000-000000000011' WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE public.vendors SET manager_id = 'ffffffff-0000-0000-0000-000000000012' WHERE id = '11111111-0000-0000-0000-000000000002';
UPDATE public.vendors SET manager_id = 'ffffffff-0000-0000-0000-000000000013' WHERE id = '11111111-0000-0000-0000-000000000004';

-- =============================================================================
-- Link technician.user_id to profile IDs
-- =============================================================================
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000021' WHERE id = '22222222-0000-0000-0000-000000000001';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000022' WHERE id = '22222222-0000-0000-0000-000000000009';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000023' WHERE id = '22222222-0000-0000-0000-000000000021';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000024' WHERE id = '22222222-0000-0000-0000-000000000003';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000025' WHERE id = '22222222-0000-0000-0000-000000000024';

COMMIT;
-- =============================================================================
-- SEED 05: Assets (300 assets across all sites)
-- Enterprise: NexGen Facilities Management
-- Purpose:    Populate assets table with realistic enterprise equipment
-- Idempotent: ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- ASSETS: HQ Campus — HVAC, Electrical, Elevators (100 assets)
-- =============================================================================
INSERT INTO public.assets (
  asset_name, asset_id, category, vendor, location,
  installation_date, warranty_expiry, amc_expiry,
  purchase_date, last_service_date,
  health_score, status, health,
  org_id, site_id, vendor_id,
  last_maintenance_at, next_maintenance_at, incident_count, uptime_pct, notes,
  last_inspection_at, created_at
) VALUES

-- ── HQ Campus HVAC Assets ─────────────────────────────────────────────────────

('HQ Chiller Unit 1 — York YK 1200TR',      'AST-HQ-001', 'HVAC',       'York International',       'HQ Tower 1 — Basement Chiller Plant',
 '2018-03-15', '2025-12-31', '2026-12-31', '2018-01-10', '2026-04-01',
 42.0, 'degraded',          'At Risk',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-04-01', '2026-07-01', 7, 78.4, 'Bearing vibration detected on impeller shaft. Refrigerant leak suspected. Priority inspection required.',
 '2026-04-01', now() - INTERVAL '18 months'),

('HQ Chiller Unit 2 — Carrier 30XWH 800TR', 'AST-HQ-002', 'HVAC',       'Carrier Corporation',      'HQ Tower 1 — Basement Chiller Plant',
 '2019-06-20', '2026-06-30', '2027-06-30', '2019-04-01', '2026-06-15',
 88.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-06-15', '2026-09-15', 2, 97.2, 'Operating within normal parameters. Quarterly PM completed.',
 '2026-06-15', now() - INTERVAL '18 months'),

('HQ Cooling Tower 1 — BAC VX-550',         'AST-HQ-003', 'HVAC',       'Baltimore Aircoil Company', 'HQ Tower 1 — Rooftop',
 '2018-03-15', '2025-03-31', '2026-03-31', '2018-01-10', '2026-03-10',
 61.0, 'degraded',          'Warning',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-03-10', '2026-06-10', 4, 84.1, 'Fan motor bearing showing early wear. Fill packing replacement due.',
 '2026-03-10', now() - INTERVAL '18 months'),

('HQ Cooling Tower 2 — Evapco PMWA 400',    'AST-HQ-004', 'HVAC',       'Evapco Inc.',              'HQ Tower 1 — Rooftop',
 '2020-01-10', '2027-01-31', '2027-01-31', '2019-11-01', '2026-05-20',
 92.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-05-20', '2026-08-20', 1, 99.1, 'Excellent condition. Last PM included bio-treatment.',
 '2026-05-20', now() - INTERVAL '18 months'),

('HQ AHU-01 — Carrier 39CC 30,000 CFM',     'AST-HQ-005', 'HVAC',       'Carrier Corporation',      'HQ Tower 1 — Basement Plant Room',
 '2018-03-15', '2025-12-31', '2026-12-31', '2018-01-10', '2026-05-01',
 75.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-05-01', '2026-08-01', 3, 93.5, 'Filter replaced. Belt tension adjusted. Running smoothly.',
 '2026-05-01', now() - INTERVAL '18 months'),

('HQ AHU-02 — Trane M-Series 25,000 CFM',   'AST-HQ-006', 'HVAC',       'Trane Technologies',       'HQ Tower 2 — Ground Floor Plant',
 '2019-08-10', '2026-08-31', '2027-08-31', '2019-06-01', '2026-04-15',
 84.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-04-15', '2026-07-15', 2, 96.8, 'Operating well. Coil cleaned during last PM.',
 '2026-04-15', now() - INTERVAL '18 months'),

('HQ FCU Floor 1 — Daikin FWS04ATN',        'AST-HQ-007', 'HVAC',       'Daikin',                   'HQ Tower 1 — Floor 1 Ceiling Void',
 '2018-06-01', '2025-06-30', '2026-06-30', '2018-04-01', '2026-06-01',
 55.0, 'degraded',          'At Risk',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-06-01', '2026-09-01', 5, 81.3, 'Condensate drain blocked twice this year. Fan motor vibrating. Consider replacement.',
 '2026-06-01', now() - INTERVAL '18 months'),

('HQ VRF System — Mitsubishi PUHY-P500',    'AST-HQ-008', 'HVAC',       'Mitsubishi Electric',      'HQ Tower 2 — Floors 10-15',
 '2021-02-20', '2028-02-28', '2028-02-28', '2020-12-01', '2026-07-01',
 95.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-07-01', '2026-10-01', 0, 99.7, 'New system. Under manufacturer warranty. Outstanding performance.',
 '2026-07-01', now() - INTERVAL '18 months'),

-- ── HQ Electrical Assets ───────────────────────────────────────────────────────

('HQ MV Switchgear 11kV — ABB ZS1',         'AST-HQ-009', 'ELECTRICAL', 'ABB',                      'HQ Tower 1 — Basement MV Room',
 '2015-09-01', '2022-09-30', '2026-09-30', '2015-06-01', '2026-02-01',
 71.0, 'operational',       'Warning',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 '2026-02-01', '2026-08-01', 3, 99.9, 'Due for 5-year major inspection. Warranty expired. SF6 gas pressure nominal.',
 '2026-02-01', now() - INTERVAL '18 months'),

('HQ Transformer 11kV/415V 2000kVA — Siemens','AST-HQ-010', 'ELECTRICAL','Siemens AG',              'HQ Tower 1 — MV Sub-Station',
 '2015-09-01', '2022-09-30', '2026-12-31', '2015-06-01', '2026-01-15',
 79.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 '2026-01-15', '2026-07-15', 1, 99.8, 'Oil sample analysis satisfactory. Next oil change in 12 months.',
 '2026-01-15', now() - INTERVAL '18 months'),

('HQ Diesel Generator 2000kVA — Cummins C2000D5','AST-HQ-011','ELECTRICAL','Cummins Inc.',           'HQ Tower 1 — Basement Generator Room',
 '2016-04-01', '2023-04-30', '2026-04-30', '2016-01-01', '2026-04-10',
 82.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 '2026-04-10', '2026-10-10', 2, 99.5, 'Monthly load test passed. Oil and coolant changed on schedule.',
 '2026-04-10', now() - INTERVAL '18 months'),

('HQ UPS 800kVA — Schneider Galaxy VM',      'AST-HQ-012', 'ELECTRICAL', 'Schneider Electric',       'HQ Tower 1 — UPS Room Level 1',
 '2019-11-01', '2026-11-30', '2026-11-30', '2019-09-01', '2026-05-05',
 88.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 '2026-05-05', '2026-11-05', 1, 100.0, 'Battery health at 91%. 5-year battery replacement upcoming in 6 months.',
 '2026-05-05', now() - INTERVAL '18 months'),

('HQ LV MDB Panel — Eaton PXM',             'AST-HQ-013', 'ELECTRICAL', 'Eaton Corporation',        'HQ Tower 1 — Ground Floor LV Room',
 '2018-03-15', '2025-03-31', '2026-03-31', '2018-01-01', '2026-03-20',
 65.0, 'operational',       'Warning',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 '2026-03-20', '2026-09-20', 4, 99.6, 'Thermal imaging detected hotspot on bus bar. Tightening done. Monitor closely.',
 '2026-03-20', now() - INTERVAL '18 months'),

-- ── HQ Elevators ──────────────────────────────────────────────────────────────

('HQ Lift 1 — OTIS Gen2 MRL Passenger',     'AST-HQ-014', 'ELEVATORS',  'OTIS Elevator Company',    'HQ Tower 1 — Lift Core A',
 '2018-03-15', '2023-03-31', '2026-06-30', '2018-01-01', '2026-06-15',
 91.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005',
 '2026-06-15', '2026-07-15', 1, 98.7, 'Monthly PM completed. Door sensors checked. Rope tension nominal.',
 '2026-06-15', now() - INTERVAL '18 months'),

('HQ Lift 2 — OTIS Gen2 MRL Passenger',     'AST-HQ-015', 'ELEVATORS',  'OTIS Elevator Company',    'HQ Tower 1 — Lift Core A',
 '2018-03-15', '2023-03-31', '2026-06-30', '2018-01-01', '2026-06-15',
 68.0, 'under_maintenance', 'Under Maintenance',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005',
 '2026-06-15', '2026-07-15', 6, 82.4, 'CURRENTLY UNDER MAINTENANCE — Door motor replacement in progress.',
 '2026-06-15', now() - INTERVAL '18 months'),

('HQ Lift 3 — Schindler 5500 MRL',          'AST-HQ-016', 'ELEVATORS',  'Schindler Group',          'HQ Tower 1 — Lift Core B',
 '2019-01-15', '2024-01-31', '2027-01-31', '2018-11-01', '2026-07-01',
 87.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005',
 '2026-07-01', '2026-08-01', 2, 97.9, 'Monthly PM completed. Safety gear tested. Door rubber replaced.',
 '2026-07-01', now() - INTERVAL '18 months'),

-- ── HQ Fire Safety ────────────────────────────────────────────────────────────

('HQ Fire Alarm Panel — Notifier NFS2-3030', 'AST-HQ-017', 'FIRE_SAFETY','Notifier/Honeywell',       'HQ Tower 1 — Ground Floor Security Room',
 '2018-03-15', '2025-12-31', '2026-12-31', '2018-01-01', '2026-01-15',
 93.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004',
 '2026-01-15', '2027-01-15', 0, 100.0, 'Annual inspection passed. All detectors functional. Certificate valid.',
 '2026-01-15', now() - INTERVAL '18 months'),

('HQ CO2 Suppression System — Kidde Sapphire','AST-HQ-018','FIRE_SAFETY', 'Kidde/Carrier',           'HQ Data Center',
 '2017-09-01', '2024-09-30', '2026-09-30', '2017-07-01', '2026-09-01',
 88.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000004',
 '2026-09-01', '2027-09-01', 0, 100.0, 'Cylinder weights checked. Pressure nominal. Nozzle test passed.',
 '2026-09-01', now() - INTERVAL '18 months'),

-- ── Data Center Assets ────────────────────────────────────────────────────────

('DC CRAC Unit 1 — Emerson Liebert PEX',    'AST-DC-001', 'HVAC',       'Emerson Network Power',    'HQ Data Center — Server Hall A',
 '2017-09-01', '2024-09-30', '2026-09-30', '2017-07-01', '2026-06-10',
 22.0, 'failed',             'Critical',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-06-10', '2026-07-10', 12, 61.2, 'CRITICAL: Compressor failure. Server hall temperature rising. Emergency ticket raised. Backup CRAC overloaded.',
 '2026-06-10', now() - INTERVAL '18 months'),

('DC CRAC Unit 2 — Emerson Liebert PEX',    'AST-DC-002', 'HVAC',       'Emerson Network Power',    'HQ Data Center — Server Hall A',
 '2017-09-01', '2024-09-30', '2026-09-30', '2017-07-01', '2026-06-20',
 58.0, 'operational',       'Warning',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 '2026-06-20', '2026-09-20', 8, 77.3, 'Running at 140% capacity due to CRAC-1 failure. Thermal overload risk. Monitoring every 30 minutes.',
 '2026-06-20', now() - INTERVAL '18 months'),

('DC UPS System — APC Symmetra PX 250kVA',  'AST-DC-003', 'ELECTRICAL', 'APC by Schneider',         'HQ Data Center — UPS Room',
 '2019-03-01', '2026-03-31', '2026-03-31', '2019-01-01', '2026-03-15',
 74.0, 'operational',       'Warning',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
 '2026-03-15', '2026-09-15', 3, 99.9, 'Battery string 3 showing reduced capacity. Warranty expired. Battery replacement budgeted for Q3.',
 '2026-03-15', now() - INTERVAL '18 months'),

('DC Diesel Generator 1000kVA — Perkins',   'AST-DC-004', 'ELECTRICAL', 'Perkins Engines',          'HQ Data Center — Generator Yard',
 '2017-09-01', '2024-09-30', '2026-09-30', '2017-07-01', '2026-05-15',
 89.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
 '2026-05-15', '2026-11-15', 1, 99.8, 'Weekly run-test nominal. Coolant and oil levels good.',
 '2026-05-15', now() - INTERVAL '18 months'),

-- ── Medical Campus Assets ─────────────────────────────────────────────────────

('MED ICU HVAC Unit — Stulz CyberAir 3',    'AST-MED-001','HVAC',       'STULZ GmbH',               'Medical — Hospital Block Floor 3 ICU',
 '2016-06-01', '2023-06-30', '2026-06-30', '2016-04-01', '2026-06-01',
 38.0, 'degraded',           'Critical',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
 '2026-06-01', '2026-07-01', 9, 71.8, 'CRITICAL: ICU HVAC — Humidity control failure. Temperature deviation detected. Patient safety risk. Emergency escalation.',
 '2026-06-01', now() - INTERVAL '18 months'),

('MED Autoclave Sterilizer — Getinge GE 888','AST-MED-002','MECHANICAL', 'Getinge Group',            'Medical — Hospital Block Floor 2 CSSD',
 '2018-09-01', '2025-09-30', '2026-09-30', '2018-07-01', '2026-04-01',
 76.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000007',
 '2026-04-01', '2026-10-01', 2, 94.6, 'Quarterly validation completed. Steam trap replaced.',
 '2026-04-01', now() - INTERVAL '18 months'),

('MED Medical Gas System — Pneumatech',      'AST-MED-003','MECHANICAL', 'Pneumatech / Atlas Copco', 'Medical — Hospital Block — All Floors',
 '2016-06-01', '2023-06-30', '2026-06-30', '2016-04-01', '2026-05-10',
 85.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000007',
 '2026-05-10', '2026-11-10', 1, 99.9, 'O2 and N2 pipeline pressures within specification. No leaks detected.',
 '2026-05-10', now() - INTERVAL '18 months'),

-- ── Manufacturing Campus Assets ───────────────────────────────────────────────

('MFG Cold Store Compressor 1 — Bitzer CSW95','AST-MFG-001','HVAC',      'Bitzer SE',                'Manufacturing — Cold Storage Chamber 1',
 '2019-08-01', '2026-08-31', '2027-08-31', '2019-06-01', '2026-05-01',
 48.0, 'degraded',           'At Risk',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
 '2026-05-01', '2026-08-01', 6, 83.2, 'Oil pressure dropping. Vibration sensor triggered twice this month. Overhaul recommended before summer peak.',
 '2026-05-01', now() - INTERVAL '18 months'),

('MFG Conveyor Motor 1 — SEW-Eurodrive 75kW','AST-MFG-002','MECHANICAL', 'SEW-Eurodrive',            'Manufacturing — Production Line Floor 2',
 '2020-01-15', '2025-01-31', '2026-01-31', '2019-11-01', '2026-02-15',
 33.0, 'degraded',           'At Risk',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000007',
 '2026-02-15', '2026-08-15', 8, 76.9, 'Gearbox oil leak detected. Vibration alarm activated. Production line running at 60% speed pending repair.',
 '2026-02-15', now() - INTERVAL '18 months'),

('MFG Fire Sprinkler System — Viking VK302', 'AST-MFG-003','FIRE_SAFETY','Viking Group',             'Manufacturing — Entire Warehouse Complex',
 '2019-08-01', '2026-08-31', '2026-08-31', '2019-06-01', '2025-08-01',
 90.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004',
 '2025-08-01', '2026-08-01', 0, 100.0, 'Annual inspection passed. Flow switch test completed. All heads checked.',
 '2025-08-01', now() - INTERVAL '18 months'),

-- ── Tech Park Assets ──────────────────────────────────────────────────────────

('TECH Network Core Switch — Cisco Catalyst 9400','AST-TEC-001','IT_SYSTEMS','Cisco Systems',         'Tech Park Block A — IT Room Floor 6',
 '2020-05-01', '2025-05-31', '2026-05-31', '2020-03-01', '2026-05-01',
 96.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006',
 '2026-05-01', '2026-11-01', 0, 99.99, 'Excellent uptime. Firmware updated last month.',
 '2026-05-01', now() - INTERVAL '18 months'),

('TECH Security CCTV System — Hikvision DS-9664',  'AST-TEC-002','SECURITY_SYSTEMS','Hikvision',    'Tech Park Block A — Security Room',
 '2021-03-01', '2026-03-31', '2027-03-31', '2021-01-01', '2026-06-01',
 86.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006',
 '2026-06-01', '2026-12-01', 1, 98.4, 'Annual maintenance completed. 4 cameras repositioned for better coverage.',
 '2026-06-01', now() - INTERVAL '18 months'),

-- ── Retail Campus Assets ──────────────────────────────────────────────────────

('RET Escalator 1 — Schindler 9700 FS',     'AST-RET-001','ELEVATORS',  'Schindler Group',          'Retail Mall Block — Level G to L1',
 '2020-06-01', '2025-06-30', '2026-06-30', '2020-04-01', '2026-07-10',
 72.0, 'operational',       'Warning',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005',
 '2026-07-10', '2026-08-10', 4, 90.3, 'Step chain lubrication completed. Comb plate inspection due. High footfall environment.',
 '2026-07-10', now() - INTERVAL '18 months'),

('RET Central BMS — Honeywell EBI R600',    'AST-RET-002','IT_SYSTEMS',  'Honeywell',               'Retail Mall Block — NOC Room Ground Floor',
 '2020-06-01', '2025-06-30', '2027-06-30', '2020-04-01', '2026-04-01',
 91.0, 'operational',       'Healthy',
 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000006',
 '2026-04-01', '2026-10-01', 0, 99.8, 'BMS server updated. All DDC controllers communicating. 340 points monitored.',
 '2026-04-01', now() - INTERVAL '18 months')

ON CONFLICT (asset_id) DO NOTHING;

COMMIT;
-- =============================================================================
-- SEED 06: Inventory & Warehouses
-- Enterprise: NexGen Facilities Management
-- Purpose:    Populate Warehouses, Inventory Items, and Stock Levels
-- Idempotent: ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- WAREHOUSES (3 Org Warehouses, 2 Vendor Warehouses)
-- =============================================================================
INSERT INTO public.warehouses (
  id, warehouse_code, name, org_id, vendor_id, site_id,
  warehouse_type, address, status, created_at
) VALUES
  -- Org Main Warehouse at HQ
  ('33333333-0000-0000-0000-000000000001', 'WH-HQ-MAIN', 'HQ Central Stores', 
   'aaaaaaaa-0000-0000-0000-000000000001', NULL, 'bbbbbbbb-0000-0000-0000-000000000001',
   'Main', 'HQ Tower 1 Basement 2', 'active', now() - INTERVAL '18 months'),

  -- Org Regional Warehouse at Manufacturing
  ('33333333-0000-0000-0000-000000000002', 'WH-MFG-REG', 'Manufacturing Spare Parts', 
   'aaaaaaaa-0000-0000-0000-000000000001', NULL, 'bbbbbbbb-0000-0000-0000-000000000004',
   'Regional', 'MFG Warehouse Block A', 'active', now() - INTERVAL '15 months'),

  -- Vendor Warehouse (Apex Climate Control)
  ('33333333-0000-0000-0000-000000000003', 'WH-V1-DXB', 'Apex HVAC Central Depot', 
   'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', NULL,
   'Main', 'Al Quoz Industrial Area 3', 'active', now() - INTERVAL '24 months'),

  -- Vendor Warehouse (PowerSafe)
  ('33333333-0000-0000-0000-000000000004', 'WH-V2-DXB', 'PowerSafe Spares Hub', 
   'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', NULL,
   'Main', 'Dubai Investment Park', 'active', now() - INTERVAL '20 months')
ON CONFLICT (warehouse_code) DO NOTHING;

-- =============================================================================
-- INVENTORY ITEMS (40 common FM spare parts)
-- =============================================================================
INSERT INTO public.inventory_items (
  id, item_code, name, description, category, manufacturer, part_number,
  unit, minimum_stock, maximum_stock, reorder_level, barcode, status, created_at
) VALUES
  -- HVAC Parts
  ('44444444-0000-0000-0000-000000000001', 'HVAC-FLT-001', 'Pleated Air Filter 24x24x2', 'MERV 8 Pleated Air Filter for AHUs', 'HVAC', 'Camfil', 'CF-24242-M8', 'pcs', 50, 500, 100, 'B-HVAC-001', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000002', 'HVAC-FLT-002', 'Pleated Air Filter 20x20x2', 'MERV 8 Pleated Air Filter for FCUs', 'HVAC', 'Camfil', 'CF-20202-M8', 'pcs', 100, 1000, 200, 'B-HVAC-002', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000003', 'HVAC-BELT-001', 'V-Belt B52', 'Heavy duty V-Belt for AHU fans', 'HVAC', 'Gates', 'B52-HD', 'pcs', 20, 100, 30, 'B-HVAC-003', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000004', 'HVAC-REF-001', 'Refrigerant R-410A', 'R-410A Refrigerant Gas Cylinder (11.3 kg)', 'HVAC', 'Honeywell', 'R410A-11.3', 'cyl', 10, 50, 15, 'B-HVAC-004', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000005', 'HVAC-REF-002', 'Refrigerant R-134a', 'R-134a Refrigerant Gas Cylinder (13.6 kg)', 'HVAC', 'Honeywell', 'R134A-13.6', 'cyl', 5, 30, 10, 'B-HVAC-005', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000006', 'HVAC-COMP-001', 'Compressor Scroll 5 Ton', 'Copeland Scroll Compressor 5 Ton 3 Phase', 'HVAC', 'Copeland', 'ZR61K3-TF5', 'pcs', 2, 10, 3, 'B-HVAC-006', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000007', 'HVAC-MOT-001', 'Fan Motor 1/2 HP', 'Condenser Fan Motor 1/2 HP 208-230V', 'HVAC', 'Fasco', 'D909', 'pcs', 5, 20, 8, 'B-HVAC-007', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000008', 'HVAC-THERM-001', 'Smart Thermostat', 'Digital Programmable Smart Thermostat', 'HVAC', 'Honeywell', 'T6-PRO', 'pcs', 10, 50, 15, 'B-HVAC-008', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000009', 'HVAC-CON-001', 'Contactor 3 Pole 40A', 'Definite Purpose Contactor 3P 40A 24V Coil', 'HVAC', 'Siemens', '42BF35AJ', 'pcs', 15, 50, 20, 'B-HVAC-009', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000010', 'HVAC-CAP-001', 'Dual Run Capacitor', 'Dual Run Capacitor 45+5 MFD 440V', 'HVAC', 'AmRad', 'USA2236', 'pcs', 30, 100, 40, 'B-HVAC-010', 'active', now() - INTERVAL '12 months'),

  -- Electrical Parts
  ('44444444-0000-0000-0000-000000000101', 'ELEC-MCB-001', 'MCB 1 Pole 16A', 'Miniature Circuit Breaker 1P 16A Type C', 'ELECTRICAL', 'Schneider Electric', 'A9F74116', 'pcs', 50, 200, 80, 'B-ELEC-001', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000102', 'ELEC-MCB-002', 'MCB 3 Pole 32A', 'Miniature Circuit Breaker 3P 32A Type C', 'ELECTRICAL', 'ABB', 'S203-C32', 'pcs', 20, 100, 30, 'B-ELEC-002', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000103', 'ELEC-LED-001', 'LED Tube Light 4ft', '18W LED Tube Light 4ft 6500K', 'ELECTRICAL', 'Philips', 'LED-T8-18W-865', 'pcs', 100, 500, 150, 'B-ELEC-003', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000104', 'ELEC-LED-002', 'LED Downlight 15W', '15W LED Downlight Round 4000K', 'ELECTRICAL', 'Osram', 'DL-15W-4000K', 'pcs', 50, 300, 80, 'B-ELEC-004', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000105', 'ELEC-CBL-001', 'Cable 2.5mm 3 Core', 'Flexible Cable 2.5mm sq 3 Core (100m roll)', 'ELECTRICAL', 'Prysmian', 'FLX-2.5-3C', 'roll', 10, 50, 15, 'B-ELEC-005', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000106', 'ELEC-SWT-001', 'Light Switch 1 Gang', '1 Gang 2 Way Light Switch White', 'ELECTRICAL', 'Legrand', 'LG-1G2W-WH', 'pcs', 30, 150, 50, 'B-ELEC-006', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000107', 'ELEC-SKT-001', 'Socket Outlet 13A', '13A Switched Socket Outlet Double', 'ELECTRICAL', 'MK Electric', 'MK-13A-SS', 'pcs', 40, 200, 60, 'B-ELEC-007', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000108', 'ELEC-BAT-001', 'UPS Battery 12V 7Ah', 'Sealed Lead Acid Battery 12V 7Ah', 'ELECTRICAL', 'CSB', 'GP1272', 'pcs', 20, 100, 30, 'B-ELEC-008', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000109', 'ELEC-RCBO-001', 'RCBO 20A 30mA', 'Residual Current Breaker with Overcurrent 20A 30mA', 'ELECTRICAL', 'Schneider Electric', 'A9D11820', 'pcs', 10, 50, 15, 'B-ELEC-009', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000110', 'ELEC-FUS-001', 'HRC Fuse 100A', 'High Rupturing Capacity Fuse 100A', 'ELECTRICAL', 'Eaton', '100NHG00B', 'pcs', 15, 60, 20, 'B-ELEC-010', 'active', now() - INTERVAL '12 months'),

  -- Plumbing Parts
  ('44444444-0000-0000-0000-000000000201', 'PLMB-VLV-001', 'Gate Valve 2 inch', 'Brass Gate Valve 2 inch Threaded', 'PLUMBING', 'Pegler', 'GV-2-BR', 'pcs', 10, 40, 15, 'B-PLMB-001', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000202', 'PLMB-VLV-002', 'Ball Valve 1 inch', 'Stainless Steel Ball Valve 1 inch', 'PLUMBING', 'Crane', 'BV-1-SS', 'pcs', 20, 80, 30, 'B-PLMB-002', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000203', 'PLMB-TAP-001', 'Basin Mixer Tap', 'Chrome Basin Mixer Tap with Pop-up Waste', 'PLUMBING', 'Grohe', 'BA-MIX-CR', 'pcs', 15, 60, 20, 'B-PLMB-003', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000204', 'PLMB-PIP-001', 'PPR Pipe 32mm', 'PPR Pipe 32mm PN20 (4m length)', 'PLUMBING', 'Raktherm', 'PPR-32-20', 'length', 30, 150, 45, 'B-PLMB-004', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000205', 'PLMB-SLN-001', 'Silicone Sealant', 'Sanitary Silicone Sealant Clear 310ml', 'PLUMBING', 'Dow Corning', 'SIL-CLR-310', 'tube', 50, 200, 75, 'B-PLMB-005', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000206', 'PLMB-PMP-001', 'Submersible Pump', 'Submersible Drainage Pump 1HP', 'PLUMBING', 'Grundfos', 'UNILIFT-CC9', 'pcs', 2, 10, 3, 'B-PLMB-006', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000207', 'PLMB-FLT-001', 'Water Filter Cartridge', 'Sediment Filter Cartridge 10 inch 5 Micron', 'PLUMBING', 'Pentair', 'SED-10-5M', 'pcs', 40, 200, 60, 'B-PLMB-007', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000208', 'PLMB-WSH-001', 'Rubber Washer Set', 'Assorted Rubber Washers Box', 'PLUMBING', 'Generic', 'RW-ASS-100', 'box', 10, 50, 15, 'B-PLMB-008', 'active', now() - INTERVAL '12 months'),

  -- Fire Safety Parts
  ('44444444-0000-0000-0000-000000000301', 'FIRE-DET-001', 'Smoke Detector', 'Optical Smoke Detector with Base', 'FIRE_SAFETY', 'Notifier', 'FSP-951', 'pcs', 30, 150, 40, 'B-FIRE-001', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000302', 'FIRE-MCP-001', 'Manual Call Point', 'Addressable Manual Call Point Glass', 'FIRE_SAFETY', 'Notifier', 'NBG-12LX', 'pcs', 10, 50, 15, 'B-FIRE-002', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000303', 'FIRE-EXT-001', 'CO2 Extinguisher 5kg', 'Carbon Dioxide Fire Extinguisher 5kg', 'FIRE_SAFETY', 'NAFFCO', 'C-5', 'pcs', 10, 50, 15, 'B-FIRE-003', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000304', 'FIRE-SPK-001', 'Sprinkler Head Pendent', 'Pendent Sprinkler Head 68C 1/2 inch', 'FIRE_SAFETY', 'Viking', 'VK302-68', 'pcs', 50, 200, 70, 'B-FIRE-004', 'active', now() - INTERVAL '12 months'),

  -- General Consumables
  ('44444444-0000-0000-0000-000000000401', 'CONS-WD40-001', 'WD-40 Lubricant', 'Multi-Use Product Aerosol 400ml', 'MECHANICAL', 'WD-40', 'WD40-400', 'can', 20, 100, 30, 'B-CONS-001', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000402', 'CONS-TPE-001', 'PVC Electrical Tape', 'Black PVC Insulation Tape 19mm x 33m', 'ELECTRICAL', '3M', '3M-33+', 'roll', 50, 200, 60, 'B-CONS-002', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000403', 'CONS-GLV-001', 'Nitrile Gloves L', 'Disposable Nitrile Gloves Large (Box of 100)', 'SAFETY', 'Ansell', 'TNT-92-600', 'box', 30, 150, 40, 'B-CONS-003', 'active', now() - INTERVAL '12 months'),
  ('44444444-0000-0000-0000-000000000404', 'CONS-WIP-001', 'Industrial Wipes', 'Heavy Duty Cleaning Wipes', 'CLEANING', 'WypAll', 'L40', 'roll', 20, 100, 30, 'B-CONS-004', 'active', now() - INTERVAL '12 months')
ON CONFLICT (item_code) DO NOTHING;

-- =============================================================================
-- WAREHOUSE STOCK (Distributing items across warehouses)
-- =============================================================================
INSERT INTO public.warehouse_stock (
  warehouse_id, inventory_item_id, current_quantity, reserved_quantity,
  average_cost, last_purchase_cost, status, created_at
) VALUES
  -- WH-HQ-MAIN (General stock of everything)
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 120, 10, 12.50, 12.80, 'active', now()),
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002', 250, 40, 10.20, 10.50, 'active', now()),
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000003', 45,  5,  22.00, 22.00, 'active', now()),
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000101', 150, 0,  6.50,  6.50,  'active', now()),
  ('33333333-0000-0000-0000-000000000101', '44444444-0000-0000-0000-000000000103', 300, 25, 8.00,  8.10,  'active', now()),
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000201', 35,  2,  45.00, 46.50, 'active', now()),
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000301', 80,  0,  35.00, 35.00, 'active', now()),
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000401', 65,  5,  5.50,  5.50,  'active', now()),

  -- WH-MFG-REG (Heavy on Mechanical and Consumables)
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000003', 80,  10, 21.50, 22.00, 'active', now()),
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000110', 45,  0,  18.00, 18.00, 'active', now()),
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000401', 90,  0,  5.40,  5.50,  'active', now()),
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000404', 85,  15, 12.00, 12.00, 'active', now()),

  -- WH-V1-DXB (Apex HVAC vendor warehouse - heavy on HVAC parts)
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 400, 50, 11.50, 11.50, 'active', now()),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000004', 45,  8,  120.00,125.00,'active', now()),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000005', 25,  2,  110.00,110.00,'active', now()),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000006', 8,   1,  850.00,850.00,'active', now()),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000010', 120, 20, 18.50, 18.50, 'active', now()),

  -- WH-V2-DXB (PowerSafe vendor warehouse - heavy on Electrical)
  ('33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000101', 250, 30, 6.00,  6.00,  'active', now()),
  ('33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000105', 45,  5,  45.00, 45.00, 'active', now()),
  ('33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000108', 85,  10, 28.00, 29.00, 'active', now()),
  ('33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000109', 40,  2,  35.00, 35.00, 'active', now())
ON CONFLICT (warehouse_id, inventory_item_id) DO NOTHING;

COMMIT;
-- =============================================================================
-- SEED 07: Tickets & Work Orders
-- Enterprise: NexGen Facilities Management
-- Purpose:    Populate realistic transactional data (Tickets + WOs)
-- Idempotent: ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- TICKETS
-- Represents user-reported issues or system-generated alerts
-- =============================================================================
INSERT INTO public.tickets (
  id, ticket_number, org_id, site_id, building_id, floor_id, room_id, asset_id,
  department_id, requester_employee_id, vendor_id, assigned_technician_id,
  service_category_id, service_type_id,
  priority, severity, status, title, description, ai_diagnosis,
  sla_policy_id, response_sla_status, resolution_sla_status,
  response_due_at, resolution_due_at, responded_at,
  due_date, completed_at, closed_at, created_at
) VALUES

  -- 1. CRITICAL INCIDENT: Data Center CRAC Failure (Escalated/Overdue)
  (
    '55555555-0000-0000-0000-000000000001', 'TKT-2026-04100',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-000000000004', 'AST-DC-001',
    'a1000000-0000-0000-0000-000000000003', NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'Critical', 'Total Failure', 'in_progress', 'CRITICAL: Data Center CRAC-1 Compressor Failure', 'BMS Alert: CRAC Unit 1 has tripped. High temperature alarm in Server Hall A (28C). Request immediate dispatch.',
    '{"fault_code":"CRAC-COMP-TRIP","fault_description":"High pressure switch trip on compressor 1. Likely condenser issue or refrigerant overcharge.","recommendations":["Check condenser water flow","Verify refrigerant pressures","Reset high pressure switch"],"confidence_score":0.92}'::jsonb,
    '30000000-0000-0000-0000-000000000001', 'ok', 'breached',
    now() - INTERVAL '3 hours', now() - INTERVAL '30 minutes', now() - INTERVAL '2 hours 50 minutes',
    now() - INTERVAL '30 minutes', NULL, NULL, now() - INTERVAL '3 hours 10 minutes'
  ),

  -- 2. HIGH PRIORITY: ICU Humidity Issue (In Progress)
  (
    '55555555-0000-0000-0000-000000000002', 'TKT-2026-04101',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000006', 'AST-MED-001',
    'a1000000-0000-0000-0000-000000000004', NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'High', 'Degraded', 'in_progress', 'High Humidity in ICU Ward A', 'Nurses reporting high humidity and condensation on windows. Temperature is holding at 22C but RH is 70%.',
    '{"fault_code":"HVAC-DEHUM-FAIL","fault_description":"Loss of dehumidification control. Chilled water valve may be stuck or reheat coil failed.","recommendations":["Check chilled water valve operation","Test reheat coil contactor","Verify BMS setpoints"],"confidence_score":0.85}'::jsonb,
    '30000000-0000-0000-0000-000000000002', 'ok', 'warning',
    now() - INTERVAL '1 hour', now() + INTERVAL '2 hours', now() - INTERVAL '1 hour 45 minutes',
    now() + INTERVAL '2 hours', NULL, NULL, now() - INTERVAL '2 hours'
  ),

  -- 3. MEDIUM PRIORITY: Elevator Noise (Assigned / Scheduled)
  (
    '55555555-0000-0000-0000-000000000003', 'TKT-2026-04102',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000010', NULL, NULL, 'AST-RET-001',
    'a1000000-0000-0000-0000-000000000008', NULL, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000025',
    '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000019',
    'Medium', 'Degraded', 'assigned', 'Unusual Noise from Mall Escalator 1', 'Grinding noise heard from the bottom pit of the escalator when running upwards. Stopped as a precaution.',
    NULL,
    '30000000-0000-0000-0000-000000000003', 'ok', 'ok',
    now() + INTERVAL '4 hours', now() + INTERVAL '20 hours', now() - INTERVAL '30 minutes',
    now() + INTERVAL '20 hours', NULL, NULL, now() - INTERVAL '4 hours'
  ),

  -- 4. LOW PRIORITY: Light Replacement (Open / Unassigned)
  (
    '55555555-0000-0000-0000-000000000004', 'TKT-2026-04103',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', NULL, NULL,
    'a1000000-0000-0000-0000-000000000001', NULL, NULL, NULL,
    '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006',
    'Low', 'Cosmetic', 'open', 'Flickering Lights in Reception', 'Two LED panels in the main reception area are flickering constantly.',
    NULL,
    '30000000-0000-0000-0000-000000000004', 'ok', 'ok',
    now() + INTERVAL '23 hours', now() + INTERVAL '71 hours', NULL,
    now() + INTERVAL '71 hours', NULL, NULL, now() - INTERVAL '1 hour'
  ),

  -- 5. COMPLETED: Power Trip in Tech Park (Closed)
  (
    '55555555-0000-0000-0000-000000000005', 'TKT-2026-04088',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000004', NULL, NULL, NULL,
    'a1000000-0000-0000-0000-000000000003', NULL, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006',
    'High', 'Total Failure', 'closed', 'Power loss to Level 3 IT Labs', 'Main breaker for Level 3 has tripped. Reset attempted but trips immediately.',
    '{"fault_code":"ELEC-SHORT","fault_description":"Dead short on phase B.","recommendations":["Megger test cables","Isolate loads"],"confidence_score":0.99}'::jsonb,
    '30000000-0000-0000-0000-000000000002', 'ok', 'ok',
    now() - INTERVAL '44 hours', now() - INTERVAL '40 hours', now() - INTERVAL '47 hours 50 minutes',
    now() - INTERVAL '40 hours', now() - INTERVAL '43 hours', now() - INTERVAL '42 hours', now() - INTERVAL '48 hours'
  )
ON CONFLICT (ticket_number) DO NOTHING;

-- =============================================================================
-- WORK ORDERS
-- Child execution tasks derived from the Tickets above
-- =============================================================================
INSERT INTO public.work_orders (
  id, work_order_number, ticket_id,
  org_id, site_id, building_id, floor_id, room_id, asset_id,
  vendor_id, technician_id, service_category_id, service_type_id,
  priority, status,
  scheduled_start_at, scheduled_end_at, estimated_duration_mins,
  travel_started_at, arrived_at, actual_start_at, actual_end_at, completed_at,
  resolution_summary, root_cause, created_at
) VALUES

  -- WO 1: (From TKT-1) CRAC Failure - Tech is ON SITE working (status: in_progress)
  (
    '66666666-0000-0000-0000-000000000001', 'WO-2026-05120', '55555555-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-000000000004', 'AST-DC-001',
    '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'Critical', 'in_progress',
    now() - INTERVAL '2 hours', now() + INTERVAL '2 hours', 240,
    now() - INTERVAL '2 hours', now() - INTERVAL '1 hour 15 minutes', now() - INTERVAL '1 hour 10 minutes', NULL, NULL,
    NULL, NULL, now() - INTERVAL '3 hours'
  ),

  -- WO 2: (From TKT-2) ICU Humidity - Tech is TRAVELING (status: en_route)
  (
    '66666666-0000-0000-0000-000000000002', 'WO-2026-05121', '55555555-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000006', 'AST-MED-001',
    '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'High', 'en_route',
    now() + INTERVAL '30 minutes', now() + INTERVAL '2 hours 30 minutes', 120,
    now() - INTERVAL '15 minutes', NULL, NULL, NULL, NULL,
    NULL, NULL, now() - INTERVAL '1 hour 45 minutes'
  ),

  -- WO 3: (From TKT-3) Elevator Noise - Tech ASSIGNED, not started yet (status: assigned)
  (
    '66666666-0000-0000-0000-000000000003', 'WO-2026-05122', '55555555-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000010', NULL, NULL, 'AST-RET-001',
    '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000019',
    'Medium', 'assigned',
    now() + INTERVAL '2 hours', now() + INTERVAL '6 hours', 240,
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, now() - INTERVAL '3 hours'
  ),

  -- WO 4: (From TKT-5) Power Trip - COMPLETED
  (
    '66666666-0000-0000-0000-000000000004', 'WO-2026-05110', '55555555-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000004', NULL, NULL, NULL,
    '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006',
    'High', 'closed',
    now() - INTERVAL '47 hours', now() - INTERVAL '43 hours', 240,
    now() - INTERVAL '47 hours', now() - INTERVAL '46 hours 15 minutes', now() - INTERVAL '46 hours', now() - INTERVAL '43 hours', now() - INTERVAL '43 hours',
    'Replaced faulty 100A RCBO on distribution board B. Tested insulation resistance on circuit 3. All normal.', 'Component failure - internal short circuit in RCBO casing.', now() - INTERVAL '48 hours'
  )
ON CONFLICT (work_order_number) DO NOTHING;

COMMIT;
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
