import { supabase } from "../lib/supabase";
import { Vendor } from "../types";

export const vendorService = {
  getVendor: async (id: string): Promise<Vendor | null> => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch vendor: ${error.message}`);
    }

    return data as Vendor;
  },

  getAllVendors: async (): Promise<Vendor[]> => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch vendors: ${error.message}`);
    return data as Vendor[];
  }
};
