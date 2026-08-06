import { supabase } from "../lib/supabase";

export const timelineService = {
  getTimelineEvents: async (ticketId: string) => {
    // We get timeline events primarily from ticket_status_history, ticket_comments, and activity_timeline
    const { data, error } = await supabase
      .from("activity_timeline")
      .select("*")
      .eq("reference_id", ticketId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch timeline: ${error.message}`);
    return data;
  }
};
