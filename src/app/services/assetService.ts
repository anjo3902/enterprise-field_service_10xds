import { supabase } from "../lib/supabase";
import { Asset } from "../types";

export interface AssetFilter {
  status?: string[];
  org_id?: string;
  vendor_id?: string;
  search?: string;
}

export const assetService = {
  getAsset: async (id: string): Promise<Asset | null> => {
    const { data, error } = await supabase
      .from("assets")
      .select("*, org_id (id, name), vendor_id (id, name)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch asset: ${error.message}`);
    }

    return data as any;
  },

  getAllAssets: async (filters?: AssetFilter, page = 1, limit = 50): Promise<{ data: Asset[], count: number }> => {
    let query = supabase
      .from("assets")
      .select("*, org_id (id, name), vendor_id (id, name)", { count: "exact" });

    if (filters?.status?.length) {
      query = query.in("status", filters.status);
    }
    if (filters?.org_id) {
      query = query.eq("org_id", filters.org_id);
    }
    if (filters?.vendor_id) {
      query = query.eq("vendor_id", filters.vendor_id);
    }
    if (filters?.search) {
      query = query.ilike("asset_name", `%${filters.search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) throw new Error(`Failed to fetch assets: ${error.message}`);

    return { data: data as any, count: count || 0 };
  },

  createAsset: async (payload: Partial<Asset>): Promise<Asset> => {
    const { data, error } = await supabase
      .from("assets")
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(`Failed to create asset: ${error.message}`);
    return data as Asset;
  },

  updateAsset: async (id: string, updates: Partial<Asset>): Promise<void> => {
    const { error } = await supabase
      .from("assets")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(`Failed to update asset: ${error.message}`);
  },

  deleteAsset: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Failed to delete asset: ${error.message}`);
  }
};
