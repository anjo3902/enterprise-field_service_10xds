import { supabase } from "../lib/supabase";
import { WorkOrder } from "../types";

export const workOrderService = {
  getWorkOrder: async (id: string): Promise<WorkOrder | null> => {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch work order: ${error.message}`);
    }

    return data as WorkOrder;
  },

  getAllWorkOrders: async (): Promise<WorkOrder[]> => {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch work orders: ${error.message}`);
    return data as WorkOrder[];
  }
};
