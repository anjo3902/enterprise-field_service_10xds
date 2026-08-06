import { supabase } from "../lib/supabase";
import { Profile } from "../types";

export interface TechnicianFilter {
  org_id?: string;
  vendor_id?: string;
  is_active?: boolean;
}

export const technicianService = {
  getTechnician: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "vendor_technician")
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch technician: ${error.message}`);
    }

    return data as Profile;
  },

  getAllTechnicians: async (filters?: TechnicianFilter): Promise<Profile[]> => {
    let query = supabase
      .from("profiles")
      .select("*")
      .eq("role", "vendor_technician");

    if (filters?.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active);
    }
    // To support vendor_id/org_id, we would typically join with vendor_members or organization_members.
    // Assuming simple querying for now based on profile associations if added.

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch technicians: ${error.message}`);
    return data as Profile[];
  }
};
