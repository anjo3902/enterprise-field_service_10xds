import { supabase } from "../lib/supabase";

export const slaService = {
  getSLA: async (id: string) => {
    const { data, error } = await supabase
      .from("sla_policies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch SLA policy: ${error.message}`);
    }

    return data;
  },

  getAllSLAs: async () => {
    const { data, error } = await supabase
      .from("sla_policies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch SLA policies: ${error.message}`);
    return data;
  }
};
