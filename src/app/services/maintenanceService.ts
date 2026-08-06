import { supabase } from "../lib/supabase";

export const maintenanceService = {
  getPMPlans: async () => {
    const { data, error } = await supabase.from("pm_plans").select("*");
    if (error) throw new Error(`Failed to fetch PM plans: ${error.message}`);
    return data;
  }
};
