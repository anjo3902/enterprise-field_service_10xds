import { supabase } from "./supabase";

export async function getAllAssets() {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("asset_name", { ascending: true });

  if (error) {
    console.error("Error fetching assets:", error);
    throw error;
  }

  return data;
}

export async function getRecentActivities(limit?: number) {
  let query = supabase
    .from("asset_history")
    .select("*")
    .order("activity_date", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recent activities:", error);
    throw error;
  }

  return data;
}