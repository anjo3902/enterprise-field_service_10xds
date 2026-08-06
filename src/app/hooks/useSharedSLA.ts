import { useMemo } from "react";
import { useVendor } from "../contexts/VendorContext";
import { adaptVendorTicketToSLAItem, SLAItem } from "../utils/slaAdapter";

export interface SharedSLAKPIs {
  totalTickets: number;
  nearBreach: number;
  breached: number;
  onTrack: number;
  escalated: number;
  compliance: number;
}

export type SLAFilterType = "All" | "Near Breach" | "Breached" | "On Track" | "Escalated";

export function useSharedSLA() {
  const vendor = useVendor();

  // 1. Unified Dataset (Single source of truth)
  const allItems = useMemo<SLAItem[]>(() => 
    vendor.tickets
      .filter(t => t.status !== "Closed" && t.status !== "Rejected" && t.status !== "Completed")
      .map(adaptVendorTicketToSLAItem),
    [vendor.tickets]
  );

  // 2. Shared KPI Engine (Calculated ONCE)
  const kpis = useMemo<SharedSLAKPIs>(() => {
    let nearBreach = 0;
    let breached = 0;
    let onTrack = 0;
    let escalated = 0;

    allItems.forEach(item => {
      if (item.status === "Near Breach" || item.status === "Immediate Attention Required") nearBreach++;
      else if (item.status === "Breached") breached++;
      else if (item.status === "On Track") onTrack++;
      
      if (item.status === "Needs Supervisor Review" || item.status === "Escalated") escalated++;
    });

    const totalTickets = vendor.tickets.filter(t => t.status !== "Rejected").length;
    // We use the vendor context's exact compliance calculation to guarantee synchronization
    const withinSLA = Math.max(0, totalTickets - vendor.kpis.slaBreached - vendor.kpis.slaAtRisk);
    const compliance = totalTickets > 0 ? Math.round((withinSLA / totalTickets) * 1000) / 10 : 100;

    return {
      totalTickets,
      nearBreach,
      breached,
      onTrack,
      escalated,
      compliance
    };
  }, [allItems, vendor.tickets, vendor.kpis]);

  // 3. Shared Filter Engine
  const filterSLAItems = (query: string, filterType: SLAFilterType) => {
    return allItems.filter(s => {
      const qTerm = query.trim().toLowerCase();
      const qm = !qTerm || 
                 s.id.toLowerCase().includes(qTerm) || 
                 s.issue.toLowerCase().includes(qTerm) || 
                 s.customer.toLowerCase().includes(qTerm) || 
                 s.assignee.toLowerCase().includes(qTerm);
                 
      const fm = filterType === "All" || 
                 (filterType === "Near Breach" && (s.status === "Near Breach" || s.status === "Immediate Attention Required")) || 
                 (filterType === "Breached" && s.status === "Breached") || 
                 (filterType === "On Track" && s.status === "On Track") || 
                 (filterType === "Escalated" && (s.status === "Needs Supervisor Review" || s.status === "Escalated"));
                 
      return qm && fm;
    });
  };

  // 4. Top Alerts for Dashboard
  const topAlerts = useMemo(() => {
    return allItems
      .filter(t => t.urgency === "breached" || t.urgency === "critical" || t.urgency === "warning")
      // Sort by breached first, then critical, etc.
      .sort((a, b) => {
        const order = { "breached": 0, "critical": 1, "warning": 2, "grace": 3, "ok": 4, "paused": 5, "resolved": 6, "escalated": 7 };
        return order[a.urgency] - order[b.urgency];
      })
      .slice(0, 4);
  }, [allItems]);

  return {
    allItems,
    kpis,
    topAlerts,
    filterSLAItems
  };
}
