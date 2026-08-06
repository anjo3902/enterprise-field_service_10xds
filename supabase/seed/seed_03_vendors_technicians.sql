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
