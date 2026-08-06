import { supabase } from "./supabase";


export async function getAllMachineHealth() {
  const { data, error } = await supabase
    .from("healthscores")
    .select(`
      *,
      assets (
        asset_id,
        asset_name,
        category,
        vendor,
        location,
        installation_date,
        warranty_expiry,
        health_score,
        status
      )
    `)
    .order("asset_id", { ascending: true });

  if (error) {
    console.error("Error fetching machine health:", error);
    throw error;
  }

  return data;
}