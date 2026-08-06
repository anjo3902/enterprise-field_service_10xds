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
