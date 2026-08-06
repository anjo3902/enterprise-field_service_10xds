import { supabase } from "../lib/supabase";

export const reportService = {
  getDashboardSnapshots: async () => {
    const { data, error } = await supabase
      .from("dashboard_snapshots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
    return data;
  }
};
