import { supabase } from "../lib/supabase";

export const notificationService = {
  getNotifications: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
    return data;
  }
};
