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
