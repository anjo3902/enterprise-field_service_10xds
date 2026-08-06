import { supabase } from "../lib/supabase";
import { Ticket } from "../types";

export interface TicketFilter {
  status?: string[];
  priority?: string[];
  org_id?: string;
  vendor_id?: string;
  assigned_to?: string;
  search?: string;
}

export const ticketService = {
  getTicket: async (id: string): Promise<Ticket | null> => {
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        *,
        reported_by (id, first_name, last_name, email),
        assigned_to (id, first_name, last_name),
        vendor_id (id, name),
        asset_id (id, asset_name, asset_tag)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }

    return data as any;
  },

  getAllTickets: async (filters?: TicketFilter, page = 1, limit = 50): Promise<{ data: Ticket[], count: number }> => {
    let query = supabase
      .from("tickets")
      .select(`
        *,
        reported_by (id, first_name, last_name, email),
        assigned_to (id, first_name, last_name),
        vendor_id (id, name),
        asset_id (id, asset_name, asset_tag)
      `, { count: "exact" });

    // Apply filters
    if (filters?.status?.length) {
      query = query.in("status", filters.status);
    }
    if (filters?.priority?.length) {
      query = query.in("priority", filters.priority);
    }
    if (filters?.org_id) {
      query = query.eq("org_id", filters.org_id);
    }
    if (filters?.vendor_id) {
      query = query.eq("vendor_id", filters.vendor_id);
    }
    if (filters?.assigned_to) {
      query = query.eq("assigned_to", filters.assigned_to);
    }
    if (filters?.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    return { data: data as any, count: count || 0 };
  },

  createTicket: async (payload: Partial<Ticket>): Promise<Ticket> => {
    const { data, error } = await supabase
      .from("tickets")
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(`Failed to create ticket: ${error.message}`);
    return data as Ticket;
  },

  updateTicketStatus: async (id: string, status: string): Promise<void> => {
    const { error } = await supabase
      .from("tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(`Failed to update ticket status: ${error.message}`);
  },
  
  deleteTicket: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id);
      
    if (error) throw new Error(`Failed to delete ticket: ${error.message}`);
  }
};
