-- =============================================================================
-- Migration: 20260716106_inventory_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for Inventory & Spare Parts:
--            warehouses, inventory_items, warehouse_stock, stock_movements,
--            purchase_requests, purchase_request_items, parts_reservations,
--            parts_consumption, technician_inventory
-- =============================================================================

-- =============================================================================
-- WAREHOUSES & ITEMS & STOCK
-- =============================================================================
DROP POLICY IF EXISTS "warehouses_select" ON public.warehouses;
CREATE POLICY "warehouses_select" ON public.warehouses FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "warehouses_write" ON public.warehouses;
CREATE POLICY "warehouses_write" ON public.warehouses FOR ALL USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "inv_items_select" ON public.inventory_items;
CREATE POLICY "inv_items_select" ON public.inventory_items FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "inv_items_write" ON public.inventory_items;
CREATE POLICY "inv_items_write" ON public.inventory_items FOR ALL USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "stock_select" ON public.warehouse_stock;
CREATE POLICY "stock_select" ON public.warehouse_stock FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_stock.warehouse_id AND (w.org_id = public.fn_jwt_org_id() OR w.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "stock_write" ON public.warehouse_stock;
CREATE POLICY "stock_write" ON public.warehouse_stock FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_stock.warehouse_id AND ((w.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin') OR (w.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))))
);

-- =============================================================================
-- MOVEMENTS & PROCUREMENT
-- =============================================================================
DROP POLICY IF EXISTS "movements_select" ON public.stock_movements;
CREATE POLICY "movements_select" ON public.stock_movements FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = stock_movements.source_warehouse_id AND (w.org_id = public.fn_jwt_org_id() OR w.vendor_id = public.fn_jwt_vendor_id()))
  OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = stock_movements.destination_warehouse_id AND (w.org_id = public.fn_jwt_org_id() OR w.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "movements_insert" ON public.stock_movements;
CREATE POLICY "movements_insert" ON public.stock_movements FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = stock_movements.source_warehouse_id AND (w.org_id = public.fn_jwt_org_id() OR w.vendor_id = public.fn_jwt_vendor_id()))
  OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = stock_movements.destination_warehouse_id AND (w.org_id = public.fn_jwt_org_id() OR w.vendor_id = public.fn_jwt_vendor_id()))
);

DROP POLICY IF EXISTS "pr_select" ON public.purchase_requests;
CREATE POLICY "pr_select" ON public.purchase_requests FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "pr_write" ON public.purchase_requests;
CREATE POLICY "pr_write" ON public.purchase_requests FOR ALL USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
);

DROP POLICY IF EXISTS "pri_select" ON public.purchase_request_items;
CREATE POLICY "pri_select" ON public.purchase_request_items FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.id = purchase_request_items.purchase_request_id AND (pr.org_id = public.fn_jwt_org_id() OR pr.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "pri_write" ON public.purchase_request_items;
CREATE POLICY "pri_write" ON public.purchase_request_items FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.id = purchase_request_items.purchase_request_id AND ((pr.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin') OR (pr.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))))
);

-- =============================================================================
-- RESERVATIONS & CONSUMPTION & VAN STOCK
-- =============================================================================
DROP POLICY IF EXISTS "res_select" ON public.parts_reservations;
CREATE POLICY "res_select" ON public.parts_reservations FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = parts_reservations.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "res_write" ON public.parts_reservations;
CREATE POLICY "res_write" ON public.parts_reservations FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = parts_reservations.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);

DROP POLICY IF EXISTS "con_select" ON public.parts_consumption;
CREATE POLICY "con_select" ON public.parts_consumption FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = parts_consumption.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "con_write" ON public.parts_consumption;
CREATE POLICY "con_write" ON public.parts_consumption FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = parts_consumption.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);

DROP POLICY IF EXISTS "tech_inv_select" ON public.technician_inventory;
CREATE POLICY "tech_inv_select" ON public.technician_inventory FOR SELECT USING (
  public.fn_is_platform_admin()
  OR technician_id = public.fn_jwt_tech_id()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_inventory.technician_id AND t.vendor_id = public.fn_jwt_vendor_id())
);
DROP POLICY IF EXISTS "tech_inv_write" ON public.technician_inventory;
CREATE POLICY "tech_inv_write" ON public.technician_inventory FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_inventory.technician_id AND t.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
);
