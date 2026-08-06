import { supabase } from "../lib/supabase";

export const dispatchService = {
  getDispatchQueue: async (vendorId?: string) => {
    let query = supabase.from("dispatch_queues").select("*");
    if (vendorId) {
      query = query.eq("vendor_id", vendorId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch dispatch queue: ${error.message}`);
    return data;
  }
};
