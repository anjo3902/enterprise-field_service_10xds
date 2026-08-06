import { supabase } from "../lib/supabase";
import { Organization } from "../types";

export const organizationService = {
  getOrganization: async (id: string): Promise<Organization | null> => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }

    return data as Organization;
  },

  getAllOrganizations: async (): Promise<Organization[]> => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);
    return data as Organization[];
  }
};
