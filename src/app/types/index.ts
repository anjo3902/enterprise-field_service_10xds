export type Role = "system_admin" | "org_admin" | "org_user" | "vendor_admin" | "vendor_technician" | "dispatcher";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: Role;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: "active" | "suspended" | "pending";
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "suspended" | "pending";
  created_at: string;
}

export interface Asset {
  id: string;
  asset_name: string;
  asset_tag: string;
  serial_number?: string;
  status: string;
  org_id: string;
  vendor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  org_id: string;
  asset_id?: string;
  reported_by?: string;
  assigned_to?: string;
  vendor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  ticket_id: string;
  org_id: string;
  vendor_id?: string;
  technician_id?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "on_hold";
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  created_at: string;
  updated_at: string;
}
