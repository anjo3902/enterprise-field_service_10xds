import { supabase } from "../lib/supabase";

export const inventoryService = {
  getInventoryItems: async (vendorId?: string) => {
    let query = supabase.from("inventory_items").select("*");
    // Depending on schema, you might need to join or filter
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch inventory: ${error.message}`);
    return data;
  }
};
