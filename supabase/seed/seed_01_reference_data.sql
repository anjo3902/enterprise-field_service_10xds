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
