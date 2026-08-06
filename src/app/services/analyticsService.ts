import { supabase } from "../lib/supabase";

export const analyticsService = {
  getPlatformAnalytics: async () => {
    const { data, error } = await supabase
      .from("platform_analytics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Failed to fetch platform analytics:", error.message);
    }
    return data;
  }
};
